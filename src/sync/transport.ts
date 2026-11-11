import type { Dispatch } from './types';

/**
 * A stand-in server, running in the app.
 *
 * A demo that needs a backend is a demo nobody runs, so this one keeps the
 * server in the same bundle. It is not a mock in the testing sense: it holds
 * real state, it enforces the idempotency contract, and the UI drives its
 * conditions, so the failures a reviewer sees are the failures the engine
 * actually handles.
 *
 * The real version of this is an HTTP call. Nothing above this file knows the
 * difference, which is the point of keeping it behind one function.
 */

export type Conditions = {
  /** Identifies the preset, so the UI can show which one is on without guessing. */
  name: 'good' | 'bad' | 'none';
  online: boolean;
  /** Round trip, in milliseconds. 2000+ is a usable stand-in for a bad 3G cell. */
  latencyMs: number;
  /** 0 to 1. The request never reaches the server. */
  failureRate: number;
  /**
   * 0 to 1. The request REACHES the server and is written, and then the reply is
   * lost on the way back. The client cannot tell this apart from a plain failure,
   * which is exactly why the idempotency key exists.
   */
  lostReplyRate: number;
};

export const GOOD_SIGNAL: Conditions = {
  name: 'good',
  online: true,
  latencyMs: 350,
  failureRate: 0,
  lostReplyRate: 0,
};

export const BAD_SIGNAL: Conditions = {
  name: 'bad',
  online: true,
  latencyMs: 2_200,
  failureRate: 0.55,
  lostReplyRate: 0.25,
};

export const NO_SIGNAL: Conditions = {
  name: 'none',
  online: false,
  latencyMs: 0,
  failureRate: 1,
  lostReplyRate: 0,
};

export type SendResult =
  | { ok: true; serverId: string; alreadyHadIt: boolean }
  | { ok: false; retryable: boolean; problem: string };

export class SimulatedServer {
  /** idempotency key -> the id this server assigned the first time it saw it. */
  private readonly seen = new Map<string, string>();
  private counter = 0;

  /** Everything the server has accepted, oldest first. The feed reads this. */
  published(): { serverId: string; key: string }[] {
    return [...this.seen.entries()].map(([key, serverId]) => ({ key, serverId }));
  }

  async send(dispatch: Dispatch, conditions: Conditions): Promise<SendResult> {
    if (!conditions.online) {
      return { ok: false, retryable: true, problem: 'No connection' };
    }

    await new Promise((r) => setTimeout(r, conditions.latencyMs));

    if (Math.random() < conditions.failureRate) {
      return { ok: false, retryable: true, problem: 'The request did not get through' };
    }

    // Validation happens before the write, and a validation failure is permanent:
    // the same request will fail the same way forever, so retrying it is just
    // noise. The client needs to hear "stop and look at this", not "try again".
    if (dispatch.headline.trim().length === 0) {
      return { ok: false, retryable: false, problem: 'A dispatch needs a headline' };
    }

    const already = this.seen.get(dispatch.id);
    if (already) {
      // The second time we see a key, the answer is the first answer. The server
      // does not write the dispatch again and does not treat this as an error.
      return { ok: true, serverId: already, alreadyHadIt: true };
    }

    const serverId = `srv_${(++this.counter).toString().padStart(4, '0')}`;
    this.seen.set(dispatch.id, serverId);

    if (Math.random() < conditions.lostReplyRate) {
      // Written, and the writer will never hear about it. From here the only thing
      // that stops a duplicate is the client asking again with the same key.
      return { ok: false, retryable: true, problem: 'The reply was lost on the way back' };
    }

    return { ok: true, serverId, alreadyHadIt: false };
  }
}
