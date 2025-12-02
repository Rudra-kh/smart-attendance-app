import React from 'react';
import { View, StyleSheet, StatusBar, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../../theme/colors';

export default function GradientScreen({ children, style, scroll = false, contentContainerStyle }) {
  const insets = useSafeAreaInsets();
  const Container = scroll ? ScrollView : View;
  
  return (
    <View style={styles.root}>
      <StatusBar barStyle={"light-content"} translucent backgroundColor="transparent" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bgDark }]} />
      <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Container
          style={[styles.container, style]}
          contentContainerStyle={scroll ? [styles.contentContainer, contentContainerStyle] : undefined}
        >
          {children}
        </Container>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgDark,
  },
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  contentContainer: {
    paddingBottom: 32,
  },
});
