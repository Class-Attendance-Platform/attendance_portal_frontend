import { Link, router, useLocalSearchParams, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, ImagePlus, Images, RefreshCw, RotateCcw, Save, ScanFace, SearchX } from 'lucide-react-native';
import * as React from 'react';
import { Image, Platform, View } from 'react-native';

import { Page } from '@/components/layout/Page';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useMessage } from '@/components/ui/message-bar';
import { Notice } from '@/components/ui/notice';
import { PageHeader } from '@/components/ui/page-header';
import { SearchField } from '@/components/ui/search-field';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { AttendanceToggle, ChoiceGroup } from '@/components/teacher/choice-group';
import { PhotoThumb, PhotoViewer, type ClassPhoto } from '@/components/teacher/face-photos';
import {
  correctedMarks,
  extraPhotosText,
  facesShown,
  noFacesText,
  photoProblem,
  photoProblemText,
  presentIds,
  skippedText,
  teacherMarkedIds,
  withCorrections,
  type Marks,
  type PhotoProblem,
} from '@/components/teacher/face-review';
import { courseHref, isFinished, param, rollCallHref } from '@/components/teacher/labels';
import { useLoad } from '@/components/teacher/use-load';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useLeaveGuard } from '@/hooks/useLeaveGuard';
import { isApiError } from '@/lib/api/client';
import { facesApi, type FaceReason, type RecognizeResult, type RecognizedStudent } from '@/lib/api/faces';
import { sessionsApi, type HistoryDay } from '@/lib/api/sessions';
import { teacherApi } from '@/lib/api/teacher';
import { todayISO } from '@/lib/dates';
import { formatDate } from '@/lib/format';
import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';

const MAX_PHOTOS = 3;

type Group = 'present' | 'absent' | 'unsure';

const NOTE: Record<FaceReason, string | null> = {
  match: null,
  low_match: 'Please check: weak match',
  no_face: 'No face registered',
  not_found: 'Not found in the photos',
};

/** Students without a registered face stay under Unsure; the others follow their switch. */
const groupOf = (student: RecognizedStudent, present: Marks): Group =>
  student.reason === 'no_face' ? 'unsure' : present[student.id] ? 'present' : 'absent';

const errorText = (caught: unknown, fallback: string) => (isApiError(caught) ? caught.message : fallback);

/** /teacher/courses/[courseInfoId]/face: attendance for today from 1–3 class photos. */
export default function TeacherFaceAttendance() {
  const params = useLocalSearchParams<{ courseInfoId: string }>();
  const courseInfoId = param(params.courseInfoId) ?? '';
  const { isDesktop, isMobile } = useBreakpoint();
  const message = useMessage();
  const confirm = useConfirm();
  const today = todayISO();

  const course = useLoad(() => teacherApi.course(courseInfoId).then((result) => result.course), [courseInfoId]);
  // Today's class so far (null = none yet): whether a class photo was already saved today, and
  // whom a teacher corrected or marked by hand today (a new review starts with those marks).
  const loadToday = async () => (await sessionsApi.history(courseInfoId, { date: today })).history[0] ?? null;
  const todayHistory = useLoad(loadToday, [courseInfoId, today]);
  const savedToday = !!todayHistory.data?.sessions.some((session) => session.mode === 'FACE');

  const [photos, setPhotos] = React.useState<ClassPhoto[]>([]);
  const [phase, setPhase] = React.useState<'pick' | 'checking' | 'review' | 'saving'>('pick');
  const [result, setResult] = React.useState<RecognizeResult | null>(null);
  const [present, setPresent] = React.useState<Marks>({});
  // Today's corrections and hand marks the review started with, shown as "Corrected earlier".
  const [corrected, setCorrected] = React.useState<Marks>({});
  // Today's history could not be loaded for the review, so its corrections are not in the list.
  const [earlierFailed, setEarlierFailed] = React.useState(false);
  const [checkingEarlier, setCheckingEarlier] = React.useState(false);
  const [group, setGroup] = React.useState<Group>('present');
  const [query, setQuery] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = React.useState(false);

  // Photos or a reviewed list that are not saved yet. Not while saving: the page then moves on
  // to History by itself.
  const reviewing = phase === 'review' && !!result;
  useLeaveGuard(
    photos.length > 0 && phase !== 'saving',
    reviewing
      ? {
          title: 'Leave without saving?',
          message: 'The class photo result and your changes are not saved yet.',
          confirmLabel: 'Leave',
          cancelLabel: 'Keep reviewing',
        }
      : {
          title: 'Leave without saving?',
          message: 'Your class photos will be cleared. Nothing has been saved.',
          confirmLabel: 'Leave',
          cancelLabel: 'Stay',
        }
  );

  /** Today's history now (null = no class yet today), or undefined when it could not be loaded. */
  async function fetchToday(): Promise<HistoryDay | null | undefined> {
    try {
      const day = await loadToday();
      todayHistory.setData(day);
      return day;
    } catch {
      return undefined;
    }
  }

  async function addPhotos(fromCamera: boolean) {
    setError(null);
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return;
    try {
      if (fromCamera && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError('Camera access is needed to take a class photo. Allow it in the phone settings, or upload a photo.');
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
      // Files that can't be used are left out now, not after a long upload.
      const problems: PhotoProblem[] = [];
      const usable = picked.assets.filter((asset) => {
        const problem = photoProblem(asset, Platform.OS === 'web');
        if (problem) problems.push(problem);
        return !problem;
      });
      const added = usable.slice(0, room).map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName || `class-photo-${photos.length + index + 1}.jpg`,
        type: asset.mimeType || 'image/jpeg',
        width: asset.width,
        height: asset.height,
      }));
      setPhotos((current) => [...current, ...added].slice(0, MAX_PHOTOS));
      setError(photoProblemText(problems, picked.assets.length));
      if (usable.length > room) message.info(extraPhotosText(room, MAX_PHOTOS));
    } catch {
      // The browser's picker refuses files that are not pictures; phones show photos only.
      setError(Platform.OS === 'web' ? photoProblemText(['not_photo'], 1) : 'Could not open the photos. Please try again.');
    }
  }

  async function findStudents() {
    if (!photos.length) return;
    setError(null);
    setPhase('checking');
    try {
      const [found, day] = await Promise.all([facesApi.recognize(courseInfoId, photos), fetchToday()]);
      if (found.summary.faces_found === 0) {
        // Nothing to review. The photos stay, so the teacher can replace them.
        setError(noFacesText(photos.length));
        setPhase('pick');
        return;
      }
      // Students a teacher corrected or marked by hand today start with that mark.
      const earlier = day ? correctedMarks(day.logs) : {};
      setResult(found);
      setCorrected(earlier);
      setEarlierFailed(day === undefined);
      setPresent(withCorrections(found.students, earlier));
      setGroup('present');
      setQuery('');
      setPhase('review');
    } catch (caught) {
      // 413: the upload is over the server's request limit (the photos together).
      const tooLarge = isApiError(caught) && caught.status === 413;
      setError(
        tooLarge
          ? photos.length === 1
            ? 'The photo is too large to send. Use a smaller photo.'
            : 'The photos are too large to send together. Use fewer or smaller photos.'
          : errorText(caught, 'Could not check the photos. Please try again.')
      );
      setPhase('pick');
    }
  }

  /** Loads today's corrections again after a failure; students the teacher switched keep the switch. */
  async function checkEarlierAgain() {
    if (!result) return;
    setCheckingEarlier(true);
    const day = await fetchToday();
    setCheckingEarlier(false);
    if (day === undefined) {
      message.error("Could not check today's earlier marks. Please try again.");
      return;
    }
    const earlier = day ? correctedMarks(day.logs) : {};
    setCorrected(earlier);
    setPresent((current) => withCorrections(result.students, earlier, current));
    setEarlierFailed(false);
  }

  async function startOver() {
    const ok = await confirm({
      title: 'Start over?',
      message: 'The photos and your changes to the list are cleared. Nothing has been saved yet.',
      confirmLabel: 'Start over',
      cancelLabel: 'Keep reviewing',
      destructive: true,
    });
    if (!ok) return;
    setResult(null);
    setPhotos([]);
    setPresent({});
    setCorrected({});
    setEarlierFailed(false);
    setError(null);
    setPhase('pick');
  }

  async function save() {
    if (!result) return;
    setError(null);
    setPhase('saving');
    try {
      const saved = await facesApi.confirm({
        course_info_id: courseInfoId,
        present_student_ids: presentIds(result.students, present),
        // Present only by the teacher's hand (not found in the photos): saved as "Marked by teacher".
        teacher_marked_ids: teacherMarkedIds(result.students, present),
      });
      const skipped = saved.skipped ?? [];
      const summary = `Saved for ${formatDate(saved.date)}: ${saved.total_present} of ${result.students.length - skipped.length} present.`;
      const left = skippedText(skipped);
      if (left) message.success(left, summary);
      else message.success(summary);
      router.replace(courseHref(courseInfoId, 'history', { date: saved.date }));
    } catch (caught) {
      setError(errorText(caught, 'Could not save the attendance. Please try again.'));
      setPhase('review');
    }
  }

  const info = course.data;
  const breadcrumb = [
    { label: 'My courses', href: '/teacher' as Href },
    { label: info?.code ?? 'Course', href: courseHref(courseInfoId) },
    { label: 'Class photo' },
  ];
  const header = (
    <PageHeader
      title="Class photo attendance"
      breadcrumb={breadcrumb}
      meta={info ? `${info.code} · ${info.title} · Today, ${formatDate(today)}` : course.error ? undefined : `Today, ${formatDate(today)}`}
      actions={
        result && (phase === 'review' || phase === 'saving') ? (
          <Button label="View photos" icon={Images} onPress={() => setViewerOpen(true)} />
        ) : undefined
      }
    />
  );

  if (course.loading || course.error || !info) {
    // Another teacher's course, or one that is gone: trying again can't help.
    const denied = course.error?.status === 403;
    const missing = course.error?.status === 404;
    return (
      <Page>
        {header}
        <Card>
          {course.loading ? (
            <LoadingState label="Loading the course…" />
          ) : (
            <>
              <ErrorState
                title={denied ? 'Not your course' : missing ? 'Course not found' : undefined}
                message={
                  denied
                    ? 'This course is taught by another teacher.'
                    : missing
                      ? 'It may have been removed.'
                      : course.error?.message ?? 'Not found.'
                }
                onRetry={denied || missing ? undefined : () => course.reload()}
              />
              {denied || missing ? (
                <View className="items-center pb-4">
                  <Link href="/teacher" dismissTo asChild>
                    <Button label="Back to My courses" icon={ArrowLeft} className="self-center" />
                  </Link>
                </View>
              ) : null}
            </>
          )}
        </Card>
      </Page>
    );
  }

  if (isFinished(info)) {
    return (
      <Page>
        {header}
        <Card className="gap-3">
          <Notice
            tone="info"
            title="This semester is finished"
            message="Class photo attendance is only for courses of the current semester. You can still correct days in History or use Roll call."
          />
          <View className="flex-row flex-wrap gap-3">
            <Link href={courseHref(courseInfoId, 'history')} asChild>
              <Button label="Open History" />
            </Link>
            <Link href={rollCallHref(courseInfoId)} asChild>
              <Button label="Roll call" />
            </Link>
          </View>
        </Card>
      </Page>
    );
  }

  const registered = info.face_registered_count;
  const students = result?.students ?? [];
  const counts = { present: 0, absent: 0, unsure: 0 };
  for (const student of students) counts[groupOf(student, present)] += 1;
  const presentCount = students.filter((student) => present[student.id]).length;
  const correctedCount = students.filter((student) => corrected[student.id] !== undefined).length;
  const search = query.trim().toLowerCase();
  const visible = students.filter(
    (student) =>
      groupOf(student, present) === group &&
      (!search || student.name.toLowerCase().includes(search) || String(student.student_id).includes(search))
  );
  const shown = result ? facesShown(result) : 0;
  const busy = phase === 'saving' || checkingEarlier;

  return (
    <Page>
      {header}

      {phase === 'pick' || phase === 'checking' ? (
        <>
          <Card title="Add class photos" className="gap-4">
            <Text tone="muted">
              Take 1 photo, or up to 3 for a big room (for example the front rows and the back rows). Use good light and
              ask students to look at the camera. Photos are only checked, never stored.
            </Text>
            <Text weight="semibold">
              {registered} of {info.student_count} students have registered their face.
            </Text>
            {registered === 0 ? (
              <Notice
                tone="warn"
                message="No student in this course has registered a face yet, so no one can be found in a photo. Students register under Face registration in the app. You can use a live session or roll call instead."
              />
            ) : registered < info.student_count ? (
              <Text variant="small" tone="muted">
                Students without a registered face are listed under Unsure: mark them yourself.
              </Text>
            ) : null}
            {savedToday ? (
              <Notice
                tone="info"
                message="You already saved a class photo today. Saving again changes only the students whose mark is different. Corrections and hand marks made today are kept unless you change them."
              />
            ) : todayHistory.error ? (
              <Notice
                tone="info"
                message="If you already saved a class photo today, saving again changes only the students whose mark is different."
              />
            ) : null}

            {photos.length ? (
              <View className="flex-row flex-wrap gap-3">
                {photos.map((photo, index) => (
                  <PhotoThumb
                    key={photo.uri}
                    photo={photo}
                    index={index}
                    onRemove={phase === 'pick' ? () => setPhotos((current) => current.filter((_, other) => other !== index)) : undefined}
                  />
                ))}
              </View>
            ) : null}

            {phase === 'pick' && photos.length < MAX_PHOTOS ? (
              <View className="flex-row flex-wrap gap-3">
                {Platform.OS !== 'web' || isMobile ? (
                  <Button label="Take photo" icon={Camera} onPress={() => addPhotos(true)} />
                ) : null}
                <Button label={photos.length ? 'Add another photo' : 'Upload photos'} icon={ImagePlus} onPress={() => addPhotos(false)} />
              </View>
            ) : null}
            <Text variant="small" tone="muted">
              {photos.length} of {MAX_PHOTOS} photos added.
            </Text>

            {error ? <Notice tone="error" message={error} live /> : null}

            {phase === 'checking' ? (
              <LoadingState label="Finding students… this can take a few seconds." />
            ) : (
              <Button
                label="Find students"
                variant="primary"
                icon={ScanFace}
                disabled={!photos.length}
                onPress={findStudents}
                className="mt-1"
              />
            )}
          </Card>
        </>
      ) : result ? (
        <>
          <Notice
            tone="info"
            title={`${shown} ${shown === 1 ? 'face' : 'faces'} found`}
            message="Check each list before saving. Switch a student to Present or Absent. Students under Unsure have no registered face: mark them yourself."
          />

          <View className="gap-3">
            <ChoiceGroup<Group>
              label="Show students"
              value={group}
              onChange={setGroup}
              fill={!isDesktop}
              choices={[
                { value: 'present', label: `Present (${counts.present})` },
                { value: 'absent', label: `Absent (${counts.absent})` },
                { value: 'unsure', label: `Unsure (${counts.unsure})` },
              ]}
            />
            <View style={{ maxWidth: 420 }}>
              <SearchField label="Search students" placeholder="Search by name or student ID" value={query} onChangeText={setQuery} />
            </View>
          </View>

          <Card padded={false}>
            {visible.length === 0 ? (
              <EmptyState icon={SearchX} title="No students here" message={search ? 'Try another name or student ID.' : 'Check the other lists.'} />
            ) : (
              visible.map((student, index) => {
                const note = [NOTE[student.reason], corrected[student.id] !== undefined ? 'Corrected earlier' : null]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <View
                    key={student.id}
                    className={cn(
                      'min-h-[64px] flex-row flex-wrap items-center gap-x-3 gap-y-2 py-2.5',
                      isDesktop ? 'px-5' : 'px-4',
                      index > 0 && 'border-t border-border'
                    )}
                  >
                    {student.crop ? (
                      <Image
                        source={{ uri: student.crop }}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 8,
                          borderWidth: student.reason === 'low_match' ? 2 : 1,
                          borderColor: student.reason === 'low_match' ? colors.warn : colors.border,
                        }}
                        accessibilityLabel={`Face found for ${student.name}`}
                      />
                    ) : (
                      <Avatar name={student.name} size={44} />
                    )}
                    <View className="min-w-[160px] flex-1 gap-0.5">
                      <Text weight="semibold">{student.name}</Text>
                      <Text variant="small" tone={student.reason === 'low_match' ? 'warnInk' : 'muted'}>
                        {student.student_id}
                        {note ? ` · ${note}` : ''}
                      </Text>
                    </View>
                    <AttendanceToggle
                      name={student.name}
                      value={present[student.id] ? 'PRESENT' : 'ABSENT'}
                      disabled={phase === 'saving'}
                      onChange={(status) => setPresent((current) => ({ ...current, [student.id]: status === 'PRESENT' }))}
                    />
                  </View>
                );
              })
            )}
          </Card>

          {group === 'unsure' && result.unknown_faces.length > 0 ? (
            <Card title="Faces we couldn't match" titleNote={`(${result.unknown_faces.length})`} className="gap-3">
              <Text tone="muted">If one of them is a student of this course, find that student and switch them to Present.</Text>
              <View className="flex-row flex-wrap gap-2">
                {result.unknown_faces.map((face, index) => (
                  <Image
                    key={index}
                    source={{ uri: face.crop }}
                    style={{ width: 56, height: 56, borderRadius: 8 }}
                    accessibilityLabel={`Unmatched face ${index + 1}`}
                  />
                ))}
              </View>
            </Card>
          ) : null}

          {earlierFailed ? (
            <Notice
              tone="warn"
              title="Could not check today's earlier marks"
              message="If you saved a class photo or corrected anyone today, those marks are not shown in this list. Check again, or check those students yourself before saving."
            >
              <Button
                label="Check again"
                icon={RefreshCw}
                compact
                loading={checkingEarlier}
                disabled={phase === 'saving'}
                onPress={checkEarlierAgain}
              />
            </Notice>
          ) : savedToday || correctedCount > 0 ? (
            <Notice
              tone="info"
              title={savedToday ? 'You already saved a class photo today' : undefined}
              message={[
                savedToday
                  ? 'Saving again changes only the students whose mark is different, and keeps the history of earlier changes.'
                  : null,
                correctedCount > 0
                  ? 'Students marked "Corrected earlier" start as they were corrected or marked by hand today; you can still change them.'
                  : null,
              ]
                .filter(Boolean)
                .join(' ')}
            />
          ) : null}

          {error ? <Notice tone="error" message={error} live /> : null}

          <View className="flex-row flex-wrap items-center justify-between gap-3">
            <Text tone="muted">
              {presentCount} of {students.length} will be saved as present for today.
            </Text>
            <View className="flex-row flex-wrap gap-3">
              <Button label="Start over" icon={RotateCcw} onPress={startOver} disabled={busy} />
              <Button
                label={`Save (${presentCount} present)`}
                variant="primary"
                icon={Save}
                loading={phase === 'saving'}
                disabled={checkingEarlier}
                onPress={save}
              />
            </View>
          </View>

          <PhotoViewer open={viewerOpen} onClose={() => setViewerOpen(false)} photos={photos} result={result} />
        </>
      ) : null}
    </Page>
  );
}
