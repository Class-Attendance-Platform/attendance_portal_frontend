import * as React from 'react';

import { Button } from './button';
import { Dialog } from './dialog';
import { Text } from './text';

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

const ConfirmContext = React.createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<Pending | null>(null);
  const pendingRef = React.useRef<Pending | null>(null);

  const finish = React.useCallback((ok: boolean) => {
    const current = pendingRef.current;
    if (!current) return;
    pendingRef.current = null;
    setPending(null);
    current.resolve(ok);
  }, []);

  const confirm = React.useCallback((options: ConfirmOptions) => {
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

export function useConfirm() {
  const confirm = React.useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm must be used within a ConfirmProvider');
  return confirm;
}
