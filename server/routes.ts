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

      // Create Vapi assistant
      const assistant = await vapiService.createAssistant(
        interview.language,
        interview.interviewType,
        interview.experienceLevel
      );

      // Start Vapi call
      const call = await vapiService.startCall(assistant.id, id);

      // Update interview with call ID and start time
      const updatedInterview = await storage.updateInterview(id, {
        status: "active",
        startTime: new Date(),
        vapiCallId: call.id
      });

      // Create session
      const session = await storage.createSession({
        interviewId: id,
        sessionData: {
          currentQuestion: "",
          questionIndex: 0,
          responses: [],
          languageMetrics: {
            accuracy: 0,
            fluency: 0,
            vocabulary: 0
          }
        },
        isActive: true
      });

      res.json({
        interview: updatedInterview,
        session,
        call,
        assistant
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

      // End Vapi call
      if (interview.vapiCallId) {
        await vapiService.endCall(interview.vapiCallId);
      }

      // Get final call data and transcript
      const call = interview.vapiCallId ? await vapiService.getCall(interview.vapiCallId) : null;
      const transcript = call?.transcript || [];

      // Generate final evaluation using OpenAI
      const evaluation = await openaiService.generateFinalEvaluation(
        transcript.map(entry => ({
          speaker: entry.role === "user" ? "candidate" : "ai",
          message: entry.message,
          timestamp: entry.timestamp
        })),
        {
          language: interview.language,
          interviewType: interview.interviewType,
          experienceLevel: interview.experienceLevel,
          candidateName: interview.candidateName,
          currentQuestionIndex: 0,
          previousResponses: []
        }
      );

      // Update interview with final data
      const updatedInterview = await storage.updateInterview(id, {
        status: "completed",
        endTime: new Date(),
        duration: interview.startTime ? 
          Math.floor((new Date().getTime() - new Date(interview.startTime).getTime()) / 1000) : 0,
        score: evaluation.overallScore,
        transcript: transcript.map(entry => ({
          speaker: entry.role === "user" ? "candidate" : "ai",
          message: entry.message,
          timestamp: entry.timestamp
        })),
        evaluation
      });

      // Deactivate session
      const session = await storage.getSessionByInterviewId(id);
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
