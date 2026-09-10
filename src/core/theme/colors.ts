/**
 * Midnight Synapse Theme Colors
 * OLED-first dark mode with vibrant radiant neon accents.
 */
export const Colors = {
  // Background & Surfaces
  background: '#0A0C16',       // Deep OLED Obsidian
  surface: '#121526',          // Frosted Slate
  surfaceElevated: '#1A1E36',  // Elevated Card / Modal
  surfaceSubtle: '#0F1222',    // Subtle Input / Tag background
  border: '#252B4D',          // Structural Border
  borderGlow: 'rgba(99, 102, 241, 0.35)', // Glowing border

  // Accents & Brand
  primary: '#6366F1',          // Electric Indigo
  primaryGlow: 'rgba(99, 102, 241, 0.45)',
  secondary: '#38BDF8',        // Radiant Cyan
  secondaryGlow: 'rgba(56, 189, 248, 0.4)',
  ambientPurple: '#A855F7',    // Neon Purple
  ambientPink: '#EC4899',      // Pink Glow

  // Semantic Status
  success: '#10B981',          // Emerald Green
  warning: '#F59E0B',          // Amber Warm (Snooze)
  danger: '#F43F5E',           // Rose Flame (Dismiss / Delete)
  info: '#60A5FA',             // Sky Blue

  // Typography
  textPrimary: '#F8FAFC',      // Crisp Snow White
  textSecondary: '#94A3B8',    // Muted Lavender
  textMuted: '#64748B',        // Subdued Slate
  textAccent: '#818CF8',       // Bright Indigo Link

  // Voice Orb States
  orb: {
    idleGradient: ['#6366F1', '#A855F7'] as const,
    listeningGradient: ['#38BDF8', '#6366F1'] as const,
    thinkingGradient: ['#A855F7', '#6366F1'] as const,
    speakingGradient: ['#A855F7', '#EC4899'] as const,
  },
} as const;

export type ColorTheme = typeof Colors;
