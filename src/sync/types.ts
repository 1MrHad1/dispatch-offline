/**
 * The outbox domain.
 *
 * The rule this whole app is built around: pressing Publish is a LOCAL commit.
 * It writes to the outbox and returns. It never waits for a network, so it can
 * never fail because of one. Everything after that is the engine's problem,
 * not the writer's.
 */

export type DispatchStatus =
  /** Written and committed locally. Waiting for a connection, or for its backoff to lapse. */
  | 'queued'
  /** A request is in flight right now. */
  | 'sending'
  /** The server has it. Confirmed, with an id from the server. */
  | 'published'
  /** The server refused in a way that retrying will not fix. Needs a person. */
  | 'blocked';

export type Dispatch = {
  /**
   * Generated once, when the dispatch is written, and never again. It is both the
   * local identity and the idempotency key sent to the server. Regenerating it on
   * retry is the bug that creates duplicate posts, so it is readonly here and the
   * reducer never touches it.
   */
  readonly id: string;
  readonly headline: string;
  readonly body: string;
  readonly location: string | null;
  /** When the writer pressed Publish, not when it reached the server. The feed sorts by this. */
  readonly writtenAt: number;

  status: DispatchStatus;
  /** How many times we have asked the server. Drives the backoff. */
  attempts: number;
  /** Earliest time we may try again. Equal to writtenAt for a fresh dispatch. */
  nextAttemptAt: number;
  /** The server's own id, once it confirms. */
  serverId: string | null;
  /** Why it is blocked, in words a person can read. Null unless blocked. */
  problem: string | null;
  /**
   * True when the server answered "I already have this one".
   * That is not an error: the first request landed and the reply was lost.
   * Worth surfacing, because it is the moment the idempotency key paid for itself.
   */
  recoveredFromLostReply: boolean;
};

export type SyncEvent =
  | { type: 'written'; dispatch: Dispatch }
  | { type: 'attempt_started'; id: string; at: number }
  | { type: 'confirmed'; id: string; serverId: string; alreadyHadIt: boolean }
  | { type: 'attempt_failed'; id: string; at: number; retryable: boolean; problem: string }
  /**
   * The app has just started and read the outbox off disk.
   * See the reducer: this is where anything that was in flight gets reconsidered.
   */
  | { type: 'rehydrated'; at: number }
  /** The writer tapped "Try again" on a blocked dispatch. */
  | { type: 'unblocked'; id: string; at: number }
  | { type: 'discarded'; id: string };

/** What the engine should do next. Decided by a pure function; see scheduler.ts. */
export type Work =
  | { kind: 'send'; id: string }
  /** Nothing is due yet. Come back in this many milliseconds. */
  | { kind: 'wait'; ms: number }
  /** Nothing to do at all: no connection, or the outbox is clear. */
  | { kind: 'idle' };
