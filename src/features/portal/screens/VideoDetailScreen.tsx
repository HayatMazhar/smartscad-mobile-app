import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Image, Modal, StatusBar, Pressable } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useGetVideoDetailQuery } from '../services/portalApi';
import { API_BASE_URL } from '../../../store/baseApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asObject } from '../../../shared/utils/apiNormalize';
import QueryStates from '../../../shared/components/QueryStates';

// react-native-webview is a native module that doesn't ship in our web bundle.
// Lazy-require so the web build keeps working (it has its own <video> path).
let WebViewImpl: any = null;
try { WebViewImpl = require('react-native-webview').WebView; } catch { /* web build */ }

function stripHtml(html: string): string {
  return (html ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Builds the URL for the mobile video streaming endpoint:
 *   GET /api/v1/portal/galleries/videos/{videoId}/file
 *
 * The endpoint streams the actual MP4 bytes (with HTTP Range support) from the
 * SmartHelp UNC share via Windows impersonation. On web we feed the URL to a
 * standard <video> element; on native we render it inside a fullscreen Modal
 * hosting a WebView that renders a styled HTML5 player. Previously this called
 * `Linking.openURL` which kicked the user out into Chrome — that broke the
 * "stay in app" expectation and didn't honour our authentication context.
 */
function resolveVideoFileUrl(videoId?: number | string): string | undefined {
  if (videoId == null) return undefined;
  const base = API_BASE_URL.replace(/\/+$/, '');
  return `${base}/portal/galleries/videos/${encodeURIComponent(String(videoId))}/file`;
}

function resolveVideoCoverUrl(videoId?: number | string): string | undefined {
  if (videoId == null) return undefined;
  const base = API_BASE_URL.replace(/\/+$/, '');
  return `${base}/portal/news/${encodeURIComponent(String(videoId))}/cover`;
}

/**
 * Inline HTML5 video player. Custom CSS gives us a "modern" look that doesn't
 * depend on a native player module (we'd need expo-av or react-native-video
 * for that, both of which require a fresh CMake / autolink rebuild — which
 * the SDK 52 toolchain on this Windows host is touchy about). The HTML5 player
 * with `controls` + `playsinline` works reliably inside react-native-webview
 * on Android 10+.
 */
/** Avoid breaking the HTML5 player when URLs contain & or other reserved chars. */
function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function buildPlayerHtml(fileUrl: string, posterUrl?: string): string {
  const src = escapeHtmlAttr(encodeURI(fileUrl));
  const poster = posterUrl
    ? ` poster="${escapeHtmlAttr(encodeURI(posterUrl))}"`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
    body { display: flex; align-items: center; justify-content: center; -webkit-tap-highlight-color: transparent; }
    .stage { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #000; }
    video {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #000;
      outline: none;
    }
    /* Modern accent on the default controls (Android Chromium honours these). */
    video::-webkit-media-controls-enclosure { border-radius: 0; }
    video::-webkit-media-controls-panel { background: linear-gradient(transparent, rgba(0,0,0,0.65)); }
  </style>
</head>
<body>
  <div class="stage">
    <video id="v"${poster} controls playsinline preload="metadata" controlslist="nodownload" autoplay>
      <source src="${src}" type="video/mp4" />
    </video>
  </div>
  <script>
    // Forward player state changes back to the host so we can react in RN
    // (currently only used for autoplay-blocked detection and end-of-video).
    var v = document.getElementById('v');
    function post(type, payload) {
      try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload || null }));
        }
      } catch (e) {}
    }
    v.addEventListener('ended', function () { post('ended'); });
    v.addEventListener('error', function (e) { post('error', { code: v.error && v.error.code }); });
    v.addEventListener('play', function () { post('play'); });
    // Some Android Chromium builds reject autoplay for audio-bearing videos
    // that aren't muted. Try once more on first user tap.
    document.body.addEventListener('click', function () {
      if (v.paused) { v.play().catch(function(){}); }
    }, { once: true });
  </script>
</body>
</html>`;
}

const VideoDetailScreen = ({ route }: { route?: { params?: { videoId?: number } } }) => {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const videoId = route?.params?.videoId;
  const { data, isLoading, isFetching, isError, error, refetch } = useGetVideoDetailQuery(videoId ?? 0, { skip: videoId == null });

  const video = asObject<any>(data) ?? data;

  const fileUrl = useMemo(
    () => resolveVideoFileUrl(video?.id ?? video?.videoId ?? videoId),
    [video, videoId],
  );
  const coverUrl = useMemo(
    () => resolveVideoCoverUrl(video?.id ?? video?.videoId ?? videoId),
    [video, videoId],
  );

  // Player modal visibility — opened from the play button on the hero / from
  // the watch button below the description.
  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const playerHtml = useMemo(
    () => (fileUrl ? buildPlayerHtml(fileUrl, coverUrl) : null),
    [fileUrl, coverUrl],
  );

  if (videoId == null) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>{t('common.noData')}</Text>
      </View>
    );
  }

  const hasVideo = !!(video && (video.id ?? video.videoId));
  const descText = hasVideo ? stripHtml(video.description ?? '') : '';

  // On web, fall back to the native <video> element. RN Web doesn't ship a
  // first-class video component, but rendering an HTML element via a string tag
  // is the documented escape hatch.
  const WebVideo: any = 'video';
  const isWeb = Platform.OS === 'web';

  return (
    <QueryStates
      loading={isLoading && !hasVideo}
      apiError={!!(isError && !hasVideo)}
      error={error}
      isRefreshing={isFetching}
      onRetry={refetch}
      style={{ flex: 1 }}
    >
      {!hasVideo ? (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Text style={{ color: colors.textMuted }}>{t('common.noData')}</Text>
        </View>
      ) : (
    <>
      <ScrollView
        style={[{ flex: 1, backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />}
      >
        {/* Player / hero */}
        <View style={styles.heroWrap}>
          {isWeb && fileUrl ? (
            <WebVideo
              src={fileUrl}
              poster={coverUrl}
              controls
              playsInline
              preload="metadata"
              style={{ width: '100%', maxHeight: 380, backgroundColor: '#000' }}
            />
          ) : (
            <Pressable
              style={styles.hero}
              onPress={() => {
                if (fileUrl) {
                  setPlayerError(null);
                  setPlayerOpen(true);
                }
              }}
              android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
            >
              {coverUrl ? (
                <Image
                  source={{ uri: coverUrl }}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="cover"
                />
              ) : null}
              <View style={styles.heroDim} />
              <View style={styles.heroPlayButton}>
                <View style={styles.heroPlayInner}>
                  <View style={styles.heroPlayTriangle} />
                </View>
              </View>
              <Text style={styles.heroLabel}>Tap to play</Text>
            </Pressable>
          )}
        </View>

        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>{video.title}</Text>
          {video.titleAr && video.titleAr !== video.title ? (
            <Text style={[styles.titleAr, { color: colors.textSecondary }]}>{video.titleAr}</Text>
          ) : null}

          {!isWeb && fileUrl ? (
            <TouchableOpacity
              style={[styles.watchBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                setPlayerError(null);
                setPlayerOpen(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.watchBtnTriangle} />
              <Text style={styles.watchBtnText}>Watch Video</Text>
            </TouchableOpacity>
          ) : null}

          {descText ? (
            <Text style={[styles.desc, { color: colors.textSecondary }]}>{descText}</Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Fullscreen in-app player — Modal hosts a WebView that renders an
          HTML5 <video> with custom dark styling. Tapping the close handle in
          the top-right dismisses; Android hardware back closes via
          onRequestClose. */}
      {!isWeb && WebViewImpl ? (
        <Modal
          visible={playerOpen}
          transparent={false}
          animationType="fade"
          statusBarTranslucent
          hardwareAccelerated
          onRequestClose={() => {
            setPlayerOpen(false);
            setPlayerError(null);
          }}
        >
          <StatusBar hidden barStyle="light-content" backgroundColor="#000" />
          <View style={styles.playerStage}>
            {playerError ? (
              <View style={styles.playerErrorBox}>
                <Text style={styles.playerErrorText}>{playerError}</Text>
              </View>
            ) : null}
            {playerHtml ? (
              <WebViewImpl
                originWhitelist={['*']}
                source={{ html: playerHtml, baseUrl: API_BASE_URL.replace(/\/+$/, '') + '/' }}
                style={styles.playerWeb}
                allowsFullscreenVideo
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                mixedContentMode="always"
                javaScriptEnabled
                domStorageEnabled
                allowFileAccess
                setSupportMultipleWindows={false}
                androidLayerType="hardware"
                onShouldStartLoadWithRequest={() => true}
                onHttpError={(e: { nativeEvent: { statusCode: number; description?: string } }) => {
                  const code = e?.nativeEvent?.statusCode;
                  setPlayerError(
                    t('portal.videoLoadFailed', 'Video could not be loaded (HTTP {{code}}).', { code: String(code) }),
                  );
                }}
                onMessage={(ev: { nativeEvent: { data: string } }) => {
                  try {
                    const msg = JSON.parse(ev?.nativeEvent?.data ?? '{}');
                    if (msg?.type === 'error') {
                      setPlayerError(
                        t(
                          'portal.videoPlaybackError',
                          'Playback failed. The file may be missing on the server or the format is not supported.',
                        ),
                      );
                    }
                  } catch {
                    /* ignore */
                  }
                }}
              />
            ) : null}

            <TouchableOpacity
              accessibilityLabel="Close video player"
              onPress={() => setPlayerOpen(false)}
              activeOpacity={0.7}
              style={styles.playerClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.playerCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      ) : null}
    </>
      )}
    </QueryStates>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroWrap: { backgroundColor: '#000' },
  hero: {
    backgroundColor: '#1B1B2F',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  // Modern hero play button — translucent outer pill with a solid inner disc
  // and an off-centre triangle. Replaces the previous flat ▶ glyph.
  heroPlayButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroPlayInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 6,
  },
  heroPlayTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 13,
    borderBottomWidth: 13,
    borderLeftWidth: 22,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#111',
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: { marginHorizontal: 16, marginTop: 16, borderRadius: 14, padding: 18 },
  title: { fontSize: 20, fontWeight: '800', lineHeight: 26, marginBottom: 8 },
  titleAr: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  watchBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    flexDirection: 'row',
    gap: 8,
  },
  watchBtnTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 11,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#fff',
    marginRight: 4,
  },
  watchBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  desc: { fontSize: 15, lineHeight: 24 },

  // Fullscreen modal player
  playerStage: { flex: 1, backgroundColor: '#000' },
  playerWeb: { flex: 1, backgroundColor: '#000' },
  playerErrorBox: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 24,
    left: 12,
    right: 60,
    zIndex: 2,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(120,0,0,0.85)',
  },
  playerErrorText: { color: '#fff', fontSize: 13, lineHeight: 18 },
  playerClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 18,
    right: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  playerCloseText: { color: '#fff', fontSize: 18, fontWeight: '800', lineHeight: 18 },
});

export default VideoDetailScreen;
