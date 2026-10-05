import { Platform } from 'react-native';

/** A file from the camera, the photo library or a file picker, ready to upload. */
export type PhotoFile = { uri: string; name: string; type: string };

/** A file to upload: a uri (phones and web) or, on the web, a File/Blob from an <input>. */
export type UploadFile = PhotoFile | { blob: Blob; name: string };

/**
 * Adds a file to a multipart form. On the web a uri (data: or blob: URL) is turned into a Blob;
 * on phones React Native uploads straight from the uri.
 */
export async function appendFile(form: FormData, field: string, file: UploadFile) {
  if ('blob' in file) {
    form.append(field, file.blob, file.name);
    return;
  }
  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    form.append(field, blob, file.name);
  } else {
    form.append(field, { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  }
}

/** Same as appendFile, for photos. */
export const appendPhoto = (form: FormData, field: string, photo: PhotoFile) => appendFile(form, field, photo);
