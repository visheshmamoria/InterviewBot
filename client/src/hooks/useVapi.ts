import { useState, useEffect, useCallback } from "react";

interface VapiConfig {
  apiKey: string;
  baseUrl: string;
}

interface VapiState {
  isConnected: boolean;
  isCallActive: boolean;
  currentCall: any;
  transcript: Array<{
    speaker: "ai" | "candidate";
    message: string;
    timestamp: number;
  }>;
  error: string | null;
}

export function useVapi() {
  const [state, setState] = useState<VapiState>({
    isConnected: false,
    isCallActive: false,
    currentCall: null,
    transcript: [],
    error: null
  });

  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/vapi`;
    
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      setState(prev => ({ ...prev, isConnected: true, error: null }));
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    websocket.onclose = () => {
      setState(prev => ({ ...prev, isConnected: false }));
    };

    websocket.onerror = (error) => {
      setState(prev => ({ ...prev, error: "WebSocket connection error" }));
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case "connection-established":
        setState(prev => ({ ...prev, isConnected: true }));
        break;
        
      case "transcript-update":
        setState(prev => ({
          ...prev,
          transcript: [
            ...prev.transcript,
            {
              speaker: data.speaker || "ai",
              message: data.message,
              timestamp: data.timestamp
            }
          ]
        }));
        break;
        
      case "call-started":
        setState(prev => ({
          ...prev,
          isCallActive: true,
          currentCall: data.call
        }));
        break;
        
      case "call-ended":
        setState(prev => ({
          ...prev,
          isCallActive: false,
          currentCall: null
        }));
        break;
        
      default:
        console.log("Unknown WebSocket message type:", data.type);
    }
  }, []);

  const startCall = useCallback(async (interviewId: number) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }

    try {
      const response = await fetch(`/api/interviews/${interviewId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Send start message via WebSocket
      ws.send(JSON.stringify({
        type: "start-interview",
        interviewId,
        assistantId: data.assistant.id,
        callId: data.call.id
      }));

      return data;
    } catch (error) {
      setState(prev => ({ ...prev, error: "Failed to start call" }));
      throw error;
    }
  }, [ws]);

  const endCall = useCallback(async (interviewId: number) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }

    try {
      const response = await fetch(`/api/interviews/${interviewId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Send end message via WebSocket
      ws.send(JSON.stringify({
        type: "end-interview",
        interviewId
      }));

      return data;
    } catch (error) {
      setState(prev => ({ ...prev, error: "Failed to end call" }));
      throw error;
    }
  }, [ws]);

  const sendVoiceInput = useCallback((audioData: ArrayBuffer) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    ws.send(JSON.stringify({
      type: "voice-input",
      audioData: Array.from(new Uint8Array(audioData))
    }));
  }, [ws]);

  return {
    ...state,
    startCall,
    endCall,
    sendVoiceInput
  };
}
