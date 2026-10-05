import { Platform } from 'react-native';

/** A photo from the camera or the photo library, ready to upload. */
export type PhotoFile = { uri: string; name: string; type: string };

/**
 * Adds a photo to a multipart form. On the web the uri (data: or blob: URL)
 * is turned into a Blob; on phones React Native uploads straight from the uri.
 */
export async function appendPhoto(form: FormData, field: string, photo: PhotoFile) {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(photo.uri)).blob();
    form.append(field, blob, photo.name);
  } else {
    form.append(field, { uri: photo.uri, name: photo.name, type: photo.type } as any);
  }
}
