import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge our custom font sizes and radii, so `text-body` (size) and
// `text-primary` (colour) are not treated as the same kind of class.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['caption', 'small', 'body', 'section', 'title-phone', 'title', 'code'],
      radius: ['control', 'card', 'card-phone', 'pill'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Keyboard focus ring for pressable things on the web (no effect on phones). */
export const FOCUS_RING =
  'web:outline-none web:focus-visible:outline web:focus-visible:outline-2 web:focus-visible:outline-offset-2 web:focus-visible:outline-primary';
