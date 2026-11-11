import AsyncStorage from '@react-native-async-storage/async-storage';

import { reduce } from './reducer';
import { nextWork } from './scheduler';
import { GOOD_SIGNAL, SimulatedServer } from './transport';
import type { Conditions } from './transport';
import type { Dispatch, SyncEvent } from './types';

const STORAGE_KEY = 'dispatch.outbox.v1';

/**
 * The engine. Everything that touches the world lives here: storage, timers and
 * the transport. The decisions it makes come from reduce() and nextWork(), which
 * are pure and tested on their own.
 *
 * It is a plain class rather than a hook so that it keeps running while React
 * is busy, and so it has exactly one owner. React subscribes to it through
 * useSyncExternalStore.
 */
export class OutboxStore {
  private items: Dispatch[] = [];
  private conditions: Conditions = GOOD_SIGNAL;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly server = new SimulatedServer();
  private snapshot = { items: [] as Dispatch[], conditions: GOOD_SIGNAL, ready: false };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  // useSyncExternalStore compares snapshots by identity, so a new object is built
  // only when something actually changed. Returning a fresh object every call is
  // the classic way to make React re-render forever.
  getSnapshot = () => this.snapshot;

  private publishSnapshot(ready = this.snapshot.ready) {
    this.snapshot = { items: this.items, conditions: this.conditions, ready };
    this.listeners.forEach((l) => l());
  }

  async start() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) this.items = JSON.parse(raw) as Dispatch[];
    } catch {
      // A corrupt outbox is worse than an empty one only if we crash on it.
      this.items = [];
    }
    // Reconsider anything that was mid-flight when the app last died. See the
    // reducer's 'rehydrated' case for why this is safe to replay.
    this.apply({ type: 'rehydrated', at: Date.now() });
    this.publishSnapshot(true);
    this.tick();
  }

  private apply(event: SyncEvent) {
    this.items = reduce(this.items, event);
    this.publishSnapshot();
    void this.persist();
  }

  private async persist() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    } catch {
      // Persisting is best-effort. Losing it costs a replay, not a dispatch,
      // because the in-memory outbox is still the source of truth this session.
    }
  }

  setConditions(conditions: Conditions) {
    this.conditions = conditions;
    this.publishSnapshot();
    // Coming back online should feel immediate. Do not wait out the current timer.
    this.tick();
  }

  write(input: { headline: string; body: string; location: string | null }) {
    const now = Date.now();
    const dispatch: Dispatch = {
      // Generated here, once, and never again. See types.ts.
      id: newId(),
      headline: input.headline,
      body: input.body,
      location: input.location,
      writtenAt: now,
      status: 'queued',
      attempts: 0,
      nextAttemptAt: now,
      serverId: null,
      problem: null,
      recoveredFromLostReply: false,
    };
    this.apply({ type: 'written', dispatch });
    this.tick();
    return dispatch;
  }

  retry(id: string) {
    this.apply({ type: 'unblocked', id, at: Date.now() });
    this.tick();
  }

  discard(id: string) {
    this.apply({ type: 'discarded', id });
  }

  private tick = () => {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const work = nextWork(this.items, Date.now(), this.conditions.online);

    if (work.kind === 'idle') return;

    if (work.kind === 'wait') {
      this.timer = setTimeout(this.tick, work.ms);
      return;
    }

    void this.send(work.id);
  };

  private async send(id: string) {
    const dispatch = this.items.find((d) => d.id === id);
    if (!dispatch) return;

    this.apply({ type: 'attempt_started', id, at: Date.now() });

    // Read the attempt back out of state: the reducer owns the attempt count, so
    // asking it is the only way to be sure the number the server sees matches the
    // number the UI shows.
    const attempting = this.items.find((d) => d.id === id) ?? dispatch;
    const result = await this.server.send(attempting, this.conditions);

    if (result.ok) {
      this.apply({
        type: 'confirmed',
        id,
        serverId: result.serverId,
        alreadyHadIt: result.alreadyHadIt,
      });
    } else {
      this.apply({
        type: 'attempt_failed',
        id,
        at: Date.now(),
        retryable: result.retryable,
        problem: result.problem,
      });
    }

    this.tick();
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}

/**
 * crypto.randomUUID is not on every React Native runtime, so this falls back.
 * The only requirement is that it never collides and never changes for a given
 * dispatch, because the server uses it to recognise a repeat.
 */
function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
