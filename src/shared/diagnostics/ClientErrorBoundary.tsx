import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { reportClientError } from './reportClientError';

type Props = { children: ReactNode };

type State = { error: Error | null };

/**
 * Catches React render/lifecycle errors in children and reports them to POST /client-errors.
 */
export class ClientErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const stack = [error.stack, info.componentStack].filter(Boolean).join('\n---\n');
    void reportClientError({
      message: error.message || error.name || 'React render error',
      stackTrace: stack || null,
      source: 'react_boundary',
      isFatal: false,
    });
  }

  private reset = () => this.setState({ error: null });

  render(): ReactNode {
    if (this.state.error) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>The problem has been reported. You can try again.</Text>
          <TouchableOpacity style={styles.btn} onPress={this.reset} accessibilityRole="button">
            <Text style={styles.btnTxt}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#111' },
  body: { fontSize: 14, color: '#444', textAlign: 'center', marginBottom: 20 },
  btn: { backgroundColor: '#1565c0', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
