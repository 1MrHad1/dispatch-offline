import { useCallback } from 'react';
import { Pressable, type PressableProps, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Motion } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  style?: ViewStyle | ViewStyle[];
  /** How far it gives under a press. Larger surfaces move less. */
  depth?: number;
};

/**
 * Press feedback that happens on the press, not on the release.
 *
 * The scale is driven on press-in with a short timing curve rather than a
 * spring, because the point is to be felt immediately; the release is a spring,
 * because that is the part that should settle rather than snap. A press that is
 * dragged away and back cancels and restores on its own, since Pressable
 * reports both edges.
 */
export function PressableScale({ style, depth = 0.97, children, ...rest }: Props) {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();

  const onPressIn = useCallback(() => {
    scale.value = reduced ? 1 : withTiming(depth, { duration: Motion.pressMs });
  }, [depth, reduced, scale]);

  const onPressOut = useCallback(() => {
    scale.value = reduced ? 1 : withSpring(1, Motion.standard);
  }, [reduced, scale]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[style, animated]}
      {...rest}>
      {children as React.ReactNode}
    </AnimatedPressable>
  );
}
