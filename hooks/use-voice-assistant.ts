import { useState, useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { getSocketUrl } from '@/constants/Config';

export type AssistantState = 'IDLE' | 'RECORDING' | 'SENDING' | 'PROCESSING' | 'SPEAKING' | 'ERROR';

export function useVoiceAssistant() {
  const [state, setState] = useState<AssistantState>('IDLE');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // Initialize WebSocket
  useEffect(() => {
    const connect = () => {
      const socket = new WebSocket(getSocketUrl());

      socket.onopen = () => {
        console.log('Connected to Voice Server');
        setError(null);
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'TRANSCRIPT') {
          setTranscript(data.text);
          setState('PROCESSING');
        } else if (data.type === 'RESPONSE') {
          setState('SPEAKING');
          if (data.text) {
            Speech.speak(data.text, {
              onDone: () => setState('IDLE'),
              onError: (err) => {
                console.error('TTS Error:', err);
                setState('IDLE');
              },
            });
          } else {
            setState('IDLE');
          }
        }
      };

      socket.onerror = (e) => {
        console.error('WebSocket Error:', e);
        setError('Server unreachable. Check your IP/Port.');
      };

      socket.onclose = () => {
        console.log('Disconnected. Retrying in 5s...');
        setTimeout(connect, 5000);
      };

      socketRef.current = socket;
    };

    connect();

    return () => {
      socketRef.current?.close();
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // 1. Request Permissions
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        setError('Microphone permission denied');
        return;
      }

      // 2. Set Audio Mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // 3. Cleanup existing recording
      if (recordingRef.current) {
        try {
          const status = await recordingRef.current.getStatusAsync();
          if (status.canRecord) {
            await recordingRef.current.stopAndUnloadAsync();
          }
        } catch (e) {}
        recordingRef.current = null;
      }

      // 4. Create and Prepare new recording
      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      });

      recordingRef.current = recording;
      setState('RECORDING');
      setError(null);
    } catch (err) {
      console.error('Failed to start recording', err);
      setError('Failed to start recording');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    // Only stop if we are actually recording
    if (!recordingRef.current || state !== 'RECORDING') return;

    setState('SENDING');
    try {
      // 1. Ensure a minimum recording duration of 500ms
      // This prevents the "no valid audio data" error on quick taps
      await new Promise(resolve => setTimeout(resolve, 500));

      const status = await recordingRef.current.getStatusAsync();
      if (status.canRecord) {
        await recordingRef.current.stopAndUnloadAsync();
      }
      
      const uri = recordingRef.current.getURI();
      const finalRecording = recordingRef.current;
      recordingRef.current = null;

      if (uri && socketRef.current?.readyState === WebSocket.OPEN) {
        // Use fetch to read the local file as a blob and convert to base64
        // This is a universal method that avoids SDK 54/55 filesystem deprecations
        const response = await fetch(uri);
        const blob = await response.blob();
        const base64Audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Extract only the base64 part
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        socketRef.current.send(JSON.stringify({
          type: 'AUDIO_BLOB',
          audio: base64Audio,
          format: 'wav',
        }));
      } else {
        if (!uri) setError('Recording failed');
        else if (socketRef.current?.readyState !== WebSocket.OPEN) setError('Socket not connected');
        setState('IDLE');
      }
    } catch (err: any) {
      if (err.message?.includes('no valid audio data')) {
        setError('Hold longer to speak!');
      } else if (err.message?.includes('Recorder does not exist')) {
        console.warn('Recorder already stopped.');
      } else {
        console.error('Failed to stop recording', err);
        setError('Failed to process audio');
      }
      setState('IDLE');
    }
  }, [state]);

  return {
    state,
    transcript,
    error,
    startRecording,
    stopRecording,
  };
}
