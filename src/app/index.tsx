import { StyleSheet, View } from 'react-native';

import { Composer } from '@/components/composer';
import { DispatchRow } from '@/components/dispatch-row';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useOutbox } from '@/hooks/use-outbox';
import { summarise } from '@/sync/scheduler';

export default function WriteScreen() {
  const { items, conditions, ready } = useOutbox();
  // Derived from the snapshot, not read back off the store. A store method
  // called during render memoizes against a store reference that never changes,
  // so under the React Compiler it computes once and then lies for the rest of
  // the session. Found this the only way anyone ever does: the counter said
  // zero with two dispatches on screen.
  const summary = summarise(items);

  // Newest first in the outbox: the thing you just wrote should be the thing you
  // see, without scrolling past everything you wrote before it.
  const outbox = [...items]
    .filter((d) => d.status !== 'published')
    .sort((a, b) => b.writtenAt - a.writtenAt);

  const recentlyPublished = [...items]
    .filter((d) => d.status === 'published')
    .sort((a, b) => b.writtenAt - a.writtenAt)
    .slice(0, 3);

  return (
    <Screen
      title="Write"
      subtitle={
        conditions.online
          ? 'Connected. Dispatches go out as you write them.'
          : 'No signal. Dispatches wait here and go out by themselves.'
      }>
      <Composer />

      {!ready && (
        <ThemedText type="caption" themeColor="textSecondary">
          Reading the outbox…
        </ThemedText>
      )}

      {outbox.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <ThemedText type="overline" themeColor="textSecondary">
              Outbox
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {summary.pending} waiting
              {summary.blocked > 0 ? `, ${summary.blocked} need you` : ''}
            </ThemedText>
          </View>
          {outbox.map((d) => (
            <DispatchRow key={d.id} dispatch={d} />
          ))}
        </View>
      )}

      {recentlyPublished.length > 0 && (
        <View style={styles.section}>
          <ThemedText type="overline" themeColor="textSecondary">
            Just filed
          </ThemedText>
          {recentlyPublished.map((d) => (
            <DispatchRow key={d.id} dispatch={d} />
          ))}
        </View>
      )}

      {ready && items.length === 0 && (
        <ThemedText type="callout" themeColor="textSecondary">
          Nothing written yet. Try turning the signal off on the Signal tab first,
          then writing something: it will queue here and send itself when you turn
          the signal back on.
        </ThemedText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
});
