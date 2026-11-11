import { createContext, useContext } from 'react';
import { useSyncExternalStore } from 'react';

import type { OutboxStore } from '@/sync/store';

export const OutboxContext = createContext<OutboxStore | null>(null);

export function useOutboxStore(): OutboxStore {
  const store = useContext(OutboxContext);
  if (!store) throw new Error('useOutboxStore must be used inside OutboxContext');
  return store;
}

/**
 * useSyncExternalStore rather than useState plus an effect: the engine keeps
 * running whether or not React is rendering, and this is the subscription that
 * does not tear when it changes mid-render.
 */
export function useOutbox() {
  const store = useOutboxStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
