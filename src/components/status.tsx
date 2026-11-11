import { StyleSheet, View } from 'react-native';

import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DispatchStatus } from '@/sync/types';

import { ThemedText } from './themed-text';

/**
 * One place that decides how a status looks and reads.
 *
 * Each status carries a word and a glyph as well as a colour, so the state is
 * still legible to someone who cannot tell these four hues apart, and still
 * legible in a screenshot printed in black and white.
 */
const presentation: Record<
  DispatchStatus,
  { label: string; glyph: string; tone: ThemeColor; surface: ThemeColor }
> = {
  queued: { label: 'Queued', glyph: '⋯', tone: 'waiting', surface: 'waitingSurface' },
  sending: { label: 'Sending', glyph: '↑', tone: 'active', surface: 'activeSurface' },
  published: { label: 'Published', glyph: '✓', tone: 'done', surface: 'doneSurface' },
  blocked: { label: 'Needs you', glyph: '!', tone: 'stuck', surface: 'stuckSurface' },
};

export function statusLabel(status: DispatchStatus) {
  return presentation[status].label;
}

export function StatusPill({ status }: { status: DispatchStatus }) {
  const theme = useTheme();
  const { label, glyph, tone, surface } = presentation[status];

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[styles.pill, { backgroundColor: theme[surface] }]}>
      <ThemedText type="caption" themeColor={tone} style={styles.glyph}>
        {glyph}
      </ThemedText>
      <ThemedText type="caption" themeColor={tone} style={styles.label}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two + 2,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
  glyph: { fontWeight: '700' },
  label: { fontWeight: '600' },
});
