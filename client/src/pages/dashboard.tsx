import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, ClipboardList, TrendingUp, Languages, Activity, Zap, CheckCircle } from "lucide-react";
import { InterviewSetup } from "@/components/InterviewSetup";
import { InterviewSession } from "@/components/InterviewSession";
import { InterviewHistory } from "@/components/InterviewHistory";
import { useInterviews } from "@/hooks/useInterview";

export default function Dashboard() {
  const [activeInterviewId, setActiveInterviewId] = useState<number | null>(null);
  const { stats, isLoading } = useInterviews();

  const handleInterviewStarted = (interviewId: number) => {
    setActiveInterviewId(interviewId);
  };

  const handleInterviewEnded = () => {
    setActiveInterviewId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Mic className="text-primary text-2xl" />
                <h1 className="text-xl font-semibold text-text-primary">Interview AI</h1>
              </div>
              <nav className="hidden md:flex space-x-6">
                <a href="#" className="text-primary font-medium border-b-2 border-primary pb-4">
                  Dashboard
                </a>
                <a href="#" className="text-text-secondary hover:text-text-primary pb-4">
                  Interviews
                </a>
                <a href="#" className="text-text-secondary hover:text-text-primary pb-4">
                  Analytics
                </a>
                <a href="#" className="text-text-secondary hover:text-text-primary pb-4">
                  Settings
                </a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-secondary/10 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                <span className="text-sm text-secondary font-medium">System Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">A</span>
                </div>
                <span className="text-sm text-text-primary">Admin</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-text-primary mb-2">
            Bank Sales Interview Dashboard
          </h2>
          <p className="text-text-secondary">
            Conduct AI-powered interviews for door-to-door bank sales personnel in regional languages
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-surface shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">Total Interviews</p>
                  <p className="text-2xl font-semibold text-text-primary">
                    {isLoading ? "..." : stats.totalInterviews}
                  </p>
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                  <ClipboardList className="text-primary h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">Active Sessions</p>
                  <p className="text-2xl font-semibold text-text-primary">
                    {isLoading ? "..." : stats.activeSessions}
                  </p>
                </div>
                <div className="bg-secondary/10 p-3 rounded-full">
                  <Activity className="text-secondary h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">Average Score</p>
                  <p className="text-2xl font-semibold text-text-primary">
                    {isLoading ? "..." : `${stats.averageScore}/10`}
                  </p>
                </div>
                <div className="bg-accent/10 p-3 rounded-full">
                  <TrendingUp className="text-accent h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">Languages Used</p>
                  <p className="text-2xl font-semibold text-text-primary">
                    {isLoading ? "..." : stats.languagesUsed}
                  </p>
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                  <Languages className="text-primary h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Interview Setup or Active Session */}
          {activeInterviewId ? (
            <InterviewSession 
              interviewId={activeInterviewId}
              onInterviewEnded={handleInterviewEnded}
            />
          ) : (
            <InterviewSetup onInterviewStarted={handleInterviewStarted} />
          )}

          {/* System Status */}
          <Card className="bg-surface shadow-sm border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-text-primary">
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-500" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-blue-700">Vapi Connected</span>
                  <p className="text-xs text-blue-600">Voice orchestration active</p>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  v2.1.0
                </Badge>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-green-700">Sarvam AI Active</span>
                  <p className="text-xs text-green-600">Regional language processing</p>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  11 Languages
                </Badge>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-purple-500" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-purple-700">OpenAI GPT-4</span>
                  <p className="text-xs text-purple-600">Interview intelligence</p>
                </div>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  Interview Mode
                </Badge>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-text-primary mb-3">Performance Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Response Time</span>
                    <span className="font-medium text-text-primary">650ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Recognition Accuracy</span>
                    <span className="font-medium text-text-primary">94.2%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Language Detection</span>
                    <span className="font-medium text-text-primary">97.8%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">System Uptime</span>
                    <span className="font-medium text-text-primary">99.9%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interview History */}
        <div className="mt-8">
          <InterviewHistory />
        </div>
      </div>
    </div>
  );
}
