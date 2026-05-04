import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useGetMessagesQuery, useSendMessageMutation, useCreateSessionMutation } from '../services/aiApi';
import { useTheme } from '../../../app/theme/ThemeContext';

const TypingIndicator: React.FC<{ color: string }> = ({ color }) => {
  const anims = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.3),
    new Animated.Value(0.3),
  ]).current;

  useEffect(() => {
    const animate = (index: number) =>
      Animated.sequence([
        Animated.timing(anims[index], { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(anims[index], { toValue: 0.3, duration: 350, useNativeDriver: true }),
      ]);

    const loop = Animated.loop(
      Animated.stagger(150, anims.map((_, i) => animate(i))),
    );
    loop.start();
    return () => loop.stop();
  }, [anims]);

  return (
    <View style={styles.typingRow}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[styles.typingDot, { backgroundColor: color, opacity: anim }]}
        />
      ))}
    </View>
  );
};

const AIChatScreen: React.FC<{ route?: any }> = ({ route }) => {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const routeSessionId = route?.params?.sessionId as string | undefined;

  const [sessionId, setSessionId] = useState<string | undefined>(routeSessionId);
  const { data: messagesData } = useGetMessagesQuery(sessionId!, { skip: !sessionId });
  const [sendMessage] = useSendMessageMutation();
  const [createSession] = useCreateSessionMutation();

  const [inputText, setInputText] = useState('');
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  // Inline error banner shown when /sendMessage fails. We never fabricate
  // an assistant bubble — the user must see that the backend failed, not a
  // canned "I received your message" reply that could be mistaken for AI.
  const [sendError, setSendError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (sessionId) return;
    let cancelled = false;
    createSession()
      .unwrap()
      .then((res: any) => {
        const id = res?.id ?? res?.sessionId;
        if (cancelled) return;
        if (id) {
          setSessionId(String(id));
        } else {
          setSendError(
            t(
              'ai.noSession',
              'Could not start an AI session. Please check your connection or contact IT support.',
            ),
          );
        }
      })
      .catch((e: any) => {
        if (cancelled) return;
        const apiMsg = e?.data?.message as string | undefined;
        setSendError(
          apiMsg ??
            t(
              'ai.noSession',
              'Could not start an AI session. Please check your connection or contact IT support.',
            ),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, createSession, t]);

  const messages = useMemo(() => {
    const raw = messagesData;
    let serverItems: any[] = [];
    if (raw?.items && Array.isArray(raw.items)) serverItems = raw.items;
    else if (Array.isArray(raw)) serverItems = raw;
    const serverIds = new Set(
      serverItems.map((m: any) => (m?.id != null ? String(m.id) : '')).filter(Boolean),
    );
    const extras = localMessages.filter((m) => {
      const id = m?.id != null ? String(m.id) : '';
      if (!id) return true;
      return !serverIds.has(id);
    });
    return [...serverItems, ...extras];
  }, [messagesData, localMessages]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages, isTyping, scrollToEnd]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;
    if (!sessionId) {
      setSendError(
        t(
          'ai.noSession',
          'Could not start an AI session. Please check your connection or contact IT support.',
        ),
      );
      return;
    }

    const userMsg = { id: `local-${Date.now()}`, role: 'user', content: text, timestamp: new Date().toISOString() };
    setLocalMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);
    setSendError(null);

    try {
      const result = await sendMessage({ sessionId, body: { message: text } }).unwrap();
      const replyText = result?.message ?? result?.content;
      if (!replyText) {
        // API succeeded but gave no content. Don't invent a chatty "I received
        // your message." — surface the situation honestly.
        setSendError(
          t(
            'ai.emptyReply',
            'The assistant did not return a response. Please try again or contact IT support.',
          ),
        );
      } else {
        const aiMsg = {
          id: result?.id ?? `ai-${Date.now()}`,
          role: 'assistant',
          content: replyText,
          timestamp: new Date().toISOString(),
        };
        setLocalMessages((prev) => [...prev, aiMsg]);
      }
    } catch (e: any) {
      const apiMsg = e?.data?.message as string | undefined;
      setSendError(
        apiMsg ??
          t(
            'ai.error',
            'The AI service is currently unavailable. Please try again, or contact IT support if the problem persists.',
          ),
      );
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.bubbleWrap, isUser ? styles.bubbleRight : styles.bubbleLeft]}>
        {!isUser && <Text style={styles.avatarEmoji}>🤖</Text>}
        <View
          style={[
            styles.bubble,
            isUser
              ? { backgroundColor: colors.primary }
              : [{ backgroundColor: colors.card }, shadows.card],
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              { color: isUser ? '#FFFFFF' : colors.text },
            ]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.bubbleTime,
              { color: isUser ? 'rgba(255,255,255,0.65)' : colors.textMuted },
            ]}
          >
            {item.timestamp
              ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : ''}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.header, shadows.card, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <Text style={styles.headerEmoji}>🤖</Text>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t('ai.title') || 'AI Assistant'}
            </Text>
            <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, backgroundColor: `${colors.warning}26` }}>
              <Text style={{ color: colors.warning, fontSize: 9.5, fontWeight: '900', letterSpacing: 0.4 }}>PREVIEW</Text>
            </View>
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {t('ai.subtitle') || 'Not yet wired to a live model'}
          </Text>
        </View>
        <View style={[styles.onlineDot, { backgroundColor: colors.warning }]} />
      </View>
      <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: `${colors.warning}14` }}>
        <Text style={{ fontSize: 11.5, color: colors.textSecondary, lineHeight: 16 }}>
          The AI assistant backend is not connected yet. Replies you see here are placeholder responses, not real AI output.
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={
          <View style={[styles.welcomeWrap, { paddingTop: insets.top + 20 }]}>
            <Text style={styles.welcomeEmoji}>👋</Text>
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>
              {t('ai.welcome') || 'Hello! How can I help you?'}
            </Text>
            <Text style={[styles.welcomeSub, { color: colors.textSecondary }]}>
              {t('ai.welcomeSub') || 'Ask about HR policies, IT support, or anything else.'}
            </Text>
          </View>
        }
        ListFooterComponent={
          isTyping ? (
            <View style={[styles.bubbleWrap, styles.bubbleLeft]}>
              <Text style={styles.avatarEmoji}>🤖</Text>
              <View style={[styles.bubble, { backgroundColor: colors.card }, shadows.card]}>
                <TypingIndicator color={colors.textMuted} />
              </View>
            </View>
          ) : null
        }
      />

      {sendError ? (
        <View style={[styles.errorBanner, { backgroundColor: `${colors.danger}14`, borderColor: `${colors.danger}55` }]}>
          <Text style={[styles.errorBannerText, { color: colors.danger }]} numberOfLines={3}>
            {sendError}
          </Text>
          <TouchableOpacity onPress={() => setSendError(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.errorBannerDismiss, { color: colors.danger }]}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[styles.inputBar, shadows.card, { backgroundColor: colors.card, borderTopColor: colors.divider }]}>
        <TextInput
          style={[styles.textInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
          placeholder={t('ai.placeholder') || 'Type a message...'}
          placeholderTextColor={colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={2000}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: inputText.trim() ? colors.primary : colors.greyCard },
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || !sessionId}
          activeOpacity={0.7}
        >
          <Text style={styles.sendEmoji}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerEmoji: { fontSize: 28 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSubtitle: { fontSize: 12 },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 'auto',
  },

  messagesList: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },

  bubbleWrap: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
    gap: 8,
  },
  bubbleRight: {
    justifyContent: 'flex-end',
  },
  bubbleLeft: {
    justifyContent: 'flex-start',
  },
  avatarEmoji: {
    fontSize: 22,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTime: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },

  typingRow: {
    flexDirection: 'row',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  textInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendEmoji: {
    fontSize: 20,
    color: '#FFF',
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorBannerText: { flex: 1, fontSize: 12.5, lineHeight: 17, fontWeight: '600' },
  errorBannerDismiss: { fontSize: 16, fontWeight: '700' },

  welcomeWrap: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  welcomeEmoji: { fontSize: 48, marginBottom: 16 },
  welcomeTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  welcomeSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

export default AIChatScreen;
