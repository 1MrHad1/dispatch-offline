import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

/**
 * Native tabs, so iOS gets a real UITabBar and Android a real bottom bar,
 * including the system material behind them. The web build has its own tab bar
 * in app-tabs.web.tsx; the platform extension is how one codebase gives each
 * platform the chrome its users already know.
 *
 * Tab names say what is behind them rather than reaching for an umbrella word.
 * "Write", "Filed" and "Signal" are each a promise about the contents.
 */
export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Write</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'square.and.pencil', selected: 'square.and.pencil' }}
          md="edit"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="filed">
        <NativeTabs.Trigger.Label>Filed</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'newspaper', selected: 'newspaper.fill' }}
          md="newspaper"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="signal">
        <NativeTabs.Trigger.Label>Signal</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{
            default: 'antenna.radiowaves.left.and.right',
            selected: 'antenna.radiowaves.left.and.right',
          }}
          md="network_check"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
