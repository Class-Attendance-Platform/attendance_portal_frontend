// How the app gets a new access token, without the HTTP and storage details (client.ts plugs
// those in), so the multi-tab cases can be tested (tests/refresh.test.mjs).
//
// The backend rotates refresh tokens: each refresh returns a new pair and blacklists the old
// refresh token. On the web every tab shares one saved login (localStorage), so two tabs must not
// both use the same refresh token, and a tab must never overwrite or wipe a newer pair that
// another tab saved.
//
// No imports and only type annotations TypeScript can strip: Node runs this file directly in tests.

/** A pair of tokens (either may be missing). */
export type TokenPair = { access: string | null; refresh: string | null };

/** The saved login as the tabs share it (web), with the id of its user. */
export type SavedTokens = TokenPair & { userId: string | null };

export type RefreshEnv = {
  /** This tab's tokens (memory). */
  getTokens: () => TokenPair;
  /** Keeps the user the tokens belong to. */
  setTokens: (access: string | null, refresh: string | null) => void;
  /** Id of the user this tab is signed in as (null while unknown). */
  owner: () => string | null;
  /** Web: the saved login shared by the tabs; phones: null (one app instance). */
  readSaved: () => SavedTokens | null;
  /** Saves the new pair, unless the login was removed meanwhile. */
  save: (access: string, refresh: string) => Promise<void>;
  /** POST /auth/refresh/. Rejects with an error that has the HTTP `status` (0 or none: no answer). */
  send: (refresh: string) => Promise<{ access?: string; refresh?: string } | null | undefined>;
  /** Blacklists a pair nobody will use (in the background; never throws). */
  revoke: (pair: { access: string; refresh: string }) => void;
  /** Changes on every sign-out (lib/session.ts). */
  generation: () => number;
  /** Runs `task` while no other tab refreshes (Web Locks); null where that is not available. */
  lock: (<T>(task: () => Promise<T>) => Promise<T>) | null;
  /** No lock: waits a moment for another tab to save the pair it just got (storage event or timeout). */
  waitForOtherTab: () => Promise<void>;
  /** Milliseconds since 1970 (tests pass their own clock). */
  now: () => number;
};

/**
 * `ok`: this tab has a usable pair now. Otherwise `expired` is the refresh token the server
 * refused (that login is over), or null when the refresh failed for another reason (no network,
 * or the user signed out meanwhile) and the login stays as it is.
 */
export type RefreshResult = { ok: true } | { ok: false; expired: string | null };

/** A saved access token is taken over only if it is still good for this long. */
const FRESH_FOR_MS = 60_000;

/** When a JWT expires (ms since 1970), or null if it cannot be read. */
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

/** The saved login if it belongs to the user signed in here (another account may have signed in in another tab). */
export function ownSaved(saved: SavedTokens | null, owner: string | null): SavedTokens | null {
  if (!saved?.refresh) return null;
  if (owner && saved.userId && saved.userId !== owner) return null;
  return saved;
}

/**
 * The newest pair of this tab's user: the saved one (another tab may have rotated it), else this
 * tab's own. Sign-out blacklists this one.
 */
export function newestTokens(saved: SavedTokens | null, owner: string | null, memory: TokenPair): TokenPair {
  const mine = ownSaved(saved, owner);
  return mine ? { access: mine.access, refresh: mine.refresh } : memory;
}

/**
 * What to do when the server refused `failed` (the refresh token this tab used):
 * - `adopt`: another tab saved a newer login of the same user; use it and stay signed in.
 * - `leave`: another account's login is saved now; sign out here but keep that login saved.
 * - `clear`: the saved login is the refused one (or none): sign out and remove it.
 */
export function afterRefused(saved: SavedTokens | null, failed: string | null, owner: string | null): 'adopt' | 'leave' | 'clear' {
  if (!saved?.refresh || saved.refresh === failed) return 'clear';
  if (owner && saved.userId && saved.userId !== owner) return 'leave';
  return 'adopt';
}

/**
 * Gets a new access token. On the web it runs while no other tab refreshes (Web Locks), takes
 * over a fresh pair another tab saved instead of calling the server, and otherwise refreshes with
 * the newest saved refresh token. A result that arrives after a sign-out (here or in another tab)
 * or a new sign-in is thrown away and blacklisted.
 */
export function refreshTokens(env: RefreshEnv): Promise<RefreshResult> {
  return env.lock ? env.lock(() => attempt(env)) : attempt(env);
}

async function attempt(env: RefreshEnv): Promise<RefreshResult> {
  const generation = env.generation();
  const held = env.getTokens();
  const saved = ownSaved(env.readSaved(), env.owner());

  // Another tab already rotated the token and its access token is still good: use that pair.
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
    if (statusOf(error) !== 401) return { ok: false, expired: null };
    // Without a lock another tab may have used the same token a moment earlier: wait for its
    // new pair and try once more with it.
    if (!env.lock) await env.waitForOtherTab();
    const latest = ownSaved(env.readSaved(), env.owner())?.refresh;
    if (!latest || latest === token) return { ok: false, expired: token };
    token = latest;
    try {
      data = await env.send(token);
    } catch (retryError) {
      return { ok: false, expired: statusOf(retryError) === 401 ? token : null };
    }
  }

  if (!data?.access) return { ok: false, expired: null };
  const fresh = { access: data.access, refresh: data.refresh ?? token };

  // Signed out (here or in another tab) or signed in again while waiting: drop the new pair.
  if (env.generation() !== generation || env.getTokens().refresh !== held.refresh) {
    if (data.refresh) env.revoke(fresh);
    return { ok: false, expired: null };
  }

  env.setTokens(fresh.access, fresh.refresh);
  // Saved before the lock is released, so the next tab reads this pair.
  await env.save(fresh.access, fresh.refresh);
  return { ok: true };
}
