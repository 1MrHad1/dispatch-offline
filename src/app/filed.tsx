import { StyleSheet, View } from 'react-native';

import { DispatchRow } from '@/components/dispatch-row';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useOutbox } from '@/hooks/use-outbox';

/**
 * What the server has confirmed.
 *
 * This list is read from the device, not from the network, which is why it is
 * still here with the signal off. A feed that empties when the connection drops
 * is a feed that is useless in exactly the moment it is needed.
 */
export default function FiledScreen() {
  const { items } = useOutbox();

  const filed = items
    .filter((d) => d.status === 'published')
    .sort((a, b) => b.writtenAt - a.writtenAt);

  const recovered = filed.filter((d) => d.recoveredFromLostReply).length;

  return (
    <Screen
      title="Filed"
      subtitle={
        filed.length === 0
          ? 'Nothing has reached the server yet.'
          : `${filed.length} confirmed. Stored on this device, so it reads with no signal.`
      }>
      {recovered > 0 && (
        <View style={styles.note}>
          <ThemedText type="caption" themeColor="textSecondary">
            {recovered === 1 ? 'One of these' : `${recovered} of these`} reached the
            server on an attempt whose reply was lost. Asking again with the same
            key returned the original instead of filing a duplicate.
          </ThemedText>
        </View>
      )}

      {filed.map((d) => (
        <DispatchRow key={d.id} dispatch={d} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { gap: Spacing.one },
});
