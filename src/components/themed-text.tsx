import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Type scale.
 *
 * Tracking is set per size rather than once for the whole app: large text reads
 * too loose at the tracking that keeps small text legible, so the display sizes
 * are tightened and the small ones are opened up. Leading moves the other way,
 * tight on the big sizes and generous on body copy.
 *
 * React Native takes letterSpacing in points, so these are the point equivalents
 * of roughly -0.02em at the top of the scale and +0.02em at the bottom.
 */
export type TextRole =
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'callout'
  | 'caption'
  | 'overline'
  | 'mono';

export type ThemedTextProps = TextProps & {
  type?: TextRole;
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'body', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  display: { fontSize: 34, lineHeight: 38, fontWeight: '700', letterSpacing: -0.7 },
  title: { fontSize: 24, lineHeight: 29, fontWeight: '700', letterSpacing: -0.4 },
  heading: { fontSize: 18, lineHeight: 23, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400', letterSpacing: 0 },
  callout: { fontSize: 15, lineHeight: 21, fontWeight: '500', letterSpacing: 0 },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500', letterSpacing: 0.1 },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  mono: { fontFamily: Fonts.mono, fontSize: 12, lineHeight: 16, letterSpacing: 0 },
});
