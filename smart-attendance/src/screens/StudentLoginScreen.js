import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Alert } from 'react-native';
import colors from '../theme/colors';
import { auth } from '../lib/firebase';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import students from '../data/students.json';
import { GradientScreen, GlassCard, PrimaryButton } from '../components/ui';

export default function StudentLoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const extras = Constants?.expoConfig?.extra || {};
  const demoMode = !!extras.demoMode;

  useEffect(() => {
    // If already logged in (demo), skip to StudentDemo
    (async () => {
      try {
        const s = await AsyncStorage.getItem('demo:studentAuth');
        if (s) {
          navigation.replace('StudentPanel');
        }
      } catch (_) {}
    })();
  }, [navigation]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      if (demoMode) {
        const emailKey = String(email).trim().toLowerCase();
        const all = Array.isArray(students) ? students : [];
        const found = all.find(s => String(s.email || '').trim().toLowerCase() === emailKey);
        if (!found) throw new Error('invalid-credentials');
        const pwd = String(password).trim();
        const expected = String(found.rollNo || '').trim();
        if (pwd !== expected) throw new Error('invalid-credentials');
        await AsyncStorage.setItem('demo:studentAuth', JSON.stringify({ email: found.email, rollNo: expected, name: found.name || '' }));
        navigation.replace('StudentPanel');
        return;
      }
      if (!auth) throw new Error('auth-unavailable');
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      navigation.replace('StudentPanel');
    } catch (e) {
      Alert.alert('Login failed', 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientScreen style={{ paddingHorizontal: 20, justifyContent: 'center' }}>
      <View style={{ gap: 14 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', textAlign: 'center', color: colors.textOnDark }}>Student Login</Text>
        <GlassCard>
          <View style={{ gap: 12 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.textOnDarkSecondary }}>Email</Text>
              <TextInput
                placeholder="your.email@college.edu"
                placeholderTextColor={colors.textOnDarkSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: colors.textOnDark, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 10, padding: 12 }}
              />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.textOnDarkSecondary }}>Password</Text>
              <TextInput
                placeholder="Password"
                placeholderTextColor={colors.textOnDarkSecondary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: colors.textOnDark, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 10, padding: 12 }}
              />
            </View>
            <PrimaryButton title={loading ? 'Logging in...' : 'Login'} onPress={handleLogin} />
          </View>
        </GlassCard>
      </View>
    </GradientScreen>
  );
}
