import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronLeft, Image as ImageIcon, ImagePlus, Search, X } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { faceService, teacherService } from '@/lib/services';
import type { PhotoFile } from '@/lib/upload';

const MAX_PHOTOS = 3;

type Photo = PhotoFile & { width?: number; height?: number };
type Reason = 'match' | 'low_match' | 'no_face' | 'not_found';
type StudentRow = {
  id: string;
  student_id: number;
  name: string;
  status: 'present' | 'unsure' | 'absent';
  reason: Reason;
  score: number | null;
  face: { photo: number; box: number[] } | null;
  crop: string | null;
};
type Result = {
  photos: { index: number; width: number; height: number }[];
  students: StudentRow[];
  unknown_faces: { photo: number; box: number[]; crop: string }[];
  summary: { faces_found: number };
};
type Tab = 'present' | 'absent' | 'unsure';

const NOTE: Record<Reason, string> = {
  match: '',
  low_match: 'please check',
  no_face: 'no face registered',
  not_found: 'not found in photo',
};

export default function FaceClassScreen() {
  const { courseInfoId } = useLocalSearchParams<{ courseInfoId?: string }>();
  const [courseLabel, setCourseLabel] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [phase, setPhase] = useState<'pick' | 'checking' | 'review' | 'saving'>('pick');
  const [result, setResult] = useState<Result | null>(null);
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<Tab>('present');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    if (!courseInfoId) return;
    teacherService
      .getCourseDetails(courseInfoId)
      .then((res) => res.success && setCourseLabel(`${res.courseInfo.course.code} · ${res.courseInfo.course.title}`))
      .catch((err) => setError(err.message || 'Could not load the course.'));
  }, [courseInfoId]);

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/dashboard/teacher');
  };

  const addPhotos = async (fromCamera: boolean) => {
    setError('');
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return;
    if (fromCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('Camera access is needed to take a class photo.');
        return;
      }
    }
    const picked = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          selectionLimit: room,
          quality: 0.9,
        });
    if (picked.canceled) return;
    const added = picked.assets.slice(0, room).map((asset, i) => ({
      uri: asset.uri,
      name: asset.fileName || `class-photo-${photos.length + i + 1}.jpg`,
      type: asset.mimeType || 'image/jpeg',
      width: asset.width,
      height: asset.height,
    }));
    setPhotos((current) => [...current, ...added].slice(0, MAX_PHOTOS));
  };

  const findStudents = async () => {
    if (!courseInfoId || photos.length === 0) return;
    setError('');
    setPhase('checking');
    try {
      const res: Result = await faceService.recognize(courseInfoId, photos);
      setResult(res);
      setPresent(
        Object.fromEntries(res.students.map((s) => [s.id, s.status === 'present' || s.reason === 'low_match']))
      );
      setTab('present');
      setPhase('review');
    } catch (err: any) {
      setError(err.message || 'Could not check the photos.');
      setPhase('pick');
    }
  };

  const save = async () => {
    if (!courseInfoId || !result) return;
    setError('');
    setPhase('saving');
    try {
      await faceService.confirm(
        courseInfoId,
        result.students.filter((s) => present[s.id]).map((s) => s.id)
      );
      leave();
    } catch (err: any) {
      setError(err.message || 'Could not save attendance.');
      setPhase('review');
    }
  };

  const categoryOf = (s: StudentRow): Tab => (s.status === 'unsure' ? 'unsure' : present[s.id] ? 'present' : 'absent');

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, unsure: 0 };
    result?.students.forEach((s) => c[categoryOf(s)]++);
    return c;
  }, [result, present]);

  const presentCount = result ? result.students.filter((s) => present[s.id]).length : 0;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (result?.students || []).filter(
      (s) =>
        categoryOf(s) === tab &&
        (!q || s.name.toLowerCase().includes(q) || String(s.student_id).includes(q))
    );
  }, [result, present, tab, query]);

  return (
    <View className="flex-1 bg-zinc-50">
      {/* Header */}
      <View className="flex-row items-center gap-3 border-b border-border bg-white px-4 py-3">
        <Pressable
          onPress={leave}
          disabled={phase === 'checking' || phase === 'saving'}
          accessibilityLabel="Back"
          className="h-11 w-11 items-center justify-center rounded-full border border-border bg-background active:opacity-70">
          <ChevronLeft size={20} className="text-foreground" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-base font-bold text-foreground">Face attendance</Text>
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {courseLabel || 'Course'} · {new Date().toLocaleDateString()}
          </Text>
        </View>
        {phase === 'review' || phase === 'saving' ? (
          <Button variant="outline" size="sm" className="rounded-xl" onPress={() => setViewerOpen(true)}>
            <ImageIcon size={16} className="text-foreground" />
            <Text className="text-xs font-semibold">Photo</Text>
          </Button>
        ) : null}
      </View>

      <ScrollView className="flex-1" contentContainerClassName="items-center p-4 pb-28">
        <View className="w-full max-w-2xl gap-3">
          {error ? (
            <View className="rounded-xl border border-destructive/20 bg-destructive/10 p-3">
              <Text className="text-center text-sm font-medium text-destructive">{error}</Text>
            </View>
          ) : null}

          {phase === 'pick' || phase === 'checking' ? (
            <>
              <View className="gap-1 rounded-2xl border border-border bg-card p-4">
                <Text className="text-sm font-bold text-foreground">Add class photos</Text>
                <Text className="text-xs leading-5 text-muted-foreground">
                  Take 1 photo, or up to 3 for a big room (for example front rows and back rows). Use good light and
                  ask students to look at the camera. Photos are not stored.
                </Text>
              </View>

              <View className="flex-row flex-wrap gap-3">
                {photos.map((photo, i) => (
                  <View key={photo.uri} className="h-28 w-36 overflow-hidden rounded-2xl border border-border bg-muted">
                    <Image source={{ uri: photo.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    {phase === 'pick' && (
                      <Pressable
                        accessibilityLabel={`Remove photo ${i + 1}`}
                        onPress={() => setPhotos((current) => current.filter((_, j) => j !== i))}
                        className="absolute right-1.5 top-1.5 h-7 w-7 items-center justify-center rounded-full bg-black/60">
                        <X size={14} className="text-white" />
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>

              {phase === 'pick' && photos.length < MAX_PHOTOS && (
                <View className="flex-row gap-3">
                  <Button variant="outline" className="flex-1 rounded-xl" onPress={() => addPhotos(true)}>
                    <Camera size={16} className="text-foreground" />
                    <Text className="font-semibold">Take photo</Text>
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-xl" onPress={() => addPhotos(false)}>
                    <ImagePlus size={16} className="text-foreground" />
                    <Text className="font-semibold">Upload photo</Text>
                  </Button>
                </View>
              )}

              {phase === 'checking' && (
                <View className="items-center gap-2 py-6">
                  <ActivityIndicator />
                  <Text className="text-sm text-muted-foreground">Finding students… this can take a few seconds.</Text>
                </View>
              )}
            </>
          ) : result ? (
            <>
              {/* Tabs */}
              <View className="flex-row gap-1 rounded-xl bg-zinc-100 p-1">
                {(['present', 'absent', 'unsure'] as Tab[]).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setTab(t)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: tab === t }}
                    className={`h-10 flex-1 items-center justify-center rounded-lg ${tab === t ? 'bg-white shadow-sm' : ''}`}>
                    <Text className={`text-sm ${tab === t ? 'font-bold text-foreground' : 'font-semibold text-muted-foreground'}`}>
                      {t === 'present' ? 'Present' : t === 'absent' ? 'Absent' : 'Unsure'} ({counts[t]})
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Search */}
              <View className="h-11 flex-row items-center gap-2 rounded-xl border border-border bg-white px-3">
                <Search size={16} className="text-muted-foreground" />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search name or student ID"
                  accessibilityLabel="Search students"
                  className="flex-1 text-sm text-foreground"
                  placeholderTextColor="#a3a3a3"
                />
              </View>

              {/* Students */}
              <View className="overflow-hidden rounded-2xl border border-border bg-white">
                {visible.length === 0 ? (
                  <Text className="p-6 text-center text-sm text-muted-foreground">No students here.</Text>
                ) : (
                  visible.map((s, i) => (
                    <View
                      key={s.id}
                      className={`flex-row items-center gap-3 px-4 py-3 ${i < visible.length - 1 ? 'border-b border-zinc-100' : ''}`}>
                      <View
                        className={`h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-zinc-200 ${s.reason === 'low_match' ? 'border-2 border-amber-500' : ''}`}>
                        {s.crop ? (
                          <Image source={{ uri: s.crop }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                          <Text className="text-sm font-bold text-zinc-500">{s.name.slice(0, 1).toUpperCase()}</Text>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>{s.name}</Text>
                        <Text className="text-xs text-muted-foreground">
                          {s.student_id}
                          {NOTE[s.reason] ? (
                            <Text
                              className={`text-xs ${s.reason === 'not_found' ? 'text-muted-foreground' : 'font-bold text-amber-700'}`}>
                              {' · '}{NOTE[s.reason]}
                            </Text>
                          ) : null}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityRole="switch"
                        accessibilityLabel={`${s.name} present`}
                        accessibilityState={{ checked: !!present[s.id] }}
                        onPress={() => setPresent((p) => ({ ...p, [s.id]: !p[s.id] }))}
                        disabled={phase === 'saving'}
                        className={`h-7 w-12 justify-center rounded-full px-[3px] ${present[s.id] ? 'items-end bg-primary' : 'items-start bg-zinc-300'}`}>
                        <View className="h-[22px] w-[22px] rounded-full bg-white" />
                      </Pressable>
                    </View>
                  ))
                )}
              </View>

              {tab === 'unsure' && result.unknown_faces.length > 0 && (
                <View className="gap-2 rounded-2xl border border-amber-200 bg-white p-4">
                  <Text className="text-sm font-bold text-foreground">
                    Faces we couldn't match ({result.unknown_faces.length})
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    If one of them is a student of this course, switch that student on.
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {result.unknown_faces.map((f, i) => (
                      <Image key={i} source={{ uri: f.crop }} style={{ width: 56, height: 56, borderRadius: 12 }} />
                    ))}
                  </View>
                </View>
              )}

              <Text className="text-center text-xs leading-5 text-muted-foreground">
                Turn a switch off to mark absent. Check the other tabs before saving.
              </Text>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* Bottom action */}
      <View className="border-t border-border bg-white px-4 pb-5 pt-3">
        <View className="w-full max-w-2xl self-center">
          {phase === 'review' || phase === 'saving' ? (
            <Button size="lg" className="rounded-xl" onPress={save} disabled={phase === 'saving'}>
              <Text className="font-semibold">
                {phase === 'saving' ? 'Saving…' : `Confirm and save (${presentCount} present)`}
              </Text>
            </Button>
          ) : (
            <Button
              size="lg"
              className="rounded-xl"
              onPress={findStudents}
              disabled={phase === 'checking' || photos.length === 0 || !courseInfoId}>
              <Text className="font-semibold">{phase === 'checking' ? 'Checking…' : 'Find students'}</Text>
            </Button>
          )}
        </View>
      </View>

      {result && (
        <PhotoViewer visible={viewerOpen} onClose={() => setViewerOpen(false)} photos={photos} result={result} />
      )}
    </View>
  );
}

/** The class photos with a box on every face: green = matched, amber = check / not matched. */
function PhotoViewer({
  visible, onClose, photos, result,
}: { visible: boolean; onClose: () => void; photos: Photo[]; result: Result }) {
  const [widths, setWidths] = useState<Record<number, number>>({});

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/80 p-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-base font-bold text-white">Class photos</Text>
          <Pressable
            onPress={onClose}
            accessibilityLabel="Close"
            className="h-11 w-11 items-center justify-center rounded-full bg-white/15">
            <X size={20} className="text-white" />
          </Pressable>
        </View>
        <ScrollView contentContainerClassName="items-center gap-4 pb-6">
          {result.photos.map((info) => {
            const shownWidth = widths[info.index] || 0;
            const scale = shownWidth / info.width;
            const boxes = [
              ...result.students
                .filter((s) => s.face?.photo === info.index)
                .map((s) => ({ box: s.face!.box, label: s.name.split(' ')[0], tone: s.reason === 'match' ? 'ok' : 'check' })),
              ...result.unknown_faces
                .filter((f) => f.photo === info.index)
                .map((f) => ({ box: f.box, label: '?', tone: 'check' })),
            ];
            return (
              <View
                key={info.index}
                className="w-full max-w-3xl"
                onLayout={(e) => {
                  const w = e.nativeEvent.layout.width;
                  setWidths((current) => (current[info.index] === w ? current : { ...current, [info.index]: w }));
                }}>
                <Image
                  source={{ uri: photos[info.index]?.uri }}
                  style={{ width: '100%', aspectRatio: info.width / info.height, borderRadius: 12 }}
                />
                {shownWidth > 0 &&
                  boxes.map((b, i) => (
                    <View
                      key={i}
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        left: b.box[0] * scale,
                        top: b.box[1] * scale,
                        width: (b.box[2] - b.box[0]) * scale,
                        height: (b.box[3] - b.box[1]) * scale,
                        borderWidth: 2,
                        borderRadius: 6,
                        borderColor: b.tone === 'ok' ? '#10b981' : '#f59e0b',
                      }}>
                      <View
                        style={{ position: 'absolute', top: -20, left: -2, backgroundColor: b.tone === 'ok' ? '#047857' : '#b45309' }}
                        className="rounded px-1.5">
                        <Text className="text-[11px] font-bold text-white" numberOfLines={1}>{b.label}</Text>
                      </View>
                    </View>
                  ))}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}
