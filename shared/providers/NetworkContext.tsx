import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

interface NetworkContextValue {
  isOnline: boolean;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

function resolveOnline(state: NetInfoState): boolean {
  if (state.isConnected == null) return true;
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let mounted = true;

    void NetInfo.fetch().then((state) => {
      if (mounted) setIsOnline(resolveOnline(state));
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(resolveOnline(state));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ isOnline }), [isOnline]);

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkContextValue {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork must be used within NetworkProvider');
  return ctx;
}

export function useOnReconnect(callback: () => void) {
  const { isOnline } = useNetwork();
  const wasOnlineRef = useRef(isOnline);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const wasOnline = wasOnlineRef.current;
    wasOnlineRef.current = isOnline;
    if (!wasOnline && isOnline) {
      callbackRef.current();
    }
  }, [isOnline]);
}
