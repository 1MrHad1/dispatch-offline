import {
  TabList,
  TabSlot,
  TabTrigger,
  Tabs,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useReduceTransparency } from '@/hooks/use-reduce-transparency';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

/**
 * The web tab bar.
 *
 * It sits at the bottom, floating, with content scrolling underneath rather
 * than inside a shortened window. That is the Apple pattern for app chrome and
 * the honest one here: this is an app that also runs in a browser.
 *
 * TabList's asChild clones its child and hands it the routing props, including
 * a style of its own. So the child has to be a component that spreads those
 * props onto an outer view and puts the styled bar inside it. Passing a styled
 * View straight to asChild loses the style to the clone, which is a quiet
 * failure: the tabs still render, they just stop working.
 */
export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <GlassTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>Write</TabButton>
          </TabTrigger>
          <TabTrigger name="filed" href="/filed" asChild>
            <TabButton>Filed</TabButton>
          </TabTrigger>
          <TabTrigger name="signal" href="/signal" asChild>
            <TabButton>Signal</TabButton>
          </TabTrigger>
        </GlassTabList>
      </TabList>
    </Tabs>
  );
}

function GlassTabList(props: TabListProps) {
  const theme = useTheme();
  const reduceTransparency = useReduceTransparency();

  return (
    <View {...props} style={styles.dock} pointerEvents="box-none">
      <View
        style={[
          styles.bar,
          // A heavier surface and no blur when the person asked for less
          // translucency. Frosted chrome is a nice-to-have; legibility is not.
          reduceTransparency
            ? { backgroundColor: theme.backgroundElement }
            : { backgroundColor: theme.backgroundElement + 'D9', backdropFilter: 'blur(24px) saturate(180%)' },
        ]}>
        {props.children}
      </View>
    </View>
  );
}

function TabButton({ children, isFocused, ref, ...props }: TabTriggerSlotProps) {
  const theme = useTheme();

  return (
    <Pressable
      {...props}
      // expo-router types this slot's ref as Ref<View> while Pressable now wants
      // Ref<ReactNativeElement>. Same object at runtime; the two packages just
      // disagree on the name since React Native 0.88.
      ref={ref as React.ComponentProps<typeof Pressable>['ref']}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      style={({ pressed }) => [
        styles.tab,
        { backgroundColor: isFocused ? theme.backgroundSelected : 'transparent' },
        // Feedback on the press, not on the release.
        pressed && styles.pressed,
      ]}>
      <ThemedText type="callout" themeColor={isFocused ? 'text' : 'textSecondary'}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { height: '100%' },
  dock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    padding: Spacing.three,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    padding: Spacing.one + 2,
    borderRadius: Radius.pill,
    width: '100%',
    maxWidth: MaxContentWidth / 1.6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    // A comfortable target on a phone, which the web build also runs on.
    minHeight: 44,
  },
  pressed: { opacity: 0.65 },
});
