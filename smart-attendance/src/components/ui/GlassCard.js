import React from 'react';
import { View, StyleSheet } from 'react-native';
import colors from '../../theme/colors';

export default function GlassCard({ children, style, padding = 14 }) {
  return (
    <View style={[styles.wrapper, { padding }, style]}> 
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder || 'rgba(255,255,255,0.2)',
    backgroundColor: colors.glassBg || 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
});
