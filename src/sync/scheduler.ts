import type { Dispatch, Work } from './types';

/**
 * What the engine should do next, as a pure function of the outbox, the clock
 * and whether there is a connection. No side effects, so the awkward cases
 * (everything backing off at once, a connection that drops mid-flight) can be
 * tested by calling a function instead of by simulating a phone.
 */
export function nextWork(items: Dispatch[], now: number, online: boolean): Work {
  // One request in flight at a time. It costs throughput we do not need and buys
  // ordering we do: a reader should see a correspondent's dispatches in the order
  // they were written, not in the order the network happened to deliver them.
  if (items.some((d) => d.status === 'sending')) return { kind: 'idle' };

  if (!online) return { kind: 'idle' };

  const waiting = items
    .filter((d) => d.status === 'queued')
    .sort((a, b) => a.writtenAt - b.writtenAt);

  if (waiting.length === 0) return { kind: 'idle' };

  const due = waiting.find((d) => d.nextAttemptAt <= now);
  if (due) return { kind: 'send', id: due.id };

  // Nothing is due. Sleep exactly until the earliest one is, rather than polling.
  const soonest = Math.min(...waiting.map((d) => d.nextAttemptAt));
  return { kind: 'wait', ms: Math.max(0, soonest - now) };
}

/** Counts for the UI. Derived, never stored: a stored count is a count that can be wrong. */
export function summarise(items: Dispatch[]) {
  return {
    queued: items.filter((d) => d.status === 'queued').length,
    sending: items.filter((d) => d.status === 'sending').length,
    published: items.filter((d) => d.status === 'published').length,
    blocked: items.filter((d) => d.status === 'blocked').length,
    /** Anything the writer is still owed an outcome for. */
    pending: items.filter((d) => d.status === 'queued' || d.status === 'sending').length,
  };
}
