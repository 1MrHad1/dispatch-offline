import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AppTabs from '@/components/app-tabs';
import { OutboxContext } from '@/hooks/use-outbox';
import { OutboxStore } from '@/sync/store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // One store for the life of the app. It owns the timers, so a second one would
  // mean two engines racing over the same outbox.
  const store = useMemo(() => new OutboxStore(), []);

  useEffect(() => {
    void store.start().finally(() => SplashScreen.hideAsync());
    return () => store.stop();
  }, [store]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <OutboxContext.Provider value={store}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AppTabs />
        </ThemeProvider>
      </OutboxContext.Provider>
    </GestureHandlerRootView>
  );
}
