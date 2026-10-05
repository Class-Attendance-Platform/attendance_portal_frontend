import * as React from 'react';

import { Button } from './button';
import { Dialog } from './dialog';
import { Text } from './text';

export type ConfirmOptions = {
  title: string;
  message?: string;
  /** Default "Confirm" (or "Delete" when destructive). */
  confirmLabel?: string;
  /** Default "Cancel". */
  cancelLabel?: string;
  /** Red confirm button for deleting or discarding. */
  destructive?: boolean;
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

const ConfirmContext = React.createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

/**
 * Renders the shared confirm dialog. Ask with `useConfirm()`:
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'Delete this class?', destructive: true })) { ... }
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<Pending | null>(null);
  const pendingRef = React.useRef<Pending | null>(null);

  const finish = React.useCallback((ok: boolean) => {
    const current = pendingRef.current;
    if (!current) return; // already answered (e.g. Escape and a button at once)
    pendingRef.current = null;
    setPending(null);
    current.resolve(ok);
  }, []);

  const confirm = React.useCallback((options: ConfirmOptions) => {
    // A new question cancels one that is still open.
    pendingRef.current?.resolve(false);
    return new Promise<boolean>((resolve) => {
      const next = { ...options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {/* Mounted only while asking: on the web each dialog's layer is added to the page when it
          mounts, so a question asked from an open dialog must mount after it to show on top. */}
      {pending ? (
        <Dialog
          open
          onClose={() => finish(false)}
          title={pending.title}
          size="sm"
          actions={
            <>
              <Button label={pending.cancelLabel ?? 'Cancel'} variant="secondary" onPress={() => finish(false)} />
              <Button
                label={pending.confirmLabel ?? (pending.destructive ? 'Delete' : 'Confirm')}
                variant={pending.destructive ? 'danger' : 'primary'}
                onPress={() => finish(true)}
              />
            </>
          }
        >
          {pending.message ? <Text tone="muted">{pending.message}</Text> : null}
        </Dialog>
      ) : null}
    </ConfirmContext.Provider>
  );
}

/** Returns `confirm(options)`, which resolves true (confirmed) or false (cancelled). */
export function useConfirm() {
  const confirm = React.useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm must be used within a ConfirmProvider');
  return confirm;
}
