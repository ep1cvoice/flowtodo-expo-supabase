import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

/** Unknown connectivity counts as online, so we never block on a missing signal. */
export function resolveOnline(state: NetInfoState): boolean {
  if (state.isConnected == null) return true;
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

/** Quick connectivity check for startup paths; resolves to "online" if NetInfo is slow. */
export async function isOnlineNow(timeoutMs = 1500): Promise<boolean> {
  try {
    const state = await Promise.race([
      NetInfo.fetch(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    return state ? resolveOnline(state) : true;
  } catch {
    return true;
  }
}
