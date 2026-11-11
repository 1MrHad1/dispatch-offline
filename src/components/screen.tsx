import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

/**
 * Content scrolls under the floating tab bar rather than inside a shortened
 * window, so the bar reads as a layer above the page. The padding at the end of
 * the scroll is what keeps the last row from hiding beneath it, which is the
 * bug that pattern creates if you forget.
 */
export function Screen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + 120 },
      ]}
      keyboardShouldPersistTaps="handled">
      <View style={styles.column}>
        <View style={styles.header}>
          <ThemedText type="display">{title}</ThemedText>
          {subtitle && (
            <ThemedText type="callout" themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          )}
        </View>
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  header: { gap: Spacing.one },
});
