import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, ReduceMotion } from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { useOutboxStore } from '@/hooks/use-outbox';
import { useTheme } from '@/hooks/use-theme';
import type { Dispatch } from '@/sync/types';

import { PressableScale } from './pressable-scale';
import { StatusPill } from './status';
import { ThemedText } from './themed-text';

/**
 * One row of the outbox.
 *
 * It shows the attempt count and the reason, not a spinner. A writer standing
 * in a field with one bar does not need reassurance, they need to know whether
 * the thing they wrote is still going to arrive, and roughly when.
 */
export function DispatchRow({ dispatch }: { dispatch: Dispatch }) {
  const theme = useTheme();
  const store = useOutboxStore();

  return (
    <Animated.View
      entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}
      layout={LinearTransition.springify()
        .damping(22)
        .stiffness(220)
        .reduceMotion(ReduceMotion.System)}
      style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.top}>
        <ThemedText type="heading" numberOfLines={2} style={styles.headline}>
          {dispatch.headline}
        </ThemedText>
        <StatusPill status={dispatch.status} />
      </View>

      {dispatch.body.length > 0 && (
        <ThemedText type="callout" themeColor="textSecondary" numberOfLines={2}>
          {dispatch.body}
        </ThemedText>
      )}

      <View style={styles.meta}>
        {dispatch.location && (
          <ThemedText type="caption" themeColor="textSecondary">
            {dispatch.location}
          </ThemedText>
        )}
        <ThemedText type="mono" themeColor="textSecondary">
          {dispatch.serverId ?? dispatch.id.slice(0, 12)}
        </ThemedText>
      </View>

      {dispatch.attempts > 1 && dispatch.status !== 'published' && (
        <ThemedText type="caption" themeColor="textSecondary">
          {dispatch.attempts} attempts. Still trying.
        </ThemedText>
      )}

      {/* The moment the idempotency key earns its place, said out loud. */}
      {dispatch.recoveredFromLostReply && (
        <ThemedText type="caption" themeColor="done">
          The first attempt had already reached the server. Asking again returned
          the same dispatch instead of posting a second one.
        </ThemedText>
      )}

      {dispatch.status === 'blocked' && (
        <View style={styles.blocked}>
          <ThemedText type="caption" themeColor="stuck" style={styles.problem}>
            {dispatch.problem}
          </ThemedText>
          <PressableScale
            onPress={() => store.retry(dispatch.id)}
            accessibilityRole="button"
            accessibilityLabel={`Try ${dispatch.headline} again`}
            style={[styles.action, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="caption" style={styles.actionLabel}>
              Try again
            </ThemedText>
          </PressableScale>
          <PressableScale
            onPress={() => store.discard(dispatch.id)}
            accessibilityRole="button"
            accessibilityLabel={`Discard ${dispatch.headline}`}
            style={[styles.action, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="caption" style={styles.actionLabel}>
              Discard
            </ThemedText>
          </PressableScale>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  headline: { flex: 1 },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  blocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
    marginTop: Spacing.one,
  },
  problem: { flex: 1, minWidth: 160 },
  action: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    minHeight: 44,
    justifyContent: 'center',
  },
  actionLabel: { fontWeight: '600' },
});
