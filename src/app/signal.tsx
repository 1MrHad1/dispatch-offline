import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useOutbox, useOutboxStore } from '@/hooks/use-outbox';
import { useTheme } from '@/hooks/use-theme';
import { summarise } from '@/sync/scheduler';
import { BAD_SIGNAL, GOOD_SIGNAL, NO_SIGNAL, type Conditions } from '@/sync/transport';

const presets: { conditions: Conditions; label: string; detail: string }[] = [
  {
    conditions: GOOD_SIGNAL,
    label: 'Good signal',
    detail: 'Everything arrives, in about a third of a second.',
  },
  {
    conditions: BAD_SIGNAL,
    label: 'Bad signal',
    detail:
      'Two seconds of latency. Over half of requests never arrive, and a quarter of the ones that do arrive have their reply lost on the way back.',
  },
  {
    conditions: NO_SIGNAL,
    label: 'No signal',
    detail: 'Nothing leaves the device. Writing still works.',
  },
];

/**
 * The network, as a control rather than something that happens to you.
 *
 * A reviewer opening this in a browser cannot pull the SIM out of their laptop,
 * so the interesting failures would never show up. Putting the conditions on a
 * screen makes the behaviour that matters reproducible in ten seconds.
 */
export default function SignalScreen() {
  const store = useOutboxStore();
  const { items, conditions } = useOutbox();
  const theme = useTheme();
  const summary = summarise(items);

  return (
    <Screen title="Signal" subtitle="Set the conditions, then go and write something.">
      <View style={styles.group} accessibilityRole="radiogroup">
        {presets.map(({ conditions: preset, label, detail }) => {
          const selected = conditions.name === preset.name;
          return (
            <PressableScale
              key={preset.name}
              depth={0.985}
              onPress={() => store.setConditions(preset)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={label}
              accessibilityHint={detail}
              style={[
                styles.option,
                {
                  backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
                  borderColor: selected ? theme.text : 'transparent',
                },
              ]}>
              <View style={styles.optionHead}>
                <ThemedText type="heading">{label}</ThemedText>
                {selected && (
                  <ThemedText type="caption" themeColor="done" style={styles.on}>
                    ✓ On
                  </ThemedText>
                )}
              </View>
              <ThemedText type="caption" themeColor="textSecondary">
                {detail}
              </ThemedText>
            </PressableScale>
          );
        })}
      </View>

      <View style={[styles.panel, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="overline" themeColor="textSecondary">
          Right now
        </ThemedText>
        <ThemedText type="body">
          {summary.pending === 0
            ? 'Nothing is waiting.'
            : `${summary.pending} waiting, ${summary.sending} in flight.`}
          {summary.blocked > 0 ? ` ${summary.blocked} need a decision.` : ''}
        </ThemedText>
      </View>

      <View style={[styles.panel, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="overline" themeColor="textSecondary">
          What to try
        </ThemedText>
        <Step n={1} text="Set No signal, then write two dispatches. Both commit instantly." />
        <Step n={2} text="Set Good signal. They go out oldest first, in the order you wrote them." />
        <Step
          n={3}
          text="Set Bad signal and write a few more. Watch the attempt counts climb and the backoff spread the retries out."
        />
        <Step
          n={4}
          text="Keep going on Bad signal until a dispatch says its first attempt had already reached the server. That is a lost reply, recovered by the idempotency key rather than filed twice."
        />
        <Step
          n={5}
          text="Reload the page mid-send. Anything in flight comes back as queued, not as lost, and not as a duplicate."
        />
      </View>
    </Screen>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.step}>
      <View style={[styles.stepNumber, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText type="caption" style={styles.stepNumberLabel}>
          {n}
        </ThemedText>
      </View>
      <ThemedText type="callout" themeColor="textSecondary" style={styles.stepText}>
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two },
  option: {
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.one,
    borderWidth: 1.5,
  },
  optionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  on: { fontWeight: '700' },
  panel: {
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  step: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberLabel: { fontWeight: '700' },
  stepText: { flex: 1 },
});
