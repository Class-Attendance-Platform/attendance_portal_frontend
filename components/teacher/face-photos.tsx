import { X } from 'lucide-react-native';
import * as React from 'react';
import { Image, Pressable, View } from 'react-native';

import { Dialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { RecognizeResult } from '@/lib/api/faces';
import type { PhotoFile } from '@/lib/upload';
import { colors } from '@/lib/theme';
import { cn, FOCUS_RING } from '@/lib/utils';

export type ClassPhoto = PhotoFile & { width?: number; height?: number };

/** A chosen class photo with a remove button (44 px target). */
export function PhotoThumb({ photo, index, onRemove }: { photo: ClassPhoto; index: number; onRemove?: () => void }) {
  return (
    <View className="overflow-hidden rounded-control border border-border bg-bg" style={{ width: 156, height: 117 }}>
      <Image
        source={{ uri: photo.uri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
        accessibilityLabel={`Class photo ${index + 1}`}
      />
      {onRemove ? (
        <Pressable
          role="button"
          accessibilityLabel={`Remove photo ${index + 1}`}
          onPress={onRemove}
          className={cn('absolute right-0 top-0 h-11 w-11 items-center justify-center', FOCUS_RING)}
        >
          <View className="h-7 w-7 items-center justify-center rounded-pill border border-border bg-surface">
            <Icon as={X} size={16} color="text" />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

type Box = { box: [number, number, number, number]; label: string; matched: boolean };

/** The class photos with a box on every face: green = matched, orange = check or not matched. */
export function PhotoViewer({
  open,
  onClose,
  photos,
  result,
}: {
  open: boolean;
  onClose: () => void;
  photos: ClassPhoto[];
  result: RecognizeResult;
}) {
  const [widths, setWidths] = React.useState<Record<number, number>>({});
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Class photos"
      description="Green boxes are matched students. Orange boxes need a check or were not matched."
      size="lg"
    >
      <View className="gap-4 pb-5">
        {result.photos.map((info) => {
          const shown = widths[info.index] || 0;
          const scale = shown / info.width;
          const boxes: Box[] = [
            ...result.students
              .filter((student) => student.face?.photo === info.index)
              .map((student) => ({
                box: student.face!.box,
                label: student.name.split(' ')[0],
                matched: student.reason === 'match',
              })),
            ...result.unknown_faces
              .filter((face) => face.photo === info.index)
              .map((face) => ({ box: face.box, label: '?', matched: false })),
          ];
          return (
            <View
              key={info.index}
              onLayout={(event) => {
                const width = event.nativeEvent.layout.width;
                setWidths((current) => (current[info.index] === width ? current : { ...current, [info.index]: width }));
              }}
            >
              <Image
                source={{ uri: photos[info.index]?.uri }}
                style={{ width: '100%', aspectRatio: info.width / info.height, borderRadius: 8 }}
                accessibilityLabel={`Class photo ${info.index + 1} with ${boxes.length} faces marked`}
              />
              {shown > 0
                ? boxes.map((item, index) => {
                    const tint = item.matched ? colors.primary : colors.warn;
                    return (
                      <View
                        key={index}
                        pointerEvents="none"
                        style={{
                          position: 'absolute',
                          left: item.box[0] * scale,
                          top: item.box[1] * scale,
                          width: (item.box[2] - item.box[0]) * scale,
                          height: (item.box[3] - item.box[1]) * scale,
                          borderWidth: 2,
                          borderRadius: 4,
                          borderColor: tint,
                        }}
                      >
                        <View style={{ position: 'absolute', top: -18, left: -2, backgroundColor: tint, borderRadius: 3, paddingHorizontal: 4 }}>
                          <Text variant="caption" weight="bold" tone="inverse" numberOfLines={1}>
                            {item.label}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                : null}
            </View>
          );
        })}
      </View>
    </Dialog>
  );
}
