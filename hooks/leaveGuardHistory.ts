// The web part of useLeaveGuard: the browser's Back and Forward buttons (and a phone browser's back
// gesture). expo-router answers them by swapping the whole navigation state, which skips React
// Navigation's beforeRemove, so usePreventRemove never asks. This popstate listener runs before
// expo-router's (capture phase, set up as the app loads), puts the page back and asks.
// It reads the Navigation API (Chrome, Edge, Firefox, Safari; the desktop app) to tell the person's
// moves from the app's own and to know where they lead. Without it nothing is stopped.
// Pure (no imports): tests/leave-guard.test.mjs runs it in Node with a fake window.

/** Asks the person; true = leave and drop the work. */
export type LeaveQuestion = () => Promise<boolean>;

type NavigateEvent = { navigationType: string; userInitiated: boolean; destination: { index: number } };

/** The parts of `window` it uses. */
export type HistoryWindow = {
  navigation?: {
    currentEntry: { index: number } | null;
    addEventListener: (type: 'navigate', listener: (event: NavigateEvent) => void) => void;
  };
  history: { go: (delta: number) => void };
  addEventListener: (type: 'popstate', listener: (event: { stopImmediatePropagation: () => void }) => void, capture: boolean) => void;
};

type Guard = { ask: LeaveQuestion; leaving: boolean };

export function watchHistory(win: HistoryWindow) {
  const guards: Guard[] = [];
  // The move that is happening: set by the Navigation API's navigate event, read by popstate.
  let move: { byPerson: boolean; from: number; to: number } | null = null;
  // Our own step back to the guarded page: its place in the history.
  let returningTo: number | null = null;
  let asking = false;
  // Where the person wanted to go, from the guarded page (made after all if they choose to leave).
  let wanted = 0;

  const navigation = win.navigation;
  navigation?.addEventListener('navigate', (event) => {
    move =
      event.navigationType === 'traverse'
        ? { byPerson: event.userInitiated, from: navigation.currentEntry?.index ?? -1, to: event.destination.index }
        : null;
  });

  win.addEventListener(
    'popstate',
    (event) => {
      const current = move;
      move = null;
      if (!current || current.from < 0 || current.to < 0) return;
      if (!current.byPerson) {
        // The app's own moves go through (expo-router going back after a question was answered in
        // the app), except our step back, which expo-router must not see.
        const ours = current.to === returningTo;
        returningTo = null;
        if (ours) event.stopImmediatePropagation();
        return;
      }
      const guard = guards.filter((item) => !item.leaving).pop();
      if (!guard) return;
      // Stay on this page: expo-router never sees the move, and the browser goes back to the page.
      event.stopImmediatePropagation();
      wanted = current.to - current.from;
      returningTo = current.from;
      win.history.go(-wanted);
      if (asking) return; // Back pressed again while the question is open
      asking = true;
      guard.ask().then(
        (leave) => {
          asking = false;
          if (!leave || guard.leaving || !guards.includes(guard)) return;
          guard.leaving = true;
          win.history.go(wanted);
        },
        () => {
          asking = false;
        }
      );
    },
    true
  );

  return {
    /** Guards the page in front until the returned function is called. */
    guard(ask: LeaveQuestion): () => void {
      const item: Guard = { ask, leaving: false };
      guards.push(item);
      return () => {
        const at = guards.indexOf(item);
        if (at !== -1) guards.splice(at, 1);
      };
    },
  };
}
