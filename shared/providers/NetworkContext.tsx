import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import NetInfo from '@react-native-community/netinfo';
import { setKnownOnline } from '@/shared/lib/connectivity';
import { resolveOnline } from '@/shared/lib/netState';

interface NetworkContextValue {
  isOnline: boolean;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let mounted = true;

    void NetInfo.fetch().then((state) => {
      setKnownOnline(resolveOnline(state));
      if (mounted) setIsOnline(resolveOnline(state));
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      setKnownOnline(resolveOnline(state));
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
  // Always calls the latest callback without re-running the effect when it changes.
  const onReconnect = useEffectEvent(callback);

  useEffect(() => {
    const wasOnline = wasOnlineRef.current;
    wasOnlineRef.current = isOnline;
    if (!wasOnline && isOnline) {
      onReconnect();
    }
  }, [isOnline]);
}
