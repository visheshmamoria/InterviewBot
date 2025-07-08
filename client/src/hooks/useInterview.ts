import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Interview, InsertInterview } from "@shared/schema";

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
      const response = await apiRequest("POST", "/api/interviews", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
    },
  });

  const startInterviewMutation = useMutation({
    mutationFn: async (interviewId: number) => {
      const response = await apiRequest("POST", `/api/interviews/${interviewId}/start`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
    },
  });

  const endInterviewMutation = useMutation({
    mutationFn: async (interviewId: number) => {
      const response = await apiRequest("POST", `/api/interviews/${interviewId}/end`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
    },
  });

  return {
    interview: interviewQuery.data,
    session: sessionQuery.data,
    isLoading: interviewQuery.isLoading || sessionQuery.isLoading,
    error: interviewQuery.error || sessionQuery.error,
    createInterview: createInterviewMutation,
    startInterview: startInterviewMutation,
    endInterview: endInterviewMutation,
  };
}

export function useInterviews() {
  const interviewsQuery = useQuery({
    queryKey: ["/api/interviews"],
  });

  const statsQuery = useQuery({
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
