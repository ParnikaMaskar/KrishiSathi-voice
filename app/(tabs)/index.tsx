import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Dimensions, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withSequence,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { useVoiceAssistant } from '@/hooks/use-voice-assistant';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const { state, transcript, error, startRecording, stopRecording } = useVoiceAssistant();
  
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (state === 'RECORDING') {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
    } else {
      pulse.value = withTiming(1);
    }
  }, [state]);

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulse.value }],
      opacity: interpolate(pulse.value, [1, 1.2], [1, 0.8], Extrapolate.CLAMP),
    };
  });

  const getStatusColor = () => {
    switch (state) {
      case 'RECORDING': return ['#ef4444', '#dc2626'] as const;
      case 'SENDING': return ['#f59e0b', '#d97706'] as const;
      case 'PROCESSING': return ['#3b82f6', '#2563eb'] as const;
      case 'SPEAKING': return ['#10b981', '#059669'] as const;
      default: return ['#6366f1', '#4f46e5'] as const;
    }
  };

  const getStatusText = () => {
    switch (state) {
      case 'RECORDING': return 'Listening...';
      case 'SENDING': return 'Processing...';
      case 'PROCESSING': return 'Assistant is thinking...';
      case 'SPEAKING': return 'Speaking...';
      default: return 'Tap and Hold to Talk';
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Decorative Elements */}
      <View style={styles.backgroundContainer}>
        <View style={[styles.glow, styles.glowTop]} />
        <View style={[styles.glow, styles.glowBottom]} />
      </View>

      <View style={styles.content}>
        {/* Status Indicator */}
        <View style={styles.statusWrapper}>
          <View style={styles.statusBadge}>
            <View style={[
              styles.statusDot, 
              { backgroundColor: state === 'RECORDING' ? '#ef4444' : '#6366f1' },
              state !== 'RECORDING' && { opacity: 0.5 }
            ]} />
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        </View>

        {/* Microphone Button */}
        <View style={styles.micContainer}>
          {state === 'RECORDING' && (
            <Animated.View 
              style={[
                styles.pulseRing,
                animatedButtonStyle
              ]}
            />
          )}
          <TouchableOpacity
            onPressIn={startRecording}
            onPressOut={stopRecording}
            activeOpacity={0.8}
            style={styles.micButtonWrapper}
          >
            <LinearGradient
              colors={getStatusColor()}
              style={styles.micGradient}
            >
              {state === 'PROCESSING' || state === 'SENDING' ? (
                <ActivityIndicator size="large" color="white" />
              ) : (
                <Ionicons 
                  name={state === 'SPEAKING' ? "volume-high" : "mic"} 
                  size={48} 
                  color="white" 
                />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Transcript Area */}
        <View style={styles.transcriptWrapper}>
          <View style={styles.transcriptCard}>
            {error ? (
              <Text style={styles.errorText}>⚠️ {error}</Text>
            ) : (
              <Text style={styles.transcriptText}>
                {transcript || "What can I help you with today?"}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Footer Branding */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>FarmVoice Assistant</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // slate-50
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.1, // Adjusted for light theme subtlety
  },
  glowTop: {
    top: -80,
    left: -80,
    backgroundColor: '#6366f1', // indigo-500
  },
  glowBottom: {
    bottom: -80,
    right: -80,
    backgroundColor: '#3b82f6', // blue-500
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  statusWrapper: {
    marginBottom: 48,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#e2e8f0', // slate-200
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#475569', // slate-600
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  micContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  micButtonWrapper: {
    zIndex: 10,
  },
  micGradient: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 20,
  },
  transcriptWrapper: {
    marginTop: 64,
    width: '100%',
    maxWidth: 400,
  },
  transcriptCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#f1f5f9', // slate-100
    minHeight: 120,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
  },
  errorText: {
    color: '#ef4444', // red-500
    textAlign: 'center',
    fontWeight: '500',
  },
  transcriptText: {
    color: '#0f172a', // slate-900
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 28,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    alignItems: 'center',
    width: '100%',
  },
  footerText: {
    color: '#cbd5e1', // slate-300
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 4,
  },
});




