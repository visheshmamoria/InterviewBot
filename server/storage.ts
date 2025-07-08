import { interviews, interviewSessions, type Interview, type InsertInterview, type InterviewSession, type InsertInterviewSession, type TranscriptEntry, type InterviewEvaluation, type SessionData } from "@shared/schema";

export interface IStorage {
  // Interview operations
  createInterview(interview: InsertInterview): Promise<Interview>;
  getInterview(id: number): Promise<Interview | undefined>;
  updateInterview(id: number, updates: Partial<Interview>): Promise<Interview>;
  getAllInterviews(): Promise<Interview[]>;
  getInterviewsByStatus(status: string): Promise<Interview[]>;
  
  // Session operations
  createSession(session: InsertInterviewSession): Promise<InterviewSession>;
  getSession(id: number): Promise<InterviewSession | undefined>;
  getSessionByInterviewId(interviewId: number): Promise<InterviewSession | undefined>;
  updateSession(id: number, updates: Partial<InterviewSession>): Promise<InterviewSession>;
  
  // Statistics
  getInterviewStats(): Promise<{
    totalInterviews: number;
    activeSessions: number;
    averageScore: number;
    languagesUsed: number;
  }>;
}

export class MemStorage implements IStorage {
  private interviews: Map<number, Interview>;
  private sessions: Map<number, InterviewSession>;
  private currentInterviewId: number;
  private currentSessionId: number;

  constructor() {
    this.interviews = new Map();
    this.sessions = new Map();
    this.currentInterviewId = 1;
    this.currentSessionId = 1;
  }

  async createInterview(insertInterview: InsertInterview): Promise<Interview> {
    const id = this.currentInterviewId++;
    const interview: Interview = {
      ...insertInterview,
      id,
      status: insertInterview.status || "pending",
      startTime: null,
      endTime: null,
      duration: null,
      score: null,
      transcript: null,
      evaluation: null,
      vapiCallId: null,
      createdAt: new Date(),
    };
    this.interviews.set(id, interview);
    return interview;
  }

  async getInterview(id: number): Promise<Interview | undefined> {
    return this.interviews.get(id);
  }

  async updateInterview(id: number, updates: Partial<Interview>): Promise<Interview> {
    const interview = this.interviews.get(id);
    if (!interview) {
      throw new Error(`Interview with id ${id} not found`);
    }
    const updatedInterview = { ...interview, ...updates };
    this.interviews.set(id, updatedInterview);
    return updatedInterview;
  }

  async getAllInterviews(): Promise<Interview[]> {
    return Array.from(this.interviews.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getInterviewsByStatus(status: string): Promise<Interview[]> {
    return Array.from(this.interviews.values()).filter(
      (interview) => interview.status === status
    );
  }

  async createSession(insertSession: InsertInterviewSession): Promise<InterviewSession> {
    const id = this.currentSessionId++;
    const session: InterviewSession = {
      id,
      interviewId: insertSession.interviewId || null,
      sessionData: insertSession.sessionData as SessionData || null,
      isActive: insertSession.isActive !== undefined ? insertSession.isActive : true,
      createdAt: new Date(),
    };
    this.sessions.set(id, session);
    return session;
  }

  async getSession(id: number): Promise<InterviewSession | undefined> {
    return this.sessions.get(id);
  }

  async getSessionByInterviewId(interviewId: number): Promise<InterviewSession | undefined> {
    return Array.from(this.sessions.values()).find(
      (session) => session.interviewId === interviewId && session.isActive
    );
  }

  async updateSession(id: number, updates: Partial<InterviewSession>): Promise<InterviewSession> {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session with id ${id} not found`);
    }
    const updatedSession = { ...session, ...updates };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async getInterviewStats(): Promise<{
    totalInterviews: number;
    activeSessions: number;
    averageScore: number;
    languagesUsed: number;
  }> {
    const allInterviews = Array.from(this.interviews.values());
    const activeSessions = Array.from(this.sessions.values()).filter(s => s.isActive).length;
    const completedInterviews = allInterviews.filter(i => i.status === "completed" && i.score !== null);
    const averageScore = completedInterviews.length > 0 
      ? completedInterviews.reduce((sum, i) => sum + (i.score || 0), 0) / completedInterviews.length / 10
      : 0;
    const languagesUsed = new Set(allInterviews.map(i => i.language)).size;

    return {
      totalInterviews: allInterviews.length,
      activeSessions,
      averageScore: Math.round(averageScore * 10) / 10,
      languagesUsed,
    };
  }
}

export const storage = new MemStorage();
