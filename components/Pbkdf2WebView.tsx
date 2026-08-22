import React, { useRef, useEffect } from 'react';
import { View } from 'react-native';
import WebView from 'react-native-webview';

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <script>
    // Konwersja Base64 na Uint8Array
    function base64ToUint8(base64) {
      const binary = window.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }

    // Konwersja Uint8Array na Base64
    function uint8ToBase64(bytes) {
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    }

    document.addEventListener('message', async function(event) {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'DERIVE_KEY') {
          const passwordBytes = new TextEncoder().encode(data.password);
          const saltBytes = base64ToUint8(data.saltBase64);

          // Import hasła (jak w crypto.web.ts)
          const keyMaterial = await crypto.subtle.importKey(
            'raw', passwordBytes, 'PBKDF2', false, ['deriveBits']
          );

          // Obliczanie klucza (DEK_BYTES * 8 = 256 bitów)
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

          // Wysłanie wyniku z powrotem
          const resultBase64 = uint8ToBase64(new Uint8Array(bits));
          window.ReactNativeWebView.postMessage(JSON.stringify({
            id: data.id,
            success: true,
            keyBase64: resultBase64
          }));
        }
      } catch(err) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          id: JSON.parse(event.data).id,
          success: false,
          error: err.message
        }));
      }
    });
  </script>
</head>
<body></body>
</html>
`;

export const Pbkdf2WebView = () => {
  const webViewRef = useRef<any>(null);
  const pendingRequests = useRef<Record<string, {resolve: Function, reject: Function}>>({});

  useEffect(() => {
    // Rejestrujemy funkcję w obiekcie global, aby plik crypto.native.ts mógł jej łatwo użyć
    (global as any).deriveKeyViaWebView = (password: string, saltBase64: string, iterations: number) => {
      return new Promise((resolve, reject) => {
        const id = Date.now().toString() + Math.random().toString();
        pendingRequests.current[id] = { resolve, reject };

        const message = JSON.stringify({
          id,
          type: 'DERIVE_KEY',
          password,
          saltBase64,
          iterations
        });

        webViewRef.current?.injectJavaScript(`
          document.dispatchEvent(new MessageEvent('message', {data: ${JSON.stringify(message)}}));
          true;
        `);
      });
    };

    return () => {
      delete (global as any).deriveKeyViaWebView;
    };
  }, []);

  const handleMessage = (event: any) => {
    const data = JSON.parse(event.nativeEvent.data);
    const promiseHooks = pendingRequests.current[data.id];

    if (promiseHooks) {
      if (data.success) {
        promiseHooks.resolve(data.keyBase64);
      } else {
        promiseHooks.reject(new Error(data.error));
      }
      delete pendingRequests.current[data.id];
    }
  };

  return (
    <View style={{ width: 0, height: 0, display: 'none' }}>
      <WebView
        ref={webViewRef}
        // TUTAJ DODAJEMY baseUrl:
        source={{ html: htmlContent, baseUrl: 'https://localhost' }}
        onMessage={handleMessage}
        originWhitelist={['*']}
        javaScriptEnabled={true}
      />
    </View>
  );
};
