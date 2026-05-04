import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useAppSelector } from '../../store/store';
import { useTheme } from '../theme/ThemeContext';
import { ToastProvider } from '../../shared/components/Toast';
import { navigationRef, syncNavigationRoutePath } from '../../shared/navigation/navigationTelemetry';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import ReportingUsersSessionBootstrap from '../../shared/components/ReportingUsersSessionBootstrap';

const RootNavigator: React.FC = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { isDark, colors } = useTheme();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.divider,
      notification: colors.notification,
    },
  };

  return (
    <ToastProvider>
      <ReportingUsersSessionBootstrap />
      <NavigationContainer
        ref={navigationRef}
        theme={navTheme}
        onReady={syncNavigationRoutePath}
        onStateChange={syncNavigationRoutePath}
      >
        {isAuthenticated ? <MainTabNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    </ToastProvider>
  );
};

export default RootNavigator;
