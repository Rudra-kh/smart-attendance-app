// Extended palette provided by user
const palette = {
  darkBlue: '#0A1931',
  lightBlue: '#B3CFE5',
  mediumBlue: '#4A7FA7',
  darkerMediumBlue: '#1A3D63',
  veryLightBlue: '#F6FAFD',
  lightCyan: '#E0F2FE',
  skyBlue: '#BAE6FD',
  paleLime: '#ECFCCB',
  softIce: '#F0F9FF',
};

// Semantic mapping updated to use new palette while preserving existing keys
const colors = {
  primary: palette.mediumBlue,
  secondary: palette.lightBlue,
  accent: palette.darkerMediumBlue,
  success: '#10B981',
  danger: '#EF4444',
  info: palette.lightBlue,
  textPrimary: palette.darkBlue,
  textSecondary: palette.darkerMediumBlue,
  bgLight: palette.veryLightBlue,
  bgLightAlt: '#FFFFFF',
  dividerLight: '#E2E8F0',
  bgDark: palette.darkBlue,
  bgDarkAlt: palette.darkerMediumBlue,
  textOnDark: palette.veryLightBlue,
  textOnDarkSecondary: palette.lightBlue,
  dividerDark: palette.darkerMediumBlue,
  // Gradient & glass tokens for premium UI
  gradientStart: palette.darkBlue,
  gradientEnd: palette.darkBlue,
  buttonStart: palette.mediumBlue,
  buttonEnd: palette.mediumBlue,
  glassBg: 'rgba(255,255,255,0.1)',
  glassBorder: 'rgba(255,255,255,0.2)',
  palette
};

export default colors;
