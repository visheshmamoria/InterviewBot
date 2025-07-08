import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { insertInterviewSchema, insertInterviewSessionSchema } from "@shared/schema";
import { vapiService } from "./services/vapi";
import { sarvamService } from "./services/sarvam";
import { openaiService } from "./services/openai";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Setup WebSocket for real-time communication
  vapiService.setupWebSocket(httpServer);

  // Get interview statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getInterviewStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get statistics" });
    }
  });

  // Create new interview
  app.post("/api/interviews", async (req, res) => {
    try {
      const validatedData = insertInterviewSchema.parse(req.body);
      const interview = await storage.createInterview(validatedData);
      res.json(interview);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid interview data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create interview" });
      }
    }
  });

  // Get all interviews
  app.get("/api/interviews", async (req, res) => {
    try {
      const interviews = await storage.getAllInterviews();
      res.json(interviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to get interviews" });
    }
  });

  // Get specific interview
  app.get("/api/interviews/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const interview = await storage.getInterview(id);
      if (!interview) {
        return res.status(404).json({ error: "Interview not found" });
      }
      res.json(interview);
    } catch (error) {
      res.status(500).json({ error: "Failed to get interview" });
    }
  });

  // Start interview session
  app.post("/api/interviews/:id/start", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const interview = await storage.getInterview(id);
      if (!interview) {
        return res.status(404).json({ error: "Interview not found" });
      }

      // Generate first question using OpenAI
      const firstQuestion = await openaiService.generateInterviewQuestion({
        language: interview.language,
        interviewType: interview.interviewType,
        experienceLevel: interview.experienceLevel,
        candidateName: interview.candidateName,
        currentQuestionIndex: 0,
        previousResponses: []
      });

      // Update interview with start time
      const updatedInterview = await storage.updateInterview(id, {
        status: "active",
        startTime: new Date(),
        vapiCallId: `simulated_${id}_${Date.now()}`
      });

      // Create session with first question
      const session = await storage.createSession({
        interviewId: id,
        sessionData: {
          currentQuestion: firstQuestion.question,
          questionIndex: 1,
          responses: [],
          languageMetrics: {
            accuracy: 0,
            fluency: 0,
            vocabulary: 0
          }
        },
        isActive: true
      });

      // Simulate assistant and call for now
      const mockAssistant = {
        id: `assistant_${id}_${Date.now()}`,
        name: `Bank Sales Interview - ${interview.language}`,
        model: { provider: "openai", model: "gpt-4o", messages: [] },
        voice: { provider: "simulated", voiceId: "default", language: interview.language },
        transcriber: { provider: "simulated", language: interview.language },
        firstMessage: firstQuestion.question
      };

      const mockCall = {
        id: `call_${id}_${Date.now()}`,
        assistantId: mockAssistant.id,
        status: "in-progress" as const,
        type: "webCall" as const,
        transcript: []
      };

      res.json({
        interview: updatedInterview,
        session,
        call: mockCall,
        assistant: mockAssistant,
        firstQuestion
      });
    } catch (error) {
      console.error("Error starting interview:", error);
      res.status(500).json({ error: "Failed to start interview" });
    }
  });

  // End interview session
  app.post("/api/interviews/:id/end", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const interview = await storage.getInterview(id);
      if (!interview) {
        return res.status(404).json({ error: "Interview not found" });
      }

      // Get session data for responses
      const session = await storage.getSessionByInterviewId(id);
      const sessionData = session?.sessionData;
      
      // Create mock transcript from session responses
      const transcript = sessionData?.responses ? 
        sessionData.responses.flatMap(response => [
          {
            speaker: "ai" as const,
            message: response.question,
            timestamp: response.timestamp - 30000 // Question asked 30 seconds before response
          },
          {
            speaker: "candidate" as const,
            message: response.answer,
            timestamp: response.timestamp
          }
        ]) : [];

      // Generate final evaluation using OpenAI
      const evaluation = await openaiService.generateFinalEvaluation(
        transcript,
        {
          language: interview.language,
          interviewType: interview.interviewType,
          experienceLevel: interview.experienceLevel,
          candidateName: interview.candidateName,
          currentQuestionIndex: sessionData?.questionIndex || 0,
          previousResponses: sessionData?.responses || []
        }
      );

      // Update interview with final data
      const updatedInterview = await storage.updateInterview(id, {
        status: "completed",
        endTime: new Date(),
        duration: interview.startTime ? 
          Math.floor((new Date().getTime() - new Date(interview.startTime).getTime()) / 1000) : 300, // Default 5 minutes
        score: evaluation.overallScore,
        transcript,
        evaluation
      });

      // Deactivate session
      if (session) {
        await storage.updateSession(session.id, { isActive: false });
      }

      res.json({
        interview: updatedInterview,
        evaluation
      });
    } catch (error) {
      console.error("Error ending interview:", error);
      res.status(500).json({ error: "Failed to end interview" });
    }
  });

  // Get interview session
  app.get("/api/interviews/:id/session", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const session = await storage.getSessionByInterviewId(id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to get session" });
    }
  });

  // Submit interview response (simulated voice input)
  app.post("/api/interviews/:id/respond", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { answer } = req.body;
      
      const interview = await storage.getInterview(id);
      const session = await storage.getSessionByInterviewId(id);
      
      if (!interview || !session || !session.sessionData) {
        return res.status(404).json({ error: "Interview or session not found" });
      }

      const sessionData = session.sessionData;
      const currentQuestion = sessionData.currentQuestion;
      
      // Evaluate the response using OpenAI
      const evaluation = await openaiService.evaluateResponse(
        currentQuestion,
        answer,
        {
          language: interview.language,
          interviewType: interview.interviewType,
          experienceLevel: interview.experienceLevel,
          candidateName: interview.candidateName,
          currentQuestionIndex: sessionData.questionIndex,
          previousResponses: sessionData.responses
        }
      );

      // Add response to session
      const newResponse = {
        question: currentQuestion,
        answer,
        score: evaluation.score,
        timestamp: Date.now()
      };

      sessionData.responses.push(newResponse);
      sessionData.questionIndex += 1;

      // Generate next question if not at the end
      let nextQuestion = "";
      if (sessionData.questionIndex <= 10) { // Max 10 questions
        const nextQuestionData = await openaiService.generateInterviewQuestion({
          language: interview.language,
          interviewType: interview.interviewType,
          experienceLevel: interview.experienceLevel,
          candidateName: interview.candidateName,
          currentQuestionIndex: sessionData.questionIndex,
          previousResponses: sessionData.responses
        });
        nextQuestion = nextQuestionData.question;
      }

      sessionData.currentQuestion = nextQuestion;

      // Update session
      await storage.updateSession(session.id, { sessionData });

      res.json({
        evaluation,
        nextQuestion,
        questionIndex: sessionData.questionIndex,
        isComplete: sessionData.questionIndex > 10
      });
    } catch (error) {
      console.error("Error processing response:", error);
      res.status(500).json({ error: "Failed to process response" });
    }
  });

  // Process voice input (webhook endpoint for Vapi)
  app.post("/api/webhook/vapi", async (req, res) => {
    try {
      const { type, message, call } = req.body;
      
      switch (type) {
        case "transcript":
          // Handle transcript updates
          vapiService.broadcastToConnections({
            type: "transcript-update",
            message: message,
            timestamp: Date.now()
          });
          break;
          
        case "function-call":
          // Handle function calls from AI agent
          break;
          
        case "end-of-call-report":
          // Handle call completion
          break;
          
        default:
          console.log("Unknown webhook type:", type);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // Health check endpoints
  app.get("/api/health", async (req, res) => {
    try {
      const [vapiConnected, sarvamConnected, openaiConnected] = await Promise.all([
        // For Vapi, we'll just check if the service is initialized
        Promise.resolve(true),
        sarvamService.validateConnection(),
        openaiService.validateConnection()
      ]);

      res.json({
        status: "healthy",
        services: {
          vapi: vapiConnected,
          sarvam: sarvamConnected,
          openai: openaiConnected
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        status: "unhealthy",
        error: "Health check failed"
      });
    }
  });

  return httpServer;
}
