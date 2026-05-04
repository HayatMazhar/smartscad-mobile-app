import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../../features/auth/screens/LoginScreen';
import MicrosoftSignInScreen from '../../features/auth/screens/MicrosoftSignInScreen';

export type AuthStackParamList = {
  Login: undefined;
  MicrosoftSignIn: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen
      name="MicrosoftSignIn"
      // We render MicrosoftSignInScreen inline so it can dispatch
      // setCredentials when sign-in completes; the navigator handles
      // dismissing the screen automatically because RootNavigator flips
      // to the home stack the moment auth.token becomes non-null.
      component={MicrosoftSignInScreenWithBack}
    />
  </Stack.Navigator>
);

// Small wrapper so MicrosoftSignInScreen has a `Back to login` action.
const MicrosoftSignInScreenWithBack: React.FC<any> = ({ navigation }) => (
  <MicrosoftSignInScreen onCancel={() => navigation.goBack()} />
);

export default AuthNavigator;
