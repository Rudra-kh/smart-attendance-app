import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, Animated, StyleSheet, Platform, UIManager } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const tabs = [
  { key: 'attendance', label: 'Attendance', icon: 'clipboard-text-outline', iconActive: 'clipboard-text' },
  { key: 'scan', label: 'Scan', icon: 'qrcode-scan', iconActive: 'qrcode-scan' },
  { key: 'timetable', label: 'Timetable', icon: 'calendar-clock-outline', iconActive: 'calendar-clock' },
  { key: 'scores', label: 'Scores', icon: 'chart-bar', iconActive: 'chart-bar' },
];

export default function AnimatedTabBar({ activeTab, onTabChange }) {
  const insets = useSafeAreaInsets();
  
  // Animation values for each tab
  const tabAnims = useRef(
    tabs.reduce((acc, tab) => {
      acc[tab.key] = {
        flex: new Animated.Value(tab.key === activeTab ? 1.8 : 1),
        bgOpacity: new Animated.Value(tab.key === activeTab ? 1 : 0),
        labelOpacity: new Animated.Value(tab.key === activeTab ? 1 : 0),
        scale: new Animated.Value(1),
      };
      return acc;
    }, {})
  ).current;

  useEffect(() => {
    // Animate all tabs when active tab changes
    tabs.forEach((tab) => {
      const isActive = tab.key === activeTab;
      const anim = tabAnims[tab.key];
      
      Animated.parallel([
        // Flex animation - active tab expands, others shrink
        Animated.spring(anim.flex, {
          toValue: isActive ? 1.8 : 1,
          useNativeDriver: false,
          tension: 80,
          friction: 12,
        }),
        // Background opacity
        Animated.timing(anim.bgOpacity, {
          toValue: isActive ? 1 : 0,
          duration: 150,
          useNativeDriver: false,
        }),
        // Label opacity with slight delay for active
        Animated.timing(anim.labelOpacity, {
          toValue: isActive ? 1 : 0,
          duration: isActive ? 200 : 80,
          useNativeDriver: false,
        }),
      ]).start();
    });
  }, [activeTab]);

  const handlePress = (key) => {
    // Bounce animation on press
    const anim = tabAnims[key];
    Animated.sequence([
      Animated.timing(anim.scale, {
        toValue: 0.92,
        duration: 50,
        useNativeDriver: false,
      }),
      Animated.spring(anim.scale, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: false,
      }),
    ]).start();
    
    onTabChange(key);
  };

  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const anim = tabAnims[tab.key];
          
          return (
            <Animated.View
              key={tab.key}
              style={[
                styles.tabWrapper,
                {
                  flex: anim.flex,
                  transform: [{ scale: anim.scale }],
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => handlePress(tab.key)}
                style={styles.tab}
                activeOpacity={0.7}
              >
                <View style={styles.tabContent}>
                  {/* Animated Background Squircle */}
                  <Animated.View
                    style={[
                      styles.tabBackground,
                      { opacity: anim.bgOpacity }
                    ]}
                  />
                  
                  {/* Icon */}
                  <MaterialCommunityIcons
                    name={isActive ? tab.iconActive : tab.icon}
                    size={22}
                    color={isActive ? '#FFFFFF' : '#6B7280'}
                    style={{ zIndex: 1 }}
                  />
                  
                  {/* Label - only render when active */}
                  {isActive && (
                    <Animated.Text
                      style={[
                        styles.activeLabel,
                        { opacity: anim.labelOpacity, zIndex: 1 }
                      ]}
                      numberOfLines={1}
                    >
                      {tab.label}
                    </Animated.Text>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    height: 64,
    alignItems: 'center',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    width: '100%',
  },
  tabWrapper: {
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tab: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 16,
    gap: 6,
    position: 'relative',
  },
  tabBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1F2937',
    borderRadius: 24,
  },
  activeLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});
