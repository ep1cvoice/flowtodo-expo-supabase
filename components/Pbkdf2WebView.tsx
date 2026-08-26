import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import WebView from 'react-native-webview';

const CryptoWebView = WebView as React.ComponentType<Record<string, unknown>>;

const WEBVIEW_PBKDF2_TIMEOUT_MS = 15_000;

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <script>
    function base64ToUint8(base64) {
      const binary = window.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }

    function uint8ToBase64(bytes) {
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    }

    window.__pbkdf2 = async function (data) {
      try {
        const passwordBytes = new TextEncoder().encode(data.password);
        const saltBytes = base64ToUint8(data.saltBase64);
        const keyMaterial = await crypto.subtle.importKey(
          'raw', passwordBytes, 'PBKDF2', false, ['deriveBits']
        );
        const bits = await crypto.subtle.deriveBits(
          {
            name: 'PBKDF2',
            salt: saltBytes,
            iterations: data.iterations,
            hash: 'SHA-256'
          },
          keyMaterial,
          256
        );
        window.ReactNativeWebView.postMessage(JSON.stringify({
          id: data.id,
          success: true,
          keyBase64: uint8ToBase64(new Uint8Array(bits))
        }));
      } catch (err) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          id: data.id,
          success: false,
          error: err && err.message ? err.message : String(err)
        }));
      }
    };
  </script>
</head>
<body></body>
</html>
`;

export const Pbkdf2WebView = () => {
  const webViewRef = useRef<any>(null);
  const readyRef = useRef(false);
  const pendingRequests = useRef<Record<string, {
    resolve: (value: string) => void;
    reject: (err: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>>({});

  useEffect(() => {
    (global as { deriveKeyViaWebView?: typeof derive }).deriveKeyViaWebView = derive;

    function derive(password: string, saltBase64: string, iterations: number) {
      return new Promise<string>((resolve, reject) => {
        if (!readyRef.current || !webViewRef.current) {
          reject(new Error('WebView PBKDF2 is not ready'));
          return;
        }

        const id = `${Date.now()}-${Math.random()}`;
        const timer = setTimeout(() => {
          delete pendingRequests.current[id];
          reject(new Error('WebView PBKDF2 timed out'));
        }, WEBVIEW_PBKDF2_TIMEOUT_MS);

        pendingRequests.current[id] = { resolve, reject, timer };

        const payload = JSON.stringify({ id, password, saltBase64, iterations });
        webViewRef.current.injectJavaScript(
          `void window.__pbkdf2(${payload}); true;`
        );
      });
    }

    return () => {
      delete (global as { deriveKeyViaWebView?: unknown }).deriveKeyViaWebView;
      Object.values(pendingRequests.current).forEach((req) => {
        clearTimeout(req.timer);
        req.reject(new Error('WebView PBKDF2 unmounted'));
      });
      pendingRequests.current = {};
    };
  }, []);

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    let data: { id?: string; success?: boolean; keyBase64?: string; error?: string };
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    const pending = data.id ? pendingRequests.current[data.id] : undefined;
    if (!pending) return;

    clearTimeout(pending.timer);
    delete pendingRequests.current[data.id!];

    if (data.success && data.keyBase64) {
      pending.resolve(data.keyBase64);
    } else {
      pending.reject(new Error(data.error || 'WebView PBKDF2 failed'));
    }
  };

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0.01,
        overflow: 'hidden',
      }}>
      <CryptoWebView
        ref={webViewRef}
        source={{ html: htmlContent, baseUrl: 'https://localhost' }}
        onLoadEnd={() => {
          readyRef.current = true;
        }}
        onMessage={handleMessage}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        style={{ width: 1, height: 1 }}
      />
    </View>
  );
};
