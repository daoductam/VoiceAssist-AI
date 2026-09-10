import { TextStyle } from 'react-native';
import { Colors } from './colors';

export const Typography: Record<string, TextStyle> = {
  displayLarge: {
    fontSize: 56,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  displayMedium: {
    fontSize: 40,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  titleLarge: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  titleMedium: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  labelLarge: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  caption: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.textMuted,
  },
};
