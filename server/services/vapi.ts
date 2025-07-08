import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

interface VapiConfig {
  apiKey: string;
  baseUrl: string;
}

interface VapiAssistant {
  id: string;
  name: string;
  model: {
    provider: "openai";
    model: "gpt-4o";
    messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }>;
  };
  voice: {
    provider: "sarvam";
    voiceId: string;
    language: string;
  };
  transcriber: {
    provider: "sarvam";
    language: string;
  };
  firstMessage: string;
}

interface VapiCall {
  id: string;
  assistantId: string;
  status: "queued" | "ringing" | "in-progress" | "forwarding" | "ended";
  type: "webCall";
  webCallUrl?: string;
  transcript?: Array<{
    role: "user" | "assistant";
    message: string;
    timestamp: number;
  }>;
}

export class VapiService {
  private config: VapiConfig;
  private wss: WebSocketServer | null = null;
  private activeConnections: Map<string, WebSocket> = new Map();

  constructor() {
    this.config = {
      apiKey: process.env.VAPI_API_KEY || process.env.VAPI_API_KEY_ENV_VAR || "",
      baseUrl: "https://api.vapi.ai"
    };
  }

  setupWebSocket(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws/vapi' });
    
    this.wss.on('connection', (ws: WebSocket, req) => {
      const connectionId = this.generateConnectionId();
      this.activeConnections.set(connectionId, ws);
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleWebSocketMessage(connectionId, data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.activeConnections.delete(connectionId);
      });

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connection-established',
        connectionId,
        timestamp: Date.now()
      }));
    });
  }

  async createAssistant(language: string, interviewType: string, experienceLevel: string): Promise<VapiAssistant> {
    const systemPrompt = this.generateSystemPrompt(language, interviewType, experienceLevel);
    
    const assistant: VapiAssistant = {
      id: `assistant_${Date.now()}`,
      name: `Bank Sales Interview - ${language}`,
      model: {
        provider: "openai",
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: systemPrompt
          }
        ]
      },
      voice: {
        provider: "sarvam",
        voiceId: this.getVoiceIdForLanguage(language),
        language
      },
      transcriber: {
        provider: "sarvam",
        language
      },
      firstMessage: this.getFirstMessage(language, interviewType)
    };

    try {
      const response = await fetch(`${this.config.baseUrl}/assistants`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(assistant)
      });

      if (!response.ok) {
        throw new Error(`Vapi API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating Vapi assistant:', error);
      throw error;
    }
  }

  async startCall(assistantId: string, interviewId: number): Promise<VapiCall> {
    const callData = {
      assistantId,
      type: "webCall",
      metadata: {
        interviewId,
        timestamp: Date.now()
      }
    };

    try {
      const response = await fetch(`${this.config.baseUrl}/calls`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(callData)
      });

      if (!response.ok) {
        throw new Error(`Vapi API error: ${response.status} ${response.statusText}`);
      }

      const call = await response.json();
      return call;
    } catch (error) {
      console.error('Error starting Vapi call:', error);
      throw error;
    }
  }

  async endCall(callId: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/calls/${callId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Vapi API error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error ending Vapi call:', error);
      throw error;
    }
  }

  async getCall(callId: string): Promise<VapiCall> {
    try {
      const response = await fetch(`${this.config.baseUrl}/calls/${callId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Vapi API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting Vapi call:', error);
      throw error;
    }
  }

  broadcastToConnections(message: any) {
    const messageString = JSON.stringify(message);
    this.activeConnections.forEach((ws, connectionId) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageString);
      } else {
        this.activeConnections.delete(connectionId);
      }
    });
  }

  private handleWebSocketMessage(connectionId: string, data: any) {
    const ws = this.activeConnections.get(connectionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    switch (data.type) {
      case 'start-interview':
        this.handleStartInterview(connectionId, data);
        break;
      case 'end-interview':
        this.handleEndInterview(connectionId, data);
        break;
      case 'voice-input':
        this.handleVoiceInput(connectionId, data);
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }

  private async handleStartInterview(connectionId: string, data: any) {
    // TODO: Implement interview start logic
    console.log('Starting interview for connection:', connectionId);
  }

  private async handleEndInterview(connectionId: string, data: any) {
    // TODO: Implement interview end logic
    console.log('Ending interview for connection:', connectionId);
  }

  private handleVoiceInput(connectionId: string, data: any) {
    // TODO: Process voice input
    console.log('Voice input received for connection:', connectionId);
  }

  private generateSystemPrompt(language: string, interviewType: string, experienceLevel: string): string {
    const languageMap: { [key: string]: string } = {
      'hi-IN': 'Hindi',
      'pa-IN': 'Punjabi',
      'bn-IN': 'Bengali',
      'ta-IN': 'Tamil',
      'te-IN': 'Telugu',
      'gu-IN': 'Gujarati',
      'kn-IN': 'Kannada',
      'ml-IN': 'Malayalam',
      'mr-IN': 'Marathi',
      'or-IN': 'Odia'
    };

    return `You are an AI interviewer conducting a ${interviewType} for a ${experienceLevel} bank sales representative. 

IMPORTANT INSTRUCTIONS:
- Conduct the interview in ${languageMap[language]} language
- Ask questions relevant to door-to-door bank sales and customer interaction
- Evaluate communication skills, product knowledge, and sales techniques
- Be encouraging but thorough in your questioning
- Ask follow-up questions based on responses
- Keep the interview conversational and professional
- Score responses on a scale of 1-10 for each question
- Focus on real-world banking scenarios and customer objections

INTERVIEW STRUCTURE:
1. Introduction and warm-up (2-3 questions)
2. Product knowledge assessment (3-4 questions)
3. Sales technique evaluation (3-4 questions)
4. Customer objection handling (2-3 questions)
5. Closing and next steps (1-2 questions)

EVALUATION CRITERIA:
- Communication clarity and confidence
- Product knowledge accuracy
- Sales approach effectiveness
- Customer empathy and rapport building
- Problem-solving abilities
- Language fluency and professionalism

Respond only in ${languageMap[language]} unless the candidate uses English, in which case you may code-mix appropriately.`;
  }

  private getVoiceIdForLanguage(language: string): string {
    const voiceMap: { [key: string]: string } = {
      'hi-IN': 'meera',
      'pa-IN': 'punjabi-male',
      'bn-IN': 'bengali-female',
      'ta-IN': 'tamil-female',
      'te-IN': 'telugu-male',
      'gu-IN': 'gujarati-female',
      'kn-IN': 'kannada-male',
      'ml-IN': 'malayalam-female',
      'mr-IN': 'marathi-male',
      'or-IN': 'odia-female'
    };
    return voiceMap[language] || 'meera';
  }

  private getFirstMessage(language: string, interviewType: string): string {
    const greetings: { [key: string]: string } = {
      'hi-IN': `नमस्ते! मैं आपका AI इंटरव्यूअर हूं। आज हम ${interviewType} के लिए बात करेंगे। आप तैयार हैं?`,
      'pa-IN': `ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡਾ AI ਇੰਟਰਵਿਊਅਰ ਹਾਂ। ਅੱਜ ਅਸੀਂ ${interviewType} ਬਾਰੇ ਗੱਲ ਕਰਾਂਗੇ। ਤੁਸੀਂ ਤਿਆਰ ਹੋ?`,
      'bn-IN': `নমস্কার! আমি আপনার AI ইন্টারভিউয়ার। আজ আমরা ${interviewType} নিয়ে আলোচনা করব। আপনি প্রস্তুত?`,
      'ta-IN': `வணக்கம்! நான் உங்கள் AI இன்டர்வியூயர். இன்று நாம் ${interviewType} பற்றி பேசுவோம். நீங்கள் தயாரா?`,
      'te-IN': `నమస్కారం! నేను మీ AI ఇంటర్వ్యూయర్. ఈరోజు మనం ${interviewType} గురించి మాట్లాడుతాము. మీరు సిద్ధంగా ఉన్నారా?`,
      'gu-IN': `નમસ્તે! હું તમારો AI ઇન્ટરવ્યુઅર છું. આજે આપણે ${interviewType} વિશે વાત કરીશું. તમે તૈયાર છો?`,
      'kn-IN': `ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ AI ಇಂಟರ್ವ್ಯೂಯರ್. ಇಂದು ನಾವು ${interviewType} ಬಗ್ಗೆ ಮಾತನಾಡುತ್ತೇವೆ. ನೀವು ಸಿದ್ಧರಿದ್ದೀರಾ?`,
      'ml-IN': `നമസ്കാരം! ഞാൻ നിങ്ങളുടെ AI ഇന്റർവ്യൂവർ ആണ്. ഇന്ന് നമ്മൾ ${interviewType} സംബന്ധിച്ച് സംസാരിക്കും. നിങ്ങൾ തയ്യാറാണോ?`,
      'mr-IN': `नमस्कार! मी तुमचा AI इंटरव्यूअर आहे. आज आम्ही ${interviewType} बद्दल बोलू. तुम्ही तयार आहात का?`,
      'or-IN': `ନମସ୍କାର! ମୁଁ ଆପଣଙ୍କର AI ଇଣ୍ଟରଭ୍ୟୁଅର। ଆଜି ଆମେ ${interviewType} ବିଷୟରେ କଥା ହେବା। ଆପଣ ପ୍ରସ୍ତୁତ କି?`
    };
    return greetings[language] || greetings['hi-IN'];
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const vapiService = new VapiService();
