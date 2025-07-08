import OpenAI from "openai";
import { InterviewEvaluation, TranscriptEntry } from "@shared/schema";

interface InterviewContext {
  language: string;
  interviewType: string;
  experienceLevel: string;
  candidateName: string;
  currentQuestionIndex: number;
  previousResponses: Array<{
    question: string;
    answer: string;
    score: number;
  }>;
}

interface QuestionResponse {
  question: string;
  expectedKeyPoints: string[];
  followUpQuestions: string[];
  scoringCriteria: {
    excellent: string;
    good: string;
    average: string;
    poor: string;
  };
}

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
    });
  }

  async generateInterviewQuestion(context: InterviewContext): Promise<QuestionResponse> {
    const prompt = this.buildQuestionPrompt(context);

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert interviewer for bank sales positions in India. Generate contextual interview questions based on the provided information. Always respond in valid JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1000
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result as QuestionResponse;
    } catch (error) {
      console.error('Error generating interview question:', error);
      throw error;
    }
  }

  async evaluateResponse(
    question: string,
    response: string,
    context: InterviewContext
  ): Promise<{
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
    followUpSuggestion: string;
  }> {
    const prompt = this.buildEvaluationPrompt(question, response, context);

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert evaluator for bank sales interviews. Provide detailed, constructive feedback on candidate responses. Always respond in valid JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 800
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      return result;
    } catch (error) {
      console.error('Error evaluating response:', error);
      throw error;
    }
  }

  async generateFinalEvaluation(
    transcript: TranscriptEntry[],
    context: InterviewContext
  ): Promise<InterviewEvaluation> {
    const prompt = this.buildFinalEvaluationPrompt(transcript, context);

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a senior hiring manager evaluating bank sales candidates. Provide comprehensive evaluation with scores and recommendations. Always respond in valid JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 1200
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      return result as InterviewEvaluation;
    } catch (error) {
      console.error('Error generating final evaluation:', error);
      throw error;
    }
  }

  async translateToEnglish(text: string, sourceLanguage: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `Translate the following text from ${sourceLanguage} to English. Maintain the original meaning and tone.`
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      });

      return response.choices[0].message.content || text;
    } catch (error) {
      console.error('Error translating text:', error);
      return text; // Return original text if translation fails
    }
  }

  private buildQuestionPrompt(context: InterviewContext): string {
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

    return `Generate an interview question for a bank sales representative position with the following context:

Language: ${languageMap[context.language]}
Interview Type: ${context.interviewType}
Experience Level: ${context.experienceLevel}
Candidate Name: ${context.candidateName}
Current Question Index: ${context.currentQuestionIndex}
Previous Responses: ${JSON.stringify(context.previousResponses)}

Requirements:
1. Question should be in ${languageMap[context.language]} language
2. Focus on door-to-door banking sales scenarios
3. Make it relevant to ${context.experienceLevel} level candidates
4. Build upon previous responses if available
5. Include realistic banking scenarios and customer objections

Respond in JSON format with:
{
  "question": "The interview question in ${languageMap[context.language]}",
  "expectedKeyPoints": ["key point 1", "key point 2", "key point 3"],
  "followUpQuestions": ["follow up 1", "follow up 2"],
  "scoringCriteria": {
    "excellent": "Criteria for 9-10 score",
    "good": "Criteria for 7-8 score", 
    "average": "Criteria for 5-6 score",
    "poor": "Criteria for 1-4 score"
  }
}`;
  }

  private buildEvaluationPrompt(question: string, response: string, context: InterviewContext): string {
    return `Evaluate this interview response for a bank sales position:

Question: ${question}
Response: ${response}
Context: ${JSON.stringify(context)}

Evaluation Criteria:
1. Communication clarity and confidence
2. Product knowledge and accuracy
3. Sales technique effectiveness
4. Customer empathy and rapport
5. Problem-solving approach
6. Language proficiency

Respond in JSON format with:
{
  "score": 8,
  "feedback": "Detailed feedback on the response",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement area 1", "improvement area 2"],
  "followUpSuggestion": "Suggested follow-up question or topic"
}

Score should be 1-10 where:
- 9-10: Excellent response demonstrating mastery
- 7-8: Good response with minor areas for improvement
- 5-6: Average response meeting basic requirements
- 3-4: Below average response with significant gaps
- 1-2: Poor response requiring major improvement`;
  }

  private buildFinalEvaluationPrompt(transcript: TranscriptEntry[], context: InterviewContext): string {
    return `Provide a comprehensive evaluation of this bank sales interview:

Transcript: ${JSON.stringify(transcript)}
Context: ${JSON.stringify(context)}

Analyze the candidate's performance across:
1. Communication Skills (clarity, confidence, language proficiency)
2. Product Knowledge (banking products, procedures, regulations)
3. Sales Technique (approach, persuasion, closing skills)
4. Customer Handling (empathy, objection handling, relationship building)
5. Language Skills (fluency, professional communication)

Respond in JSON format with:
{
  "overallScore": 85,
  "categories": {
    "communication": 8,
    "productKnowledge": 7,
    "salesTechnique": 9,
    "customerHandling": 8,
    "languageSkills": 9
  },
  "feedback": "Comprehensive feedback on overall performance",
  "recommendations": [
    "Specific recommendation 1",
    "Specific recommendation 2",
    "Specific recommendation 3"
  ]
}

Overall score should be 0-100, category scores should be 1-10.`;
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: "Test connection" }],
        max_tokens: 10
      });

      return response.choices.length > 0;
    } catch (error) {
      console.error('OpenAI connection validation failed:', error);
      return false;
    }
  }
}

export const openaiService = new OpenAIService();
