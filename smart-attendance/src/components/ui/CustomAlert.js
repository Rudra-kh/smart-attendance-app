import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  Animated, 
  StyleSheet, 
  Dimensions,
  TouchableWithoutFeedback 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../../theme/colors';

const { width } = Dimensions.get('window');

/**
 * Custom Animated Alert Modal
 * 
 * Usage:
 * <CustomAlert
 *   visible={showAlert}
 *   title="Logout"
 *   message="Are you sure you want to logout?"
 *   icon="logout"
 *   iconColor="#EF4444"
 *   buttons={[
 *     { text: 'Cancel', onPress: () => setShowAlert(false), style: 'cancel' },
 *     { text: 'Logout', onPress: handleLogout, style: 'destructive' }
 *   ]}
 *   onClose={() => setShowAlert(false)}
 * />
 */

export default function CustomAlert({ 
  visible, 
  title, 
  message, 
  icon,
  iconColor = colors.primary,
  buttons = [], 
  onClose 
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleButtonPress = (button) => {
    // Animate out then call the button's onPress
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (button.onPress) button.onPress();
    });
  };

  const getButtonStyle = (style) => {
    switch (style) {
      case 'destructive':
        return {
          backgroundColor: '#FEE2E2',
          textColor: '#DC2626',
        };
      case 'cancel':
        return {
          backgroundColor: colors.bgLight,
          textColor: colors.textSecondary,
        };
      case 'primary':
      default:
        return {
          backgroundColor: colors.primary,
          textColor: '#FFFFFF',
        };
    }
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View 
              style={[
                styles.alertContainer,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                }
              ]}
            >
              {/* Icon */}
              {icon && (
                <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
                  <MaterialCommunityIcons name={icon} size={32} color={iconColor} />
                </View>
              )}

              {/* Title */}
              {title && (
                <Text style={styles.title}>{title}</Text>
              )}

              {/* Message */}
              {message && (
                <Text style={styles.message}>{message}</Text>
              )}

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                {buttons.map((button, index) => {
                  const buttonStyle = getButtonStyle(button.style);
                  const isLastButton = index === buttons.length - 1;
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleButtonPress(button)}
                      style={[
                        styles.button,
                        { backgroundColor: buttonStyle.backgroundColor },
                        buttons.length === 1 && styles.singleButton,
                        buttons.length === 2 && styles.halfButton,
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.buttonText, { color: buttonStyle.textColor }]}>
                        {button.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertContainer: {
    width: width - 48,
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleButton: {
    flex: 1,
  },
  halfButton: {
    flex: 1,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
