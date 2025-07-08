import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, Download, Eye } from "lucide-react";
import { useInterviews } from "@/hooks/useInterview";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export function InterviewHistory() {
  const { interviews, isLoading } = useInterviews();
  const [selectedInterview, setSelectedInterview] = useState<any>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "active":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getLanguageColor = (language: string) => {
    const colors: { [key: string]: string } = {
      'hi-IN': 'bg-blue-100 text-blue-800',
      'pa-IN': 'bg-purple-100 text-purple-800',
      'bn-IN': 'bg-green-100 text-green-800',
      'ta-IN': 'bg-orange-100 text-orange-800',
      'te-IN': 'bg-red-100 text-red-800',
      'gu-IN': 'bg-pink-100 text-pink-800',
      'kn-IN': 'bg-indigo-100 text-indigo-800',
      'ml-IN': 'bg-teal-100 text-teal-800',
      'mr-IN': 'bg-amber-100 text-amber-800',
      'or-IN': 'bg-cyan-100 text-cyan-800'
    };
    return colors[language] || 'bg-gray-100 text-gray-800';
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

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (hours < 48) return "Yesterday";
    return date.toLocaleDateString();
  };

  const downloadReport = (interview: any) => {
    const reportData = {
      candidate: interview.candidateName,
      language: getLanguageName(interview.language),
      score: interview.score,
      evaluation: interview.evaluation,
      transcript: interview.transcript,
      date: new Date(interview.createdAt).toLocaleDateString()
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-report-${interview.candidateName.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card className="bg-surface shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle>Recent Interviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading interviews...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-surface shadow-sm border border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg font-semibold text-text-primary">Recent Interviews</span>
          <Button variant="ghost" size="sm" className="text-primary hover:text-blue-700">
            View All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {interviews.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            No interviews found. Start your first interview to see data here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="pb-3 text-sm font-medium text-text-secondary">Candidate</th>
                  <th className="pb-3 text-sm font-medium text-text-secondary">Language</th>
                  <th className="pb-3 text-sm font-medium text-text-secondary">Duration</th>
                  <th className="pb-3 text-sm font-medium text-text-secondary">Score</th>
                  <th className="pb-3 text-sm font-medium text-text-secondary">Status</th>
                  <th className="pb-3 text-sm font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {interviews.slice(0, 10).map((interview) => (
                  <tr key={interview.id} className="border-b border-gray-100">
                    <td className="py-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {interview.candidateName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{interview.candidateName}</p>
                          <p className="text-xs text-text-secondary">{formatDate(interview.createdAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge className={getLanguageColor(interview.language)}>
                        {getLanguageName(interview.language)}
                      </Badge>
                    </td>
                    <td className="py-3 text-sm text-text-secondary">
                      {formatDuration(interview.duration)}
                    </td>
                    <td className="py-3">
                      {interview.score !== null ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-secondary h-2 rounded-full" 
                              style={{ width: `${interview.score}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-text-primary">
                            {(interview.score / 10).toFixed(1)}/10
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-text-secondary">N/A</span>
                      )}
                    </td>
                    <td className="py-3">
                      <Badge className={getStatusColor(interview.status)}>
                        {interview.status}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedInterview(interview)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Interview Details - {interview.candidateName}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm font-medium text-text-primary">Language</p>
                                  <p className="text-sm text-text-secondary">{getLanguageName(interview.language)}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-text-primary">Interview Type</p>
                                  <p className="text-sm text-text-secondary">{interview.interviewType}</p>
                                </div>
                              </div>
                              {interview.transcript && (
                                <div>
                                  <p className="text-sm font-medium text-text-primary mb-2">Transcript</p>
                                  <ScrollArea className="h-40 w-full border rounded p-2">
                                    {interview.transcript.map((entry, index) => (
                                      <div key={index} className="mb-2">
                                        <span className="text-xs font-medium text-primary">
                                          {entry.speaker === 'ai' ? 'AI' : 'Candidate'}:
                                        </span>
                                        <p className="text-sm text-text-secondary">{entry.message}</p>
                                      </div>
                                    ))}
                                  </ScrollArea>
                                </div>
                              )}
                              {interview.evaluation && (
                                <div>
                                  <p className="text-sm font-medium text-text-primary mb-2">Evaluation</p>
                                  <div className="space-y-2">
                                    {Object.entries(interview.evaluation.categories).map(([key, value]) => (
                                      <div key={key} className="flex items-center justify-between">
                                        <span className="text-sm text-text-secondary capitalize">
                                          {key.replace(/([A-Z])/g, ' $1').trim()}
                                        </span>
                                        <span className="text-sm font-medium">{value}/10</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => downloadReport(interview)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
