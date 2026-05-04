import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity, Platform } from 'react-native';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {}, success: () => {}, error: () => {}, warning: () => {}, info: () => {},
});

export const useToast = () => useContext(ToastContext);

const TOAST_COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: '#E8F5E9', border: '#4CAF50', icon: '✅' },
  error: { bg: '#FFEBEE', border: '#F44336', icon: '❌' },
  warning: { bg: '#FFF8E1', border: '#FF9800', icon: '⚠️' },
  info: { bg: '#E3F2FD', border: '#2196F3', icon: 'ℹ️' },
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const c = TOAST_COLORS[toast.type];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
      ]).start(() => onDismiss(toast.id));
    }, toast.duration ?? 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.toast, { backgroundColor: c.bg, borderLeftColor: c.border, opacity, transform: [{ translateY }] }]}>
      <Text style={styles.toastIcon}>{c.icon}</Text>
      <View style={styles.toastContent}>
        <Text style={styles.toastTitle}>{toast.title}</Text>
        {toast.message ? <Text style={styles.toastMessage}>{toast.message}</Text> : null}
      </View>
      <TouchableOpacity onPress={() => onDismiss(toast.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.toastClose}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((type: ToastType, title: string, message?: string, duration?: number) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-3), { id, type, title, message, duration }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ctx: ToastContextType = {
    showToast,
    success: (t, m) => showToast('success', t, m),
    error: (t, m) => showToast('error', t, m),
    warning: (t, m) => showToast('warning', t, m),
    info: (t, m) => showToast('info', t, m),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((t) => <ToastItem key={t.id} toast={t} onDismiss={dismiss} />)}
      </View>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute', top: Platform.OS === 'web' ? 12 : 50, left: 16, right: 16,
    zIndex: 9999, elevation: 9999,
  },
  toast: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderLeftWidth: 4,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6,
    elevation: 5,
  },
  toastIcon: { fontSize: 18, marginRight: 10 },
  toastContent: { flex: 1 },
  toastTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  toastMessage: { fontSize: 12, color: '#555', marginTop: 2, lineHeight: 17 },
  toastClose: { fontSize: 14, color: '#999', paddingLeft: 8 },
});
