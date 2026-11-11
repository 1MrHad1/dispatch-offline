import { nextWork, summarise } from './scheduler';
import type { Dispatch } from './types';

function queued(id: string, writtenAt: number, nextAttemptAt = writtenAt): Dispatch {
  return {
    id,
    headline: id,
    body: '',
    location: null,
    writtenAt,
    status: 'queued',
    attempts: 0,
    nextAttemptAt,
    serverId: null,
    problem: null,
    recoveredFromLostReply: false,
  };
}

describe('nothing is attempted while offline', () => {
  it('stays idle even when dispatches are due', () => {
    expect(nextWork([queued('a', 0)], 10_000, false)).toEqual({ kind: 'idle' });
  });

  it('does not count time spent offline against the backoff', () => {
    // The backoff was set at t=100. We were offline until t=10000. The moment we
    // are back, it is due: offline time is not the server's fault and should not
    // buy the dispatch an extra wait.
    const d = queued('a', 0, 2_100);
    expect(nextWork([d], 10_000, true)).toEqual({ kind: 'send', id: 'a' });
  });
});

describe('order is preserved', () => {
  it('sends the oldest dispatch first, whatever order they reached the outbox', () => {
    const items = [queued('second', 2_000), queued('first', 1_000)];
    expect(nextWork(items, 5_000, true)).toEqual({ kind: 'send', id: 'first' });
  });

  it('sends nothing new while one is in flight', () => {
    const items: Dispatch[] = [
      { ...queued('a', 1_000), status: 'sending' },
      queued('b', 2_000),
    ];
    expect(nextWork(items, 5_000, true)).toEqual({ kind: 'idle' });
  });
});

describe('waiting', () => {
  it('sleeps exactly until the earliest dispatch is due rather than polling', () => {
    const items = [queued('a', 0, 5_000), queued('b', 0, 9_000)];
    expect(nextWork(items, 1_000, true)).toEqual({ kind: 'wait', ms: 4_000 });
  });

  it('is idle when the outbox holds nothing waiting', () => {
    const published: Dispatch = { ...queued('a', 0), status: 'published', serverId: 's' };
    expect(nextWork([published], 1_000, true)).toEqual({ kind: 'idle' });
  });

  it('does not wait on a blocked dispatch, because no amount of time fixes it', () => {
    const blocked: Dispatch = { ...queued('a', 0), status: 'blocked', problem: 'bad' };
    expect(nextWork([blocked], 1_000, true)).toEqual({ kind: 'idle' });
  });
});

describe('summarise', () => {
  it('counts what the writer is still owed an outcome for', () => {
    const items: Dispatch[] = [
      queued('a', 1),
      { ...queued('b', 2), status: 'sending' },
      { ...queued('c', 3), status: 'published', serverId: 's' },
      { ...queued('d', 4), status: 'blocked', problem: 'x' },
    ];
    expect(summarise(items)).toEqual({
      queued: 1,
      sending: 1,
      published: 1,
      blocked: 1,
      pending: 2,
    });
  });
});
