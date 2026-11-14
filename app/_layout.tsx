import { Buffer } from 'buffer';
import ReconnectRefresh from '@/features/sync/ReconnectRefresh';
import { Pbkdf2WebView } from '@/core/auth/Pbkdf2WebView';
import AppSplash from '@/shared/ui/AppSplash';
import ToastHost from '@/shared/ui/ToastHost';
import { UnlockGate } from '@/core/auth/UnlockGate';
import { AuthProvider } from '@/core/auth/AuthContext';
import { EncryptionProvider } from '@/core/auth/EncryptionContext';
import { NetworkProvider } from '@/shared/providers/NetworkContext';
import { PomodoroProvider } from '@/features/pomodoro/PomodoroContext';
import { TasksProvider } from '@/features/tasks/TasksContext';
import { ThemeProvider, useTheme } from '@/shared/providers/ThemeContext';
import { ToastProvider } from '@/shared/providers/ToastContext';
import {
	Inter_400Regular,
	Inter_500Medium,
	Inter_600SemiBold,
	Inter_700Bold,
	useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const root = globalThis as typeof globalThis & { Buffer?: typeof Buffer };
if (typeof root.Buffer === 'undefined') {
	root.Buffer = Buffer;
}

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
	const [loaded, error] = useFonts({
		Inter_400Regular,
		Inter_500Medium,
		Inter_600SemiBold,
		Inter_700Bold,
	});

	useEffect(() => {
		if (error) throw error;
	}, [error]);

	useEffect(() => {
		if (loaded) SplashScreen.hideAsync();
	}, [loaded]);

	if (!loaded) return null;

	return (
		<GestureHandlerRootView style={styles.root}>
			<SafeAreaProvider>
				<NetworkProvider>
					<EncryptionProvider>
					<AuthProvider>
						<ThemeProvider>
							<Pbkdf2WebView />
							<UnlockGate>
								<ToastProvider>
									<TasksProvider>
										<PomodoroProvider>
											<ReconnectRefresh />
											<RootNavigation />
										</PomodoroProvider>
									</TasksProvider>
								</ToastProvider>
							</UnlockGate>
						</ThemeProvider>
					</AuthProvider>
					</EncryptionProvider>
				</NetworkProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}

function RootNavigation() {
	const { isDark } = useTheme();

	return (
		<View style={styles.root} collapsable={false}>
			<StatusBar style={isDark ? 'light' : 'dark'} />
			<View style={styles.stack} collapsable={false}>
				<Stack
					screenOptions={{
						headerShown: false,
						contentStyle: styles.screen,
					}}>
					<Stack.Screen name='index' />
					<Stack.Screen name='(auth)' />
					<Stack.Screen name='(main)' />
					<Stack.Screen name='+not-found' />
				</Stack>
			</View>
			<AppSplash />
			<ToastHost />
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		position: 'relative',
	},
	stack: {
		flex: 1,
	},
	screen: {
		flex: 1,
	},
});
