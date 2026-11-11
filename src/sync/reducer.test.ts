import { backoffFor, reduce } from './reducer';
import type { Dispatch, SyncEvent } from './types';

const fixedRandom = () => 0.5;

function written(id: string, writtenAt: number): Dispatch {
  return {
    id,
    headline: `Headline ${id}`,
    body: 'Body',
    location: null,
    writtenAt,
    status: 'queued',
    attempts: 0,
    nextAttemptAt: writtenAt,
    serverId: null,
    problem: null,
    recoveredFromLostReply: false,
  };
}

function apply(start: Dispatch[], events: SyncEvent[]): Dispatch[] {
  return events.reduce((items, e) => reduce(items, e, fixedRandom), start);
}

describe('writing is a local commit', () => {
  it('accepts a dispatch with no network involved', () => {
    const items = reduce([], { type: 'written', dispatch: written('a', 1000) }, fixedRandom);
    expect(items).toHaveLength(1);
    expect(items[0].status).toBe('queued');
  });

  it('keeps two dispatches with identical words apart, because identity is the id', () => {
    const a = written('a', 1000);
    const b = { ...written('b', 1001), headline: a.headline, body: a.body };
    const items = apply([], [
      { type: 'written', dispatch: a },
      { type: 'written', dispatch: b },
    ]);
    expect(items).toHaveLength(2);
  });
});

describe('the id is an idempotency key and never changes', () => {
  it('survives a failure, a backoff and a retry', () => {
    const items = apply([written('a', 0)], [
      { type: 'attempt_started', id: 'a', at: 0 },
      { type: 'attempt_failed', id: 'a', at: 10, retryable: true, problem: 'offline' },
      { type: 'attempt_started', id: 'a', at: 5000 },
    ]);
    expect(items[0].id).toBe('a');
    expect(items[0].attempts).toBe(2);
  });

  it('treats "the server already had it" as success, not as an error', () => {
    const items = apply([written('a', 0)], [
      { type: 'attempt_started', id: 'a', at: 0 },
      { type: 'confirmed', id: 'a', serverId: 'srv-1', alreadyHadIt: true },
    ]);
    expect(items[0].status).toBe('published');
    expect(items[0].recoveredFromLostReply).toBe(true);
    expect(items[0].problem).toBeNull();
  });
});

describe('an unanswered request is not a failed one', () => {
  it('requeues anything that was in flight when the app died', () => {
    const inFlight: Dispatch = { ...written('a', 0), status: 'sending', attempts: 1 };
    const items = reduce([inFlight], { type: 'rehydrated', at: 9999 }, fixedRandom);
    expect(items[0].status).toBe('queued');
    expect(items[0].nextAttemptAt).toBe(9999);
  });

  it('does not reset the attempt count, so a failing dispatch cannot loop forever at full speed', () => {
    const inFlight: Dispatch = { ...written('a', 0), status: 'sending', attempts: 4 };
    const items = reduce([inFlight], { type: 'rehydrated', at: 9999 }, fixedRandom);
    expect(items[0].attempts).toBe(4);
  });

  it('leaves a published dispatch alone on restart', () => {
    const done: Dispatch = { ...written('a', 0), status: 'published', serverId: 'srv-1' };
    const items = reduce([done], { type: 'rehydrated', at: 9999 }, fixedRandom);
    expect(items[0].status).toBe('published');
    expect(items[0].serverId).toBe('srv-1');
  });
});

describe('retryable and permanent failures are different things', () => {
  it('puts a retryable failure back in the queue, behind a backoff', () => {
    const items = apply([written('a', 0)], [
      { type: 'attempt_started', id: 'a', at: 0 },
      { type: 'attempt_failed', id: 'a', at: 100, retryable: true, problem: 'timeout' },
    ]);
    expect(items[0].status).toBe('queued');
    expect(items[0].nextAttemptAt).toBeGreaterThan(100);
    expect(items[0].problem).toBeNull();
  });

  it('blocks a permanent failure instead of retrying it, and says why', () => {
    const items = apply([written('a', 0)], [
      { type: 'attempt_started', id: 'a', at: 0 },
      { type: 'attempt_failed', id: 'a', at: 100, retryable: false, problem: 'Headline is required' },
    ]);
    expect(items[0].status).toBe('blocked');
    expect(items[0].problem).toBe('Headline is required');
  });

  it('lets a person unblock it, and starts the backoff over when they do', () => {
    const items = apply([written('a', 0)], [
      { type: 'attempt_started', id: 'a', at: 0 },
      { type: 'attempt_failed', id: 'a', at: 100, retryable: false, problem: 'Headline is required' },
      { type: 'unblocked', id: 'a', at: 500 },
    ]);
    expect(items[0].status).toBe('queued');
    expect(items[0].attempts).toBe(0);
    expect(items[0].nextAttemptAt).toBe(500);
  });
});

describe('one attempt at a time per dispatch', () => {
  it('ignores a second start, so a slow tick and a manual retry cannot double-send', () => {
    const items = apply([written('a', 0)], [
      { type: 'attempt_started', id: 'a', at: 0 },
      { type: 'attempt_started', id: 'a', at: 1 },
    ]);
    expect(items[0].attempts).toBe(1);
  });
});

describe('backoff', () => {
  it('grows with each attempt', () => {
    expect(backoffFor(2, fixedRandom)).toBeGreaterThan(backoffFor(1, fixedRandom));
    expect(backoffFor(3, fixedRandom)).toBeGreaterThan(backoffFor(2, fixedRandom));
  });

  it('is capped, so a long outage does not push the next try days away', () => {
    expect(backoffFor(50, fixedRandom)).toBeLessThanOrEqual(70_000);
  });

  it('is jittered, so phones that lost signal together do not retry together', () => {
    expect(backoffFor(3, () => 0)).not.toBe(backoffFor(3, () => 1));
  });
});
