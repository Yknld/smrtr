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
import { supabase, SUPABASE_URL, SOLVER_VIEWER_URL } from '../../config/supabase';
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
        const headerHeight = 52 + insets.top;
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

  const viewerUrl = SOLVER_VIEWER_URL?.trim();
  const hasViewer = !!viewerUrl;
  const uri = hasViewer && token
    ? `${viewerUrl}${viewerUrl.includes('?') ? '&' : '?'}lesson_id=${encodeURIComponent(lessonId)}`
    : null;

  // Base URL for solver (folder so relative assets like homework-app.js resolve correctly)
  const solverBaseUrl = viewerUrl ? viewerUrl.replace(/\/[^/]*$/, '/') : '';

  const injectToken = token && uri
    ? `(function(){ window.__SUPABASE_TOKEN__ = ${JSON.stringify(token)}; window.__SUPABASE_URL__ = ${JSON.stringify(SUPABASE_URL)}; window.__LESSON_ID__ = ${JSON.stringify(lessonId)}; })(); true;`
    : '';

  // Fetch HTML, CSS, and homework-app.js; inline CSS and JS so WebView doesn't rely on baseUrl for relative resources (fixes "Failed to load viewer" on mobile)
  useEffect(() => {
    if (!uri || !token || htmlContent !== null || htmlError !== null) return;
    const baseUrl = solverBaseUrl || '';
    let cancelled = false;
    (async () => {
      try {
        const [htmlRes, cssRes, appJsRes] = await Promise.all([
          fetch(uri),
          baseUrl ? fetch(baseUrl + 'homework-styles.css') : Promise.resolve(null),
          baseUrl ? fetch(baseUrl + 'homework-app.js') : Promise.resolve(null),
        ]);
        if (cancelled) return;
        if (!htmlRes.ok) {
          setHtmlError(`Failed to load solver: ${htmlRes.status}`);
          return;
        }
        let text = await htmlRes.text();
        if (cancelled) return;
        let cssText =
          cssRes && cssRes.ok
            ? await cssRes.text()
            : '';
        if (cancelled) return;
        if (!cssText) cssText = bundledSolverCss;
        let inlined = text.replace(
          /<link\s+rel="stylesheet"\s+href="homework-styles\.css"\s*\/?>/i,
          `<style>${cssText.replace(/<\/style>/gi, '')}</style>`,
        );
        // Inline homework-app.js so the WebView doesn't fail to load the relative script (iOS/Android baseUrl behavior)
        const appJs =
          appJsRes && appJsRes.ok
            ? await appJsRes.text()
            : null;
        if (cancelled) return;
        if (appJs) {
          const escapedAppJs = appJs.replace(/<\/script>/gi, '<\\/script>');
          inlined = inlined.replace(
            /<script\s+src="homework-app\.js[^"]*"\s*><\/script>/i,
            `<script>${escapedAppJs}</script>`,
          );
        }
        const injectScript = `<script>(function(){window.__SUPABASE_TOKEN__=${JSON.stringify(token)};window.__SUPABASE_URL__=${JSON.stringify(SUPABASE_URL)};window.__LESSON_ID__=${JSON.stringify(lessonId)};})();<\/script>`;
        inlined = inlined.replace(/<head\s*>/i, '<head>' + injectScript);
        setHtmlContent(inlined);
      } catch (e) {
        if (!cancelled) setHtmlError('Failed to load solver');
      }
    })();
    return () => { cancelled = true; };
  }, [uri, token, solverBaseUrl, htmlContent, htmlError]);

  // Load WebView only when we need it (avoids crash at startup if native module not linked)
  useEffect(() => {
    if (hasViewer && uri && token && !WebViewComponent) {
      const W = getWebView();
      setWebViewComponent(W);
    }
  }, [hasViewer, uri, token, WebViewComponent]);

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
  if (hasViewer && uri && token && !WebViewComponent) {
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
  const baseUrlWithQuery = `${solverBaseUrl}?lesson_id=${encodeURIComponent(lessonId)}`;

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
          originWhitelist={['https://*', 'http://*']}
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
