import { Platform } from 'react-native';

export type PhotoFile = { uri: string; name: string; type: string };

export type UploadFile = PhotoFile | { blob: Blob; name: string };

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

export const appendPhoto = (form: FormData, field: string, photo: PhotoFile) => appendFile(form, field, photo);
