import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import colors from '../theme/colors';
import { auth } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import Constants from 'expo-constants';

export default function AdminLoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= 6;

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const extras = Constants?.expoConfig?.extra || {};
    const emu = extras.emulators || {};
    if (emu.bypassLogin || extras.demoMode) {
      navigation.replace('BranchSelection');
    }
  }, [navigation]);

  const handleLogin = async () => {
    if (!valid) return;
    try {
      setLoading(true);
      if (!auth) throw new Error('auth-unavailable');
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigation.replace('BranchSelection');
    } catch (e) {
      Alert.alert('Invalid credentials', 'Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Enter your email', 'Please enter a valid email to reset password.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert('Reset link sent', 'Check your email for the password reset link.');
    } catch (e) {
      Alert.alert('Unable to send reset link', 'Please verify the email or try again later.');
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, gap: 16, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: '700', textAlign: 'center', color: colors.textPrimary }}>Professor Login</Text>
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.textSecondary }}>Email Address</Text>
        <TextInput
          placeholder="professor@university.edu"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={{ borderWidth: 1, borderColor: colors.dividerLight, borderRadius: 8, padding: 12 }}
        />
      </View>
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.textSecondary }}>Password</Text>
        <TextInput
          placeholder="Enter your password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={{ borderWidth: 1, borderColor: colors.dividerLight, borderRadius: 8, padding: 12 }}
        />
      </View>
      <TouchableOpacity
        disabled={!valid || loading}
        onPress={handleLogin}
        style={{
          backgroundColor: valid && !loading ? colors.primary : '#93C5FD',
          padding: 16,
          borderRadius: 10
        }}>
        <Text style={{ color: colors.bgLight, textAlign: 'center', fontWeight: '600' }}>{loading ? 'Please wait…' : 'Login'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleForgot}>
        <Text style={{ color: colors.primary, textAlign: 'center' }}>Forgot Password</Text>
      </TouchableOpacity>
    </View>
  );
}
