import React from 'react';
import { Text, Pressable, StyleSheet, View } from 'react-native';
import colors from '../../theme/colors';

export default function PrimaryButton({ title, onPress, style, textStyle, disabled = false, leftIcon, rightIcon, variant = 'primary', size = 'md' }) {
  const paddingY = size === 'lg' ? 14 : 12;
  const paddingX = size === 'lg' ? 18 : 16;
  const content = (
    <>
      {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
      <Text style={[styles.text, (variant === 'ghost' || variant === 'white') && { color: variant === 'white' ? '#000000' : colors.primary }, textStyle]} numberOfLines={1}>
        {title}
      </Text>
      {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
    </>
  );

  if (variant === 'ghost') {
    return (
      <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [
        styles.wrapper,
        { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
        disabled && { opacity: 0.6 },
        pressed && { transform: [{ scale: 0.99 }] },
        style,
      ]}>
        <View style={[styles.gradient, { paddingVertical: paddingY, paddingHorizontal: paddingX }]}> 
          {content}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [
      styles.wrapper,
      disabled && { opacity: 0.6 },
      pressed && { transform: [{ scale: 0.99 }] },
      style,
    ]}>
      <View
        style={[
          styles.gradient,
          {
            paddingVertical: paddingY,
            paddingHorizontal: paddingX,
            backgroundColor: variant === 'white' ? '#FFFFFF' : variant === 'secondary' ? colors.secondary : colors.primary
          }
        ]}
      >
        {content}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.textOnDark,
    fontSize: 16,
    fontWeight: '600',
  },
  icon: {
    marginHorizontal: 6,
  },
});
