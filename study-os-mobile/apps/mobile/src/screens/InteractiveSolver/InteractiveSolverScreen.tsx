import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { supabase, SUPABASE_URL } from '../../config/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../ui/tokens';
import { bundledSolverCss } from './solverStyles';

// Lazy-load so app starts even if native module isn't linked (requires rebuild)
function getWebView(): React.ComponentType<any> | null {
  try {
    const { WebView } = require('react-native-webview');
    return WebView;
  } catch {
    return null;
  }
}

interface InteractiveSolverScreenProps {
  route: {
    params: {
      lessonId: string;
      lessonTitle: string;
    };
  };
  navigation: any;
}

export const InteractiveSolverScreen: React.FC<InteractiveSolverScreenProps> = ({
  route,
  navigation,
}) => {
  const { lessonId, lessonTitle } = route.params;
  const insets = useSafeAreaInsets();
  // Native header approximate height to offset HTML content
  const headerHeight = 60 + insets.top;
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [WebViewComponent, setWebViewComponent] = useState<React.ComponentType<any> | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [htmlError, setHtmlError] = useState<string | null>(null);
  const headerTranslate = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const HEADER_HIDE_THRESHOLD = 60;

  const onWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'scroll' && typeof data.y === 'number') {
        const y = data.y;
        if (Math.abs(y - lastScrollY.current) < 5) return;
        lastScrollY.current = y;
        const headerHeight = 60 + insets.top;
        Animated.timing(headerTranslate, {
          toValue: y > HEADER_HIDE_THRESHOLD ? -headerHeight : 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    } catch (_) {}
  };

  const scrollReporterScript = `
(function(){
  var last = 0, t;
  function report() {
    var y = window.scrollY || window.pageYOffset || 0;
    if (Math.abs(y - last) < 8) return;
    last = y;
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'scroll', y: y }));
  }
  window.addEventListener('scroll', function() {
    if (t) return;
    t = setTimeout(function() { t = null; report(); }, 80);
  }, { passive: true });
  report();
})();
true;
`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.access_token) {
          setToken(session.access_token);
        } else {
          setError('Not signed in');
        }
      } catch (e) {
        if (!cancelled) setError('Failed to get session');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const viewerUrl = null;
  const hasViewer = true; // Always true as we bundle the solver
  const uri = 'bundled'; // Dummy URI to trigger effect

  // Base URL for solver (folder so relative assets like homework-app.js resolve correctly)
  const solverBaseUrl = SUPABASE_URL;

  const injectToken = token
    ? `(function(){ window.__SUPABASE_TOKEN__ = ${JSON.stringify(token)}; window.__SUPABASE_URL__ = ${JSON.stringify(SUPABASE_URL)}; window.__LESSON_ID__ = ${JSON.stringify(lessonId)}; })(); true;`
    : '';

  // Get Gemini API key from env (EXPO_PUBLIC_ prefix is standard for Expo)
  const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

  // Fetch HTML, CSS, and homework-app.js from bundled assets
  useEffect(() => {
    if (!token || htmlContent !== null || htmlError !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const loadAsset = async (module: any) => {
          const asset = Asset.fromModule(module);
          await asset.downloadAsync();
          return await FileSystem.readAsStringAsync(asset.localUri || asset.uri);
        };

        const [htmlText, cssText, jsText] = await Promise.all([
          loadAsset(require('../../assets/solver/solver.html.txt')),
          loadAsset(require('../../assets/solver/homework-styles.css.txt')),
          loadAsset(require('../../assets/solver/homework-app.js.txt')),
        ]);

        if (cancelled) return;

        let inlined = htmlText.replace(
          /<link\s+rel="stylesheet"\s+href="homework-styles\.css[^"]*"\s*\/?>/i,
          `<style>${cssText.replace(/<\/style>/gi, '')}</style>`,
        );
        
        // Inline homework-app.js
        if (jsText) {
          const escapedAppJs = jsText.replace(/<\/script>/gi, '<\\/script>');
          inlined = inlined.replace(
            /<script\s+src="homework-app\.js[^"]*"\s*><\/script>/i,
            `<script>${escapedAppJs}</script>`,
          );
        }
        const injectScript = `<script>(function(){window.__SUPABASE_TOKEN__=${JSON.stringify(token)};window.__SUPABASE_URL__=${JSON.stringify(SUPABASE_URL)};window.__LESSON_ID__=${JSON.stringify(lessonId)};})();<\/script>`;
        // Inject top padding to avoid overlap with native header
        // Use a larger offset (header height + 20px buffer)
        // Also add mobile-specific layout overrides to move nav to bottom and fix chatbot overlap
        const styleInjection = `<style>
          body { padding-top: ${headerHeight + 20}px !important; padding-bottom: 80px !important; }
          .question-nav { 
            border-bottom: none !important; 
            margin-bottom: 0 !important; 
            padding-bottom: 0 !important;
          }
          .question-nav-buttons {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            background: var(--bg-primary) !important;
            padding: 16px !important;
            border-top: 1px solid var(--border) !important;
            display: flex !important;
            justify-content: space-between !important;
            z-index: 1000 !important;
            box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1) !important;
          }
          .question-nav-btn {
            flex: 1 !important;
            padding: 12px !important;
            font-size: 16px !important;
            margin: 0 4px !important;
          }
          .question-nav-info {
            justify-content: center !important;
            width: 100% !important;
            margin-bottom: 10px !important;
          }
          /* Fix Chatbot for Mobile */
          .chatbot-container {
            bottom: 90px !important; /* Above nav bar */
            right: 16px !important;
            z-index: 2000 !important;
          }
          .chatbot-panel {
            position: fixed !important;
            bottom: 90px !important;
            right: 16px !important;
            left: 16px !important;
            width: auto !important;
            height: auto !important;
            max-height: 50vh !important;
            border-radius: 12px !important;
            display: none; /* Hidden by default, toggled by JS */
            flex-direction: column !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2) !important;
          }
          .chatbot-panel.open {
            display: flex !important;
          }
          .chatbot-messages {
            max-height: 250px !important;
            flex: 1 !important;
          }
        </style>`;
        
        inlined = inlined.replace(/<head\s*>/i, '<head>' + injectScript + styleInjection);
        // Inject Gemini API Key into meta tag
        if (geminiApiKey) {
          inlined = inlined.replace(
            /<meta\s+name="gemini-api-key"\s+content="[^"]*"/i,
            `<meta name="gemini-api-key" content="${geminiApiKey}"`
          );
        }
        setHtmlContent(inlined);
      } catch (e) {
        console.error('Failed to load bundled solver:', e);
        if (!cancelled) setHtmlError('Failed to load solver assets');
      }
    })();
    return () => { cancelled = true; };
  }, [token, htmlContent, htmlError, headerHeight, geminiApiKey]);

  // Load WebView only when we need it (avoids crash at startup if native module not linked)
  useEffect(() => {
    if (hasViewer && token && !WebViewComponent) {
      const W = getWebView();
      setWebViewComponent(W);
    }
  }, [hasViewer, token, WebViewComponent]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
          <Text style={styles.message}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !token) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{lessonTitle}</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.message}>{error || 'Not signed in'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasViewer) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>Solver</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.message}>
            Solver viewer URL not configured. Set SOLVER_VIEWER_URL in config (e.g. Supabase Storage public URL with solver.html).
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Native WebView module not linked — show message and ask for rebuild
  if (hasViewer && token && !WebViewComponent) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{lessonTitle}</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.message}>
            Interact requires a native rebuild. From the project folder run: npm run ios
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (htmlError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{lessonTitle}</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.message}>{htmlError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!WebViewComponent || !htmlContent) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
          <Text style={styles.message}>Loading solver...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Load as HTML with baseUrl so it always renders (avoids wrong Content-Type from storage)
  const baseUrlWithQuery = solverBaseUrl;

  return (
    <View style={styles.fullScreen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <Animated.View
        style={[
          styles.header,
          { paddingTop: 12 + insets.top, transform: [{ translateY: headerTranslate }] },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{lessonTitle}</Text>
      </Animated.View>
      <View style={styles.web}>
        <WebViewComponent
          source={{
            html: htmlContent,
            baseUrl: baseUrlWithQuery,
          }}
          injectedJavaScriptBeforeDocumentLoaded={injectToken}
          injectedJavaScript={scrollReporterScript}
          onMessage={onWebViewMessage}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['https://*', 'http://*', 'file://*', 'data:*', 'about:*']}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: colors.background,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    color: colors.textPrimary,
  },
  web: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
    marginTop: 0,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
