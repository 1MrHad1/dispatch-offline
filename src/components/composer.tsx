import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useOutbox, useOutboxStore } from '@/hooks/use-outbox';
import { useTheme } from '@/hooks/use-theme';

import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

/**
 * The composer.
 *
 * The button label changes with the connection, because the two outcomes are
 * genuinely different and the writer deserves to know which one they are about
 * to get. Promising "Publish" with no signal and then silently queuing is the
 * kind of small lie that costs trust the first time someone notices.
 *
 * What does not change is that pressing it always works. There is no disabled
 * state for being offline, and no spinner: the commit is local.
 */
export function Composer() {
  const store = useOutboxStore();
  const { conditions } = useOutbox();
  const theme = useTheme();

  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [location, setLocation] = useState('');

  const ready = headline.trim().length > 0;

  function publish() {
    if (!ready) return;
    store.write({
      headline: headline.trim(),
      body: body.trim(),
      location: location.trim() || null,
    });
    setHeadline('');
    setBody('');
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <TextInput
        value={headline}
        onChangeText={setHeadline}
        placeholder="Headline"
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Headline"
        style={[styles.headline, { color: theme.text }]}
        returnKeyType="next"
      />

      <View style={[styles.rule, { backgroundColor: theme.hairline }]} />

      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="What is happening?"
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Dispatch body"
        multiline
        style={[styles.body, { color: theme.text }]}
      />

      <TextInput
        value={location}
        onChangeText={setLocation}
        placeholder="Location (optional)"
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Location, optional"
        style={[styles.location, { color: theme.textSecondary }]}
      />

      <View style={styles.footer}>
        {/* Inline, next to the control it is about, rather than collected in a
            summary somewhere above. */}
        <ThemedText type="caption" themeColor="textSecondary" style={styles.hint}>
          {ready
            ? conditions.online
              ? 'Goes out now.'
              : 'Saved on this device. It goes out by itself when you have signal.'
            : 'A dispatch needs a headline.'}
        </ThemedText>

        <PressableScale
          onPress={publish}
          disabled={!ready}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
          accessibilityLabel={conditions.online ? 'Publish' : 'Queue for when you are back'}
          style={[
            styles.button,
            { backgroundColor: ready ? theme.text : theme.backgroundSelected },
          ]}>
          <ThemedText
            type="callout"
            style={[
              styles.buttonLabel,
              { color: ready ? theme.background : theme.textSecondary },
            ]}>
            {conditions.online ? 'Publish' : 'Queue it'}
          </ThemedText>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  headline: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
    paddingVertical: Spacing.one,
  },
  rule: { height: StyleSheet.hairlineWidth },
  body: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 96,
    paddingVertical: Spacing.one,
    textAlignVertical: 'top',
  },
  location: { fontSize: 14, lineHeight: 20, paddingVertical: Spacing.one },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  hint: { flex: 1 },
  button: {
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonLabel: { fontWeight: '600' },
});
