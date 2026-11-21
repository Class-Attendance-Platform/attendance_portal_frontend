export type TokenPair = { access: string | null; refresh: string | null };

export type SavedTokens = TokenPair & { userId: string | null };

export type RefreshEnv = {
  getTokens: () => TokenPair;
  setTokens: (access: string | null, refresh: string | null) => void;
  owner: () => string | null;
  readSaved: () => SavedTokens | null;
  save: (access: string, refresh: string) => Promise<void>;
  send: (refresh: string) => Promise<{ access?: string; refresh?: string } | null | undefined>;
  revoke: (pair: { access: string; refresh: string }) => void;
  generation: () => number;
  lock: (<T>(task: () => Promise<T>) => Promise<T>) | null;
  waitForOtherTab: () => Promise<void>;
  now: () => number;
};

export type RefreshResult = { ok: true } | { ok: false; expired: string | null; error?: unknown };

const FRESH_FOR_MS = 60_000;

export function tokenExpiresAt(token: string | null | undefined): number | null {
  try {
    const part = token?.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    return typeof payload?.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function statusOf(error: unknown): number {
  const status = (error as { status?: unknown; response?: { status?: unknown } } | null)?.response?.status ??
    (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? status : 0;
}

export function ownSaved(saved: SavedTokens | null, owner: string | null): SavedTokens | null {
  if (!saved?.refresh) return null;
  if (owner && saved.userId && saved.userId !== owner) return null;
  return saved;
}

export function newestTokens(saved: SavedTokens | null, owner: string | null, memory: TokenPair): TokenPair {
  const mine = ownSaved(saved, owner);
  return mine ? { access: mine.access, refresh: mine.refresh } : memory;
}

export function afterRefused(saved: SavedTokens | null, failed: string | null, owner: string | null): 'adopt' | 'leave' | 'clear' {
  if (!saved?.refresh || saved.refresh === failed) return 'clear';
  if (owner && saved.userId && saved.userId !== owner) return 'leave';
  return 'adopt';
}

const SIGN_OUT_CODES = ['password_changed', 'user_inactive', 'user_not_found'];

export function signOutReason<E extends { status?: unknown; code?: unknown }>(...errors: (E | null | undefined)[]): E | null {
  for (const error of errors) {
    if (error?.status === 401 && typeof error.code === 'string' && SIGN_OUT_CODES.includes(error.code)) return error;
  }
  return null;
}

export function refreshTokens(env: RefreshEnv): Promise<RefreshResult> {
  return env.lock ? env.lock(() => attempt(env)) : attempt(env);
}

async function attempt(env: RefreshEnv): Promise<RefreshResult> {
  const generation = env.generation();
  const held = env.getTokens();
  const saved = ownSaved(env.readSaved(), env.owner());

  if (saved && saved.refresh !== held.refresh && saved.access) {
    const expiresAt = tokenExpiresAt(saved.access);
    if (expiresAt !== null && expiresAt - FRESH_FOR_MS > env.now()) {
      env.setTokens(saved.access, saved.refresh);
      return { ok: true };
    }
  }

  let token = saved?.refresh ?? held.refresh;
  if (!token) return { ok: false, expired: null };

  let data: { access?: string; refresh?: string } | null | undefined;
  try {
    data = await env.send(token);
  } catch (error) {
    if (statusOf(error) !== 401) return { ok: false, expired: null, error };
    if (!env.lock) await env.waitForOtherTab();
    const latest = ownSaved(env.readSaved(), env.owner())?.refresh;
    if (!latest || latest === token) return { ok: false, expired: token, error };
    token = latest;
    try {
      data = await env.send(token);
    } catch (retryError) {
      return { ok: false, expired: statusOf(retryError) === 401 ? token : null, error: retryError };
    }
  }

  if (!data?.access) return { ok: false, expired: null };
  const fresh = { access: data.access, refresh: data.refresh ?? token };

  if (env.generation() !== generation || env.getTokens().refresh !== held.refresh) {
    if (data.refresh) env.revoke(fresh);
    return { ok: false, expired: null };
  }

  env.setTokens(fresh.access, fresh.refresh);
  await env.save(fresh.access, fresh.refresh);
  return { ok: true };
}
