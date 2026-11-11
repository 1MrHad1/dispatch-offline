# Dispatch

A small React Native app, built with Expo, about one hard problem: **writing
something on a phone with no signal, and having it reach a server exactly once
when the signal comes back.**

It runs on iOS, Android and the web from one codebase. The web build is live, so
you can try the whole thing in a browser without installing anything.

**Live: [dispatch-offline.netlify.app](https://dispatch-offline.netlify.app)**

---

## Why this exists

I wrote it as a working answer to a job posting rather than a paragraph claiming
I could. It is a demo, not a product: there is no real backend, no accounts and
no store listing. What is real is the sync engine, and that is the part worth
reading.

## The idea

Pressing Publish is a **local commit**. It writes to an outbox on the device and
returns. It does not wait for a network, so it cannot fail because of one. There
is no spinner and no disabled state for being offline.

Everything after that is the engine's problem:

- Each dispatch gets an id the moment it is written. That id is also the
  **idempotency key** sent to the server, and it is never regenerated. The bug
  that posts a story twice is almost always a key that changed on retry.
- Retries use **exponential backoff with jitter**, capped at a minute. Jitter is
  not decoration: without it, every phone that lost signal in the same tunnel
  comes back and retries on the same millisecond.
- Failures are sorted into two kinds. A timeout is **retryable**. A dispatch the
  server will refuse forever is **blocked**, and it stops and asks a person
  instead of burning battery.
- One request is in flight at a time, so a reader sees a correspondent's
  dispatches in the order they were written rather than the order the network
  happened to deliver them.
- **An unanswered request is not a failed one.** If the app dies mid-send, we
  cannot know whether it landed. On restart anything that was in flight goes
  back in the queue and is sent again, which is safe only because the key never
  changed: a server that already has it answers "already had it" rather than
  filing a second copy. The app says so on the row when this happens, because it
  is the moment the whole design pays for itself.

## Try it

The network is a control rather than something that happens to you, on the
**Signal** tab. A reviewer in a browser cannot pull the SIM out of a laptop, so
the interesting failures would otherwise never show up.

1. Set **No signal**, then write two dispatches. Both commit instantly.
2. Set **Good signal**. They go out oldest first.
3. Set **Bad signal** (two seconds of latency, over half of requests dropped) and
   write a few more. Watch the attempt counts climb.
4. Keep going until a row says its first attempt had already reached the server.
   That is a lost reply, recovered rather than duplicated.
5. **Reload the page mid-send.** Anything in flight comes back as queued, not as
   lost, and not as a duplicate.

## How it is built

```
src/sync/
  types.ts       the domain, and the comments explaining why each field exists
  reducer.ts     pure: outbox + event -> outbox
  scheduler.ts   pure: outbox + clock + connection -> what to do next
  transport.ts   the simulated server, including its idempotency contract
  store.ts       the only file that touches storage, timers or the network
src/app/         three routes: Write, Filed, Signal
src/components/  the design system and the screens' parts
```

The split is the point. **The hard parts of offline sync are decisions, not IO**,
so the decisions live in two pure functions and are tested by calling them.
`store.ts` is the only place with a side effect in it.

React subscribes through `useSyncExternalStore`, so the engine keeps running
whether or not React is rendering, and there is exactly one of it.

### Tests

```
npm test
```

30 tests, named after the behaviour they protect rather than the function they
call:

```
writing is a local commit
the id is an idempotency key and never changes
an unanswered request is not a failed one
retryable and permanent failures are different things
one attempt at a time per dispatch
backoff grows, is capped, and is jittered
nothing is attempted while offline
order is preserved
the idempotency contract
a server that is restarted still remembers
failures the client has to tell apart
```

They cover the engine, not the screens. Rendering tests for this app would mostly
assert that React renders, which is not a risk I have; the risk is a dispatch
being filed twice, and that is what these cover.

The restart test is there because of a real bug. The stand-in server lived only
in memory, so reloading the page wiped its record of what it had seen. The
exactly-once guarantee quietly shrank to "within one session", and two different
dispatches came back holding the same server id. A real server would not forget,
so this one no longer does either.

## Design notes

The motion follows Apple's two spring parameters rather than mass and stiffness:
critically damped by default, with bounce reserved for motion a gesture actually
threw. Press feedback fires on press-in, not on release, because waiting for the
release is what makes an interface feel dead.

Status is never carried by colour alone. Every state ships a word and a glyph as
well, so it survives colourblindness and a black and white screenshot. Every
text colour clears WCAG AA against its own surface in both themes; I checked the
computed values in the browser rather than trusting the palette.

The translucent tab bar answers `prefers-reduced-transparency` (and iOS's Reduce
Transparency) by going solid. It is set from the component rather than from CSS,
because the web build's CSS minifier rewrites `backdrop-filter` to the `-webkit-`
form alone, which current Chrome ignores.

The web target is a single-page build. This is an application, not a content
site, so there is nothing here worth prerendering for a crawler, and the
prerender was costing a hydration mismatch.

One bug worth naming because it was invisible: a counter read `store.summary()`
during render. Under the React Compiler that memoizes against a store reference
which never changes, so it computed once and then reported zero for the rest of
the session while two dispatches sat on screen. Counts are now derived from the
snapshot the component already subscribes to.

## Running it

```bash
npm install
npm start          # then press i, a, or w
npm test
npm run typecheck
npm run build:web  # static bundle in dist/
```

## What is not here

Worth saying plainly, since this is a demo and not a product:

- **No real backend.** `transport.ts` is a server running in the app. It holds
  real state and enforces the idempotency contract, but it is not HTTP. Swapping
  it for a real client is one function's worth of work, which is the point of
  keeping it behind one.
- **No conflict resolution for edits.** Dispatches are append-only here. Two
  devices editing one draft offline is a harder problem and I have not solved it.
- **No background sync.** The engine runs while the app is open. Real delivery
  after the app is closed needs platform background tasks, which need a build
  and a device to test honestly.
- **Only run on the web so far.** The code targets iOS and Android, and the
  native tab bar is wired up for both, but the machine I wrote this on has no
  Xcode, so I have not built it for a simulator or a handset and I am not going
  to claim otherwise. Everything described above was verified in a browser
  against the production build.
- **No accounts, no media, no push.**

MIT.
