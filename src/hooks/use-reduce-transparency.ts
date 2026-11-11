import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether the person has asked for less translucency.
 *
 * iOS exposes this through AccessibilityInfo ("Reduce Transparency" in
 * Accessibility settings). The web spells the same preference
 * prefers-reduced-transparency. Android has no equivalent, so it stays false.
 *
 * This is a hook rather than a CSS media query because the material is set from
 * the style prop: the CSS minifier in the web build rewrites backdrop-filter to
 * the -webkit- form alone, which current Chrome ignores, so a stylesheet is not
 * a reliable place to put it.
 */
export function useReduceTransparency(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceTransparencyEnabled?.()
      .then((value) => {
        if (!cancelled) setReduce(value);
      })
      .catch(() => {
        // Not implemented on this platform. False is the right answer there.
      });

    const subscription = AccessibilityInfo.addEventListener?.(
      'reduceTransparencyChanged',
      setReduce,
    );

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return reduce;
}
