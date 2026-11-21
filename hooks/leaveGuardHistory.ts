export type LeaveQuestion = () => Promise<boolean>;

type NavigateEvent = { navigationType: string; userInitiated: boolean; destination: { index: number } };

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
  let move: { byPerson: boolean; from: number; to: number } | null = null;
  let returningTo: number | null = null;
  let asking = false;
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
        const ours = current.to === returningTo;
        returningTo = null;
        if (ours) event.stopImmediatePropagation();
        return;
      }
      const guard = guards.filter((item) => !item.leaving).pop();
      if (!guard) return;
      event.stopImmediatePropagation();
      wanted = current.to - current.from;
      returningTo = current.from;
      win.history.go(-wanted);
      if (asking) return;
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
