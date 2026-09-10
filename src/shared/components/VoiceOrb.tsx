import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Mic, Radio, Sparkles, Volume2 } from 'lucide-react-native';
import { Colors } from '@core/theme/colors';
import { VoiceOrbState } from '@domain/enums';

interface VoiceOrbProps {
  state: VoiceOrbState;
  onPress: () => void;
  size?: number;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  state,
  onPress,
  size = 140,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    if (state === 'idle') {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.96,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else if (state === 'listening') {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.95,
            duration: 600,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else if (state === 'thinking') {
      animation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      animation.start();
    } else if (state === 'speaking') {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.98,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    }

    return () => {
      animation?.stop();
    };
  }, [state, pulseAnim, rotateAnim]);

  const getOrbColor = () => {
    switch (state) {
      case 'listening':
        return Colors.secondary;
      case 'thinking':
        return Colors.ambientPurple;
      case 'speaking':
        return Colors.ambientPink;
      default:
        return Colors.primary;
    }
  };

  const getGlowColor = () => {
    switch (state) {
      case 'listening':
        return Colors.secondaryGlow;
      case 'thinking':
        return 'rgba(168, 85, 247, 0.4)';
      case 'speaking':
        return 'rgba(236, 72, 153, 0.4)';
      default:
        return Colors.primaryGlow;
    }
  };

  const renderIcon = () => {
    const iconSize = size * 0.32;
    switch (state) {
      case 'listening':
        return <Radio size={iconSize} color="#FFFFFF" />;
      case 'thinking':
        return <Sparkles size={iconSize} color="#FFFFFF" />;
      case 'speaking':
        return <Volume2 size={iconSize} color="#FFFFFF" />;
      default:
        return <Mic size={iconSize} color="#FFFFFF" />;
    }
  };

  return (
    <View style={[styles.container, { width: size * 1.5, height: size * 1.5 }]}>
      {/* Outer Halo Glow */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            width: size * 1.35,
            height: size * 1.35,
            borderRadius: (size * 1.35) / 2,
            backgroundColor: getGlowColor(),
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* Main Interactive Orb */}
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[
          styles.coreOrb,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: getOrbColor(),
          },
        ]}
      >
        {renderIcon()}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
  },
  coreOrb: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
});
