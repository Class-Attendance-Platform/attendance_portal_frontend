import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { faceService } from '@/lib/services';

const POSE_LABEL: Record<string, string> = { STRAIGHT: 'Straight', LEFT: 'Left', RIGHT: 'Right' };

interface StudentFaceDialogProps {
  studentProfileId: string | null;
  studentName: string;
  onClose: () => void;
  onReset: () => void;
}

/** Admin: shows a student's registered face photos and lets the admin reset them. */
export function StudentFaceDialog({ studentProfileId, studentName, onClose, onReset }: StudentFaceDialogProps) {
  const [crops, setCrops] = useState<{ pose: string; image: string }[]>([]);
  const [registeredAt, setRegisteredAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!studentProfileId) return;
    setLoading(true);
    setError('');
    setConfirming(false);
    faceService
      .getStudentFaces(studentProfileId)
      .then((res) => {
        setCrops(res.crops || []);
        setRegisteredAt(res.registered_at);
      })
      .catch((err) => setError(err.message || 'Could not load face photos.'))
      .finally(() => setLoading(false));
  }, [studentProfileId]);

  const reset = async () => {
    if (!studentProfileId) return;
    try {
      await faceService.resetStudentFaces(studentProfileId);
      onReset();
    } catch (err: any) {
      setError(err.message || 'Could not reset the face data.');
    }
  };

  return (
    <Modal visible={!!studentProfileId} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/60 p-6" onPress={onClose}>
        <Pressable className="w-full max-w-sm gap-4 rounded-2xl border border-border bg-card p-6" onPress={() => {}}>
          <View className="gap-1">
            <Text className="text-lg font-bold text-foreground">Registered face</Text>
            <Text className="text-sm text-muted-foreground">
              {studentName}
              {registeredAt ? ` · ${new Date(registeredAt).toLocaleDateString()}` : ''}
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator />
          ) : (
            <View className="flex-row justify-between gap-2">
              {crops.map((c) => (
                <View key={c.pose} className="flex-1 items-center gap-1">
                  <Image source={{ uri: c.image }} style={{ width: '100%', aspectRatio: 1, borderRadius: 12 }} />
                  <Text className="text-xs text-muted-foreground">{POSE_LABEL[c.pose] || c.pose}</Text>
                </View>
              ))}
            </View>
          )}

          {error ? <Text className="text-center text-sm text-destructive">{error}</Text> : null}

          {confirming ? (
            <View className="gap-2">
              <Text className="text-center text-sm text-foreground">
                Reset this face? The student must register again before face attendance finds them.
              </Text>
              <View className="flex-row gap-2">
                <Button variant="outline" className="flex-1" onPress={() => setConfirming(false)}>
                  <Text className="font-semibold">Cancel</Text>
                </Button>
                <Button variant="destructive" className="flex-1" onPress={reset}>
                  <Text className="font-semibold text-white">Reset</Text>
                </Button>
              </View>
            </View>
          ) : (
            <View className="flex-row gap-2">
              <Button variant="outline" className="flex-1" onPress={onClose}>
                <Text className="font-semibold">Close</Text>
              </Button>
              <Button variant="destructive" className="flex-1" onPress={() => setConfirming(true)} disabled={loading}>
                <Text className="font-semibold text-white">Reset face</Text>
              </Button>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
