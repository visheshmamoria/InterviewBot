import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const interviews = pgTable("interviews", {
  id: serial("id").primaryKey(),
  candidateName: text("candidate_name").notNull(),
  language: text("language").notNull(),
  interviewType: text("interview_type").notNull(),
  experienceLevel: text("experience_level").notNull(),
  status: text("status").notNull().default("pending"), // pending, active, completed, cancelled
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds
  score: integer("score"), // 0-100
  transcript: json("transcript").$type<TranscriptEntry[]>(),
  evaluation: json("evaluation").$type<InterviewEvaluation>(),
  vapiCallId: text("vapi_call_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const interviewSessions = pgTable("interview_sessions", {
  id: serial("id").primaryKey(),
  interviewId: integer("interview_id").references(() => interviews.id),
  sessionData: json("session_data").$type<SessionData>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInterviewSchema = createInsertSchema(interviews).omit({
  id: true,
  createdAt: true,
  startTime: true,
  endTime: true,
  duration: true,
  score: true,
  transcript: true,
  evaluation: true,
  vapiCallId: true,
});

export const insertInterviewSessionSchema = createInsertSchema(interviewSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertInterview = z.infer<typeof insertInterviewSchema>;
export type Interview = typeof interviews.$inferSelect;
export type InsertInterviewSession = z.infer<typeof insertInterviewSessionSchema>;
export type InterviewSession = typeof interviewSessions.$inferSelect;

export interface TranscriptEntry {
  speaker: "ai" | "candidate";
  message: string;
  timestamp: number;
  language?: string;
}

export interface InterviewEvaluation {
  overallScore: number;
  categories: {
    communication: number;
    productKnowledge: number;
    salesTechnique: number;
    customerHandling: number;
    languageSkills: number;
  };
  feedback: string;
  recommendations: string[];
}

export interface SessionData {
  currentQuestion: string;
  questionIndex: number;
  responses: Array<{
    question: string;
    answer: string;
    score: number;
    timestamp: number;
  }>;
  languageMetrics: {
    accuracy: number;
    fluency: number;
    vocabulary: number;
  };
}

export const SUPPORTED_LANGUAGES = [
  { code: "hi-IN", name: "Hindi", flag: "🇮🇳" },
  { code: "pa-IN", name: "Punjabi", flag: "🇮🇳" },
  { code: "bn-IN", name: "Bengali", flag: "🇮🇳" },
  { code: "ta-IN", name: "Tamil", flag: "🇮🇳" },
  { code: "te-IN", name: "Telugu", flag: "🇮🇳" },
  { code: "gu-IN", name: "Gujarati", flag: "🇮🇳" },
  { code: "kn-IN", name: "Kannada", flag: "🇮🇳" },
  { code: "ml-IN", name: "Malayalam", flag: "🇮🇳" },
  { code: "mr-IN", name: "Marathi", flag: "🇮🇳" },
  { code: "or-IN", name: "Odia", flag: "🇮🇳" },
] as const;

export const INTERVIEW_TYPES = [
  "Door-to-door Sales Assessment",
  "Customer Approach Evaluation", 
  "Product Knowledge Test",
  "Objection Handling Skills",
] as const;

export const EXPERIENCE_LEVELS = ["fresher", "experienced"] as const;
