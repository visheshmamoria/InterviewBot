import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Interview, InsertInterview, InterviewSession, SessionData, InterviewEvaluation } from "@shared/schema";

export function useInterview(id?: number) {
  const queryClient = useQueryClient();

  const interviewQuery = useQuery({
    queryKey: ["/api/interviews", id],
    enabled: !!id,
  });

  const sessionQuery = useQuery({
    queryKey: ["/api/interviews", id, "session"],
    enabled: !!id,
  });

  const createInterviewMutation = useMutation({
    mutationFn: async (data: InsertInterview) => {
      return await apiRequest("/api/interviews", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
    },
  });

  const startInterviewMutation = useMutation({
    mutationFn: async (interviewId: number) => {
      return await apiRequest(`/api/interviews/${interviewId}/start`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
    },
  });

  const endInterviewMutation = useMutation({
    mutationFn: async (interviewId: number) => {
      return await apiRequest(`/api/interviews/${interviewId}/end`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
    },
  });

  return {
    interview: interviewQuery.data as Interview | undefined,
    session: sessionQuery.data as InterviewSession | undefined,
    isLoading: interviewQuery.isLoading || sessionQuery.isLoading,
    error: interviewQuery.error || sessionQuery.error,
    createInterview: createInterviewMutation,
    startInterview: startInterviewMutation,
    endInterview: endInterviewMutation,
  };
}

export function useInterviews() {
  const interviewsQuery = useQuery<Interview[]>({
    queryKey: ["/api/interviews"],
  });

  const statsQuery = useQuery<{ totalInterviews: number; activeSessions: number; averageScore: number; languagesUsed: number }>({
    queryKey: ["/api/stats"],
  });

  return {
    interviews: interviewsQuery.data || [],
    stats: statsQuery.data || {
      totalInterviews: 0,
      activeSessions: 0,
      averageScore: 0,
      languagesUsed: 0,
    },
    isLoading: interviewsQuery.isLoading || statsQuery.isLoading,
    error: interviewsQuery.error || statsQuery.error,
  };
}
