import { SimulatedServer } from './transport';
import type { Conditions } from './transport';
import type { Dispatch } from './types';

const PERFECT: Conditions = {
  name: 'good',
  online: true,
  latencyMs: 0,
  failureRate: 0,
  lostReplyRate: 0,
};

const OFFLINE: Conditions = { ...PERFECT, name: 'none', online: false };

/** Every request lands and every reply is lost: the case the key exists for. */
const REPLIES_LOST: Conditions = { ...PERFECT, name: 'bad', lostReplyRate: 1 };

function dispatch(id: string, headline = `Headline ${id}`): Dispatch {
  return {
    id,
    headline,
    body: '',
    location: null,
    writtenAt: 0,
    status: 'sending',
    attempts: 1,
    nextAttemptAt: 0,
    serverId: null,
    problem: null,
    recoveredFromLostReply: false,
  };
}

describe('the idempotency contract', () => {
  it('gives two different dispatches two different ids', async () => {
    const server = new SimulatedServer();
    const a = await server.send(dispatch('a'), PERFECT);
    const b = await server.send(dispatch('b'), PERFECT);
    expect(a).toMatchObject({ ok: true, alreadyHadIt: false });
    expect(b).toMatchObject({ ok: true, alreadyHadIt: false });
    expect(a.ok && b.ok && a.serverId).not.toBe(b.ok && b.serverId);
  });

  it('answers a repeated key with the first answer, and says it already had it', async () => {
    const server = new SimulatedServer();
    const first = await server.send(dispatch('a'), PERFECT);
    const again = await server.send(dispatch('a'), PERFECT);
    expect(again).toMatchObject({ ok: true, alreadyHadIt: true });
    expect(first.ok && again.ok && again.serverId).toBe(first.ok && first.serverId);
  });

  it('writes the dispatch even when the reply is lost, and does not write it twice', async () => {
    const server = new SimulatedServer();
    const lost = await server.send(dispatch('a'), REPLIES_LOST);
    expect(lost).toMatchObject({ ok: false, retryable: true });

    const retry = await server.send(dispatch('a'), PERFECT);
    expect(retry).toMatchObject({ ok: true, alreadyHadIt: true });

    // One dispatch written, not two: the counter never advanced on the retry.
    const other = await server.send(dispatch('b'), PERFECT);
    expect(other.ok && other.serverId).toBe('srv_0002');
  });
});

describe('a server that is restarted still remembers', () => {
  // The regression test for a real bug: the server lived only in memory, so a
  // page reload wiped what it had seen. A lost reply before the reload then
  // filed the dispatch a second time after it, and two dispatches were handed
  // the same server id.
  it('returns the same id for a key it saw before the restart', async () => {
    const before = new SimulatedServer();
    const first = await before.send(dispatch('a'), PERFECT);

    const after = new SimulatedServer();
    after.restore(before.snapshot());
    const again = await after.send(dispatch('a'), PERFECT);

    expect(again).toMatchObject({ ok: true, alreadyHadIt: true });
    expect(first.ok && again.ok && again.serverId).toBe(first.ok && first.serverId);
  });

  it('does not hand a new dispatch an id it has already used', async () => {
    const before = new SimulatedServer();
    await before.send(dispatch('a'), PERFECT);

    const after = new SimulatedServer();
    after.restore(before.snapshot());
    const next = await after.send(dispatch('b'), PERFECT);

    expect(next.ok && next.serverId).toBe('srv_0002');
  });
});

describe('failures the client has to tell apart', () => {
  it('reports no connection as retryable', async () => {
    const server = new SimulatedServer();
    expect(await server.send(dispatch('a'), OFFLINE)).toMatchObject({
      ok: false,
      retryable: true,
    });
  });

  it('reports a dispatch with no headline as permanent, and says why', async () => {
    const server = new SimulatedServer();
    const result = await server.send(dispatch('a', '   '), PERFECT);
    expect(result).toMatchObject({ ok: false, retryable: false });
    expect(result.ok === false && result.problem).toMatch(/headline/i);
  });

  it('does not write a dispatch it refused, so fixing it still gets the first id', async () => {
    const server = new SimulatedServer();
    await server.send(dispatch('a', ''), PERFECT);
    const fixed = await server.send(dispatch('a', 'Now it has one'), PERFECT);
    expect(fixed.ok && fixed.serverId).toBe('srv_0001');
  });
});
