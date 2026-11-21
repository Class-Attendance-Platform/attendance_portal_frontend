export const NO_CAMERA_TEXT =
  'No camera was found on this device. Use your phone (the app or the website) to register your face.';

export function cameraErrorText(error: unknown): string {
  const name = typeof error === 'object' && error !== null && 'name' in error ? error.name : null;
  switch (name) {
    case 'NotFoundError':
    case 'OverconstrainedError':
      return NO_CAMERA_TEXT;
    case 'NotReadableError':
    case 'AbortError':
      return 'The camera is being used by another app. Close that app, then press Try again.';
    case 'NotAllowedError':
      return 'Camera access is blocked. Allow it in the browser or system settings, then press Try again.';
    default:
      return 'The camera could not start. Press Try again.';
  }
}
