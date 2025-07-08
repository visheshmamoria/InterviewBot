import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSpeechOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  addEventListener(type: 'result', listener: (ev: SpeechRecognitionEvent) => void): void;
  addEventListener(type: 'error', listener: (ev: SpeechRecognitionErrorEvent) => void): void;
  addEventListener(type: 'start' | 'end', listener: (ev: Event) => void): void;
}

declare const SpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

export function useSpeech(options: UseSpeechOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef('');
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  useEffect(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionClass);
    
    if (SpeechRecognitionClass) {
      recognitionRef.current = new SpeechRecognitionClass();
      const recognition = recognitionRef.current;
      
      recognition.continuous = options.continuous ?? false; // Set to false for better reliability
      recognition.interimResults = options.interimResults ?? true;
      recognition.lang = options.language || 'en-US'; // Use English for better reliability
      recognition.maxAlternatives = 1;
      
      recognition.addEventListener('result', (event: SpeechRecognitionEvent) => {
        console.log('Speech recognition result event:', event.results);
        let interimTranscriptValue = '';
        let finalTranscriptValue = finalTranscriptRef.current;
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscriptValue += transcript + ' ';
            console.log('Final transcript segment:', transcript);
          } else {
            interimTranscriptValue += transcript;
            console.log('Interim transcript segment:', transcript);
          }
        }
        
        finalTranscriptRef.current = finalTranscriptValue;
        setTranscript(finalTranscriptValue.trim());
        setInterimTranscript(interimTranscriptValue);
      });
      
      recognition.addEventListener('start', () => {
        console.log('Speech recognition started');
        setIsListening(true);
        setError(null);
      });
      
      recognition.addEventListener('end', () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      });
      
      recognition.addEventListener('error', (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error, event.message);
        setError(event.error);
        setIsListening(false);
        
        if (event.error === 'network') {
          console.log('Network error - speech recognition unavailable');
          setError('network');
        }
      });
      
      recognition.addEventListener('soundstart', () => {
        console.log('Sound detected by speech recognition');
      });
      
      recognition.addEventListener('soundend', () => {
        console.log('Sound ended in speech recognition');
      });
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [options.continuous, options.interimResults, options.language]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      console.log('Starting speech recognition...');
      finalTranscriptRef.current = '';
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      retryCountRef.current = 0; // Reset retry counter
      
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setError('Failed to start recording');
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window);
  }, []);

  const speak = useCallback((text: string, options?: { lang?: string; rate?: number; pitch?: number; volume?: number }) => {
    if (!isSupported || !text) {
      console.log('Speech synthesis not supported or no text provided');
      return Promise.reject('Not supported or no text');
    }

    return new Promise<void>((resolve, reject) => {
      try {
        // Cancel any ongoing speech first
        if (speechSynthesis.speaking || speechSynthesis.pending) {
          speechSynthesis.cancel();
        }
        
        // Wait a bit for cancellation to complete
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = options?.lang || 'en-US';
          utterance.rate = options?.rate || 0.9;
          utterance.pitch = options?.pitch || 1;
          utterance.volume = options?.volume || 1;

          utterance.onstart = () => {
            console.log('Speech started:', text.substring(0, 50) + '...');
            setIsSpeaking(true);
          };
          
          utterance.onend = () => {
            console.log('Speech ended successfully');
            setIsSpeaking(false);
            resolve();
          };
          
          utterance.onerror = (event) => {
            console.error('Speech error:', event.error);
            setIsSpeaking(false);
            reject(event.error);
          };

          // Speak the utterance
          speechSynthesis.speak(utterance);
        }, 100);
      } catch (error) {
        console.error('Error in speak function:', error);
        setIsSpeaking(false);
        reject(error);
      }
    });
  }, [isSupported]);

  const stop = useCallback(() => {
    try {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
  };
}