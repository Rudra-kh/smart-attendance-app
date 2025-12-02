import React from 'react';
import { View, Text } from 'react-native';
import colors from '../theme/colors';
import Constants from 'expo-constants';
import { GradientScreen, GlassCard, PrimaryButton } from '../components/ui';

export default function WelcomeScreen({ navigation }) {
  const extras = Constants?.expoConfig?.extra || {};
  const demoMode = !!extras.demoMode;
  return (
    <GradientScreen style={{ justifyContent: 'center' }}>
      <View style={{ gap: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', textAlign: 'center', color: colors.textOnDark }}>Welcome to Smart Attendance</Text>
        <Text style={{ textAlign: 'center', color: colors.textOnDarkSecondary }}>Modern attendance management for educational institutions</Text>
        <GlassCard>
          <View style={{ gap: 10 }}>
            <PrimaryButton title="I’m a Professor/Admin" onPress={() => navigation.navigate('AdminLogin')} />
            <PrimaryButton title="I'm a Student" onPress={() => navigation.navigate('StudentLogin')} />
          </View>
        </GlassCard>
      </View>
    </GradientScreen>
  );
}
