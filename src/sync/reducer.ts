import type { Dispatch, SyncEvent } from './types';

/**
 * The outbox, as a pure function of the events that happened to it.
 *
 * No network, no storage, no React. That is deliberate: the hard parts of
 * offline sync are decisions, not IO, and decisions are worth testing on their
 * own. Everything that touches the world lives in engine.ts.
 */

/** 2s, 4s, 8s... capped. Slow enough to be polite to a server that is struggling. */
export const BASE_BACKOFF_MS = 2_000;
export const MAX_BACKOFF_MS = 60_000;

/**
 * Jitter is injectable so tests are deterministic. In production two phones that
 * lost signal in the same tunnel should not come back and retry on the same
 * millisecond, which is what a jitter-free backoff does.
 */
export function backoffFor(attempts: number, random: () => number = Math.random): number {
  const exponential = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1));
  const jitter = exponential * 0.25 * random();
  return Math.round(exponential - exponential * 0.125 + jitter);
}

function replace(items: Dispatch[], id: string, change: (d: Dispatch) => Dispatch): Dispatch[] {
  return items.map((d) => (d.id === id ? change(d) : d));
}

export function reduce(
  items: Dispatch[],
  event: SyncEvent,
  random: () => number = Math.random,
): Dispatch[] {
  switch (event.type) {
    case 'written':
      // Appended, never deduplicated here. Two dispatches with the same words are
      // two dispatches; only the id decides identity.
      return [...items, event.dispatch];

    case 'attempt_started':
      // Guarded: only something queued can start. Without this a slow tick and a
      // manual retry can both start the same dispatch, and the server sees two
      // requests where the UI showed one attempt.
      return replace(items, event.id, (d) =>
        d.status === 'queued' ? { ...d, status: 'sending', attempts: d.attempts + 1 } : d,
      );

    case 'confirmed':
      return replace(items, event.id, (d) => ({
        ...d,
        status: 'published',
        serverId: event.serverId,
        problem: null,
        recoveredFromLostReply: event.alreadyHadIt,
      }));

    case 'attempt_failed':
      return replace(items, event.id, (d) =>
        event.retryable
          ? {
              ...d,
              status: 'queued',
              nextAttemptAt: event.at + backoffFor(d.attempts, random),
              problem: null,
            }
          : { ...d, status: 'blocked', problem: event.problem },
      );

    case 'rehydrated':
      // The app died, or was swiped away, or the phone ran out of battery, while a
      // request was in flight. We cannot know whether it reached the server: an
      // unanswered request is not a failed one. So we put it back in the queue and
      // ask again. Asking again is safe precisely because the id never changed, so
      // a server that already has it answers "already had it" instead of posting
      // the dispatch a second time.
      return items.map((d) =>
        d.status === 'sending' ? { ...d, status: 'queued', nextAttemptAt: event.at } : d,
      );

    case 'unblocked':
      return replace(items, event.id, (d) => ({
        ...d,
        status: 'queued',
        attempts: 0,
        nextAttemptAt: event.at,
        problem: null,
      }));

    case 'discarded':
      return items.filter((d) => d.id !== event.id);
  }
}
