import React, { useState, useMemo } from 'react';
import { View, useWindowDimensions, Platform, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../store/baseApi';
import { useTheme } from '../../app/theme/ThemeContext';

/* eslint-disable @typescript-eslint/no-var-requires */
let WebViewImpl: typeof import('react-native-webview').WebView | null = null;
try {
  WebViewImpl = require('react-native-webview').WebView;
} catch {
  /* web build / missing native */
}
/* eslint-enable @typescript-eslint/no-var-requires */

const isWeb = Platform.OS === 'web';

function buildHtmlDocument(
  bodyHtml: string,
  textColor: string,
  backgroundColor: string,
  isRtl: boolean,
): string {
  const body = (bodyHtml && bodyHtml.trim()) || '<p style="margin:0"> </p>';
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  html,body {
    margin:0;padding:12px 4px; background:${backgroundColor}; color:${textColor};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 16px; line-height: 1.6; word-wrap: break-word;
  }
  img, video, iframe { max-width: 100% !important; height: auto !important; }
  p { margin: 0 0 0.75em 0; }
  table { max-width: 100%; border-collapse: collapse; }
  ul, ol { padding-inline-start: 1.2em; }
  a { color: inherit; }
</style>
</head>
<body dir="${isRtl ? 'rtl' : 'ltr'}">
${body}
<script>
  (function() {
    function postH() {
      var h = Math.max(
        document.body ? document.body.scrollHeight : 0,
        document.documentElement ? document.documentElement.scrollHeight : 0,
        120
      );
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(String(h));
      }
    }
    if (document.readyState === 'complete') { setTimeout(postH, 0); }
    else { window.addEventListener('load', function() { setTimeout(postH, 100); }); }
    setTimeout(postH, 400);
    var imgs = document.getElementsByTagName('img');
    for (var i = 0; i < imgs.length; i++) { imgs[i].onload = postH; }
  })();
  true;
</script>
</body></html>`;
}

export type RichHtmlViewProps = {
  html: string;
  minHeight?: number;
  contentWidth?: number;
  style?: ViewStyle;
  /** Mini-document background (e.g. card); defaults to theme card. */
  surfaceColor?: string;
  textColor?: string;
  /** Used when WebView is unavailable (web bundle). */
  plainFallbackFromHtml?: (html: string) => string;
};

/**
 * Renders WYSIWYG HTML (rich text with inline images) like the web portal.
 * Avoids strip-to-text which would show base64 image payloads as text.
 */
const RichHtmlView: React.FC<RichHtmlViewProps> = ({
  html,
  minHeight = 160,
  contentWidth: cw,
  style,
  surfaceColor,
  textColor,
  plainFallbackFromHtml,
}) => {
  const { i18n } = useTranslation();
  const { colors } = useTheme();
  const bg = surfaceColor ?? colors.card;
  const txt = textColor ?? colors.text;
  const { width: winW } = useWindowDimensions();
  const [webHeight, setWebHeight] = useState(minHeight);
  const isRtl = (i18n as { dir?: () => string }).dir?.() === 'rtl'
    || (i18n.language?.startsWith('ar') ?? false);

  const doc = useMemo(
    () => buildHtmlDocument(html, txt, bg, isRtl),
    [html, txt, bg, isRtl],
  );

  const contentWidth = cw ?? winW;
  const baseUrl = `${API_BASE_URL.replace(/\/+$/, '').replace(/\/api\/v1$/i, '')}/`;

  if (isWeb || !WebViewImpl) {
    const plain = plainFallbackFromHtml
      ? plainFallbackFromHtml(html)
      : html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return (
      <View style={style}>
        <Text style={[styles.fallbackText, { color: txt }]}>{plain || ' '}</Text>
      </View>
    );
  }

  return (
    <View style={[{ width: contentWidth, minHeight, overflow: 'hidden' as const }, style]}>
      <WebViewImpl
        originWhitelist={['*']}
        source={{ html: doc, baseUrl }}
        style={{ width: contentWidth, height: Math.max(webHeight, minHeight), backgroundColor: bg }}
        scrollEnabled={false}
        onMessage={(e: { nativeEvent: { data: string } }) => {
          const n = parseInt(e.nativeEvent.data, 10);
          if (Number.isFinite(n) && n > 0) setWebHeight(n + 8);
        }}
        javaScriptEnabled
        setSupportMultipleWindows={false}
        automaticallyAdjustContentInsets
      />
    </View>
  );
};

const styles = StyleSheet.create({
  fallbackText: { fontSize: 15, lineHeight: 24 },
});

export default RichHtmlView;
