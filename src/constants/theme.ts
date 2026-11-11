/**
 * Design tokens.
 *
 * Two rules this file exists to enforce. Status is never carried by colour
 * alone, because a reader who cannot separate amber from green still has to be
 * able to tell a queued dispatch from a published one; every status ships a
 * word and a glyph alongside its colour. And every text colour here clears
 * WCAG AA against the surface it is used on, in both themes.
 */

import '@/global.css';

import { Platform } from 'react-native';

const palette = {
  light: {
    text: '#11131A',
    textSecondary: '#5A6072',
    background: '#FFFFFF',
    backgroundElement: '#F2F3F6',
    backgroundSelected: '#E3E5EB',
    hairline: '#DCDEE5',
    /** Queued: waiting, nobody's fault. */
    waiting: '#8A5A00',
    waitingSurface: '#FDF3DF',
    /** In flight. */
    active: '#0B5BD3',
    activeSurface: '#E6EEFC',
    /** The server has it. */
    done: '#0E6A3E',
    doneSurface: '#E2F3EA',
    /** Needs a person. */
    stuck: '#B3261E',
    stuckSurface: '#FCE9E7',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#A0A6B4',
    background: '#000000',
    backgroundElement: '#16181D',
    backgroundSelected: '#23262E',
    hairline: '#2A2E37',
    waiting: '#F5BE5A',
    waitingSurface: '#2A2110',
    active: '#7AB4FF',
    activeSurface: '#0F1C2E',
    done: '#5FD39A',
    doneSurface: '#0D2419',
    stuck: '#FF8A80',
    stuckSurface: '#2B1310',
  },
} as const;

export const Colors = palette;

export type ThemeColor = keyof typeof palette.light & keyof typeof palette.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
})!;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 8,
  medium: 14,
  large: 22,
  pill: 999,
} as const;

/**
 * Springs, in Apple's two parameters rather than mass/stiffness/damping.
 * Default to no overshoot. Bounce is reserved for motion a gesture threw, which
 * in this app means the sheet, and nothing else.
 */
export const Motion = {
  /** Reposition, state change, anything the user did not fling. */
  standard: { damping: 1, stiffness: 220, mass: 1 },
  /** Sheets and anything a drag released. */
  thrown: { damping: 0.82, stiffness: 260, mass: 1 },
  /** Press feedback has to be felt, not watched. */
  pressMs: 90,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 720;
