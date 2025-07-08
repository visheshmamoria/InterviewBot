import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Square, Pause, Play, SkipForward, Send } from "lucide-react";
import { VoiceWave } from "./VoiceWave";
import { useInterview } from "@/hooks/useInterview";
import { useVapi } from "@/hooks/useVapi";
import { apiRequest } from "@/lib/queryClient";

interface InterviewSessionProps {
  interviewId: number;
  onInterviewEnded: () => void;
}

export function InterviewSession({ interviewId, onInterviewEnded }: InterviewSessionProps) {
  const [isRecording, setIsRecording] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseHistory, setResponseHistory] = useState<Array<{
    question: string;
    answer: string;
    score: number;
    feedback?: string;
  }>>([]);
  
  const { interview, session, endInterview } = useInterview(interviewId);
  const { isCallActive, transcript, endCall } = useVapi();

  useEffect(() => {
    if (!isCallActive) return;

    const interval = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isCallActive]);

  useEffect(() => {
    // Update score based on session data
    if (session?.sessionData?.responses) {
      const responses = session.sessionData.responses;
      const totalScore = responses.reduce((sum, response) => sum + response.score, 0);
      const averageScore = responses.length > 0 ? totalScore / responses.length : 0;
      setCurrentScore(averageScore);
    }
  }, [session]);

  const handleEndInterview = async () => {
    try {
      await endCall(interviewId);
      await endInterview.mutateAsync(interviewId);
      onInterviewEnded();
    } catch (error) {
      console.error("Error ending interview:", error);
    }
  };

  const handleSubmitResponse = async () => {
    if (!currentAnswer.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await apiRequest(`/api/interviews/${interviewId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ answer: currentAnswer }),
        headers: { 'Content-Type': 'application/json' }
      });

      // Add to history
      setResponseHistory(prev => [...prev, {
        question: session?.sessionData?.currentQuestion || "",
        answer: currentAnswer,
        score: response.evaluation.score,
        feedback: response.evaluation.feedback
      }]);

      setCurrentAnswer("");
      setCurrentScore(response.evaluation.score);
      
      // Check if interview is complete
      if (response.isComplete) {
        await handleEndInterview();
      }
    } catch (error) {
      console.error("Error submitting response:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePauseResume = () => {
    setIsPaused(prev => !prev);
    // TODO: Implement pause/resume functionality with Vapi
  };

  const handleSkipQuestion = () => {
    // TODO: Implement skip question functionality
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getLanguageName = (code: string) => {
    const langMap: { [key: string]: string } = {
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
    return langMap[code] || 'Unknown';
  };

  if (!interview) {
    return <div>Loading interview...</div>;
  }

  const currentQuestion = session?.sessionData?.currentQuestion || "Starting interview...";
  const latestTranscript = transcript[transcript.length - 1];

  return (
    <Card className="bg-surface shadow-sm border border-gray-200 interview-active">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg font-semibold text-text-primary">Live Interview Session</span>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm text-red-600 font-medium">Recording</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Candidate Info */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-lg font-semibold text-primary">
                {interview.candidateName?.split(' ').map(n => n[0]).join('') || 'N/A'}
              </span>
            </div>
            <div>
              <p className="font-medium text-text-primary">{interview.candidateName || 'Unknown'}</p>
              <p className="text-sm text-text-secondary">
                {getLanguageName(interview.language || 'hi-IN')} • {formatDuration(duration)} elapsed
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-secondary/20 text-secondary">
              Score: {currentScore.toFixed(1)}/10
            </Badge>
          </div>
        </div>

        {/* Current Question */}
        <div className="p-4 bg-primary/5 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-primary">AI</span>
            </div>
            <span className="text-sm font-medium text-text-primary">AI Interviewer</span>
          </div>
          <p className="text-sm text-text-secondary">{currentQuestion}</p>
        </div>

        {/* Voice Activity */}
        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            {isRecording && !isPaused ? (
              <Mic className="h-5 w-5 text-secondary" />
            ) : (
              <MicOff className="h-5 w-5 text-gray-400" />
            )}
            <span className="text-sm text-text-secondary">
              {isRecording && !isPaused ? 'Listening...' : 'Paused'}
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <VoiceWave isActive={isRecording && !isPaused} />
          </div>
        </div>

        {/* Demo Text Input */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-blue-700">📝</span>
            </div>
            <span className="text-sm font-medium text-blue-700">Demo Mode - Text Response</span>
          </div>
          <div className="space-y-3">
            <Textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Type your answer here (simulating voice response)..."
              className="min-h-[80px] resize-none"
              disabled={isSubmitting}
            />
            <div className="flex space-x-2">
              <Button 
                onClick={handleSubmitResponse} 
                disabled={!currentAnswer.trim() || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Answer
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Response History */}
        {responseHistory.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-text-primary">Interview Progress</h4>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {responseHistory.map((item, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="font-medium text-text-primary mb-1">Q{index + 1}: {item.question}</div>
                  <div className="text-text-secondary mb-1">A: {item.answer}</div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Score: {item.score}/10</span>
                    {item.feedback && (
                      <span className="text-xs text-blue-600">{item.feedback}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Latest Response */}
        {latestTranscript && latestTranscript.speaker === "candidate" && (
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-green-700">C</span>
              </div>
              <span className="text-sm font-medium text-text-primary">Candidate</span>
            </div>
            <p className="text-sm text-text-secondary">{latestTranscript.message}</p>
          </div>
        )}

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-text-secondary">
            <span>Interview Progress</span>
            <span>{session?.sessionData?.questionIndex || 0} / 12 questions</span>
          </div>
          <Progress value={((session?.sessionData?.questionIndex || 0) / 12) * 100} />
        </div>

        {/* Controls */}
        <div className="flex space-x-3">
          <Button 
            onClick={handleEndInterview}
            disabled={endInterview.isPending}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white"
          >
            <Square className="mr-2 h-4 w-4" />
            End Interview
          </Button>
          <Button 
            onClick={handlePauseResume}
            variant="outline"
            size="icon"
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button 
            onClick={handleSkipQuestion}
            variant="outline"
            size="icon"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
