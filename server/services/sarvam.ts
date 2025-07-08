interface SarvamConfig {
  apiKey: string;
  baseUrl: string;
}

interface SarvamTTSRequest {
  inputs: string[];
  target_language_code: string;
  speaker: string;
  model: string;
}

interface SarvamTTSResponse {
  audios: string[];
}

interface SarvamSTTRequest {
  file: Buffer;
  model: string;
  language_code: string;
}

interface SarvamSTTResponse {
  transcript: string;
  language_code: string;
  confidence: number;
}

interface SarvamTranslateRequest {
  input: string;
  source_language_code: string;
  target_language_code: string;
  model: string;
}

interface SarvamTranslateResponse {
  translated_text: string;
}

export class SarvamService {
  private config: SarvamConfig;

  constructor() {
    this.config = {
      apiKey: process.env.SARVAM_API_KEY || process.env.SARVAM_API_KEY_ENV_VAR || "",
      baseUrl: "https://api.sarvam.ai"
    };
  }

  async textToSpeech(text: string, language: string): Promise<string> {
    const speaker = this.getSpeakerForLanguage(language);
    
    const request: SarvamTTSRequest = {
      inputs: [text],
      target_language_code: language,
      speaker,
      model: "bulbul:v2"
    };

    try {
      const response = await fetch(`${this.config.baseUrl}/text-to-speech/convert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Sarvam TTS API error: ${response.status} ${response.statusText}`);
      }

      const data: SarvamTTSResponse = await response.json();
      return data.audios[0]; // Base64 encoded audio
    } catch (error) {
      console.error('Error in Sarvam TTS:', error);
      throw error;
    }
  }

  async speechToText(audioBuffer: Buffer, language: string): Promise<SarvamSTTResponse> {
    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer]), 'audio.wav');
    formData.append('model', 'saarika:v2.5');
    formData.append('language_code', language);

    try {
      const response = await fetch(`${this.config.baseUrl}/speech-to-text/transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Sarvam STT API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in Sarvam STT:', error);
      throw error;
    }
  }

  async translateText(text: string, sourceLanguage: string, targetLanguage: string): Promise<string> {
    const request: SarvamTranslateRequest = {
      input: text,
      source_language_code: sourceLanguage,
      target_language_code: targetLanguage,
      model: "mayura:v1"
    };

    try {
      const response = await fetch(`${this.config.baseUrl}/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Sarvam Translate API error: ${response.status} ${response.statusText}`);
      }

      const data: SarvamTranslateResponse = await response.json();
      return data.translated_text;
    } catch (error) {
      console.error('Error in Sarvam Translation:', error);
      throw error;
    }
  }

  async detectLanguage(text: string): Promise<string> {
    // Use Sarvam's language detection capabilities
    try {
      const response = await fetch(`${this.config.baseUrl}/speech-to-text/transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: text,
          model: "saarika:v2.5",
          language_code: "unknown" // Auto-detect
        })
      });

      if (!response.ok) {
        throw new Error(`Sarvam Language Detection API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.language_code || 'hi-IN'; // Default to Hindi
    } catch (error) {
      console.error('Error in language detection:', error);
      return 'hi-IN'; // Fallback to Hindi
    }
  }

  private getSpeakerForLanguage(language: string): string {
    const speakerMap: { [key: string]: string } = {
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
    return speakerMap[language] || 'meera';
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/text-to-speech/convert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: ["Test"],
          target_language_code: "hi-IN",
          speaker: "meera",
          model: "bulbul:v2"
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Sarvam connection validation failed:', error);
      return false;
    }
  }
}

export const sarvamService = new SarvamService();
