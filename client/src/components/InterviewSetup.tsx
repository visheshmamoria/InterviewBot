import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mic, Settings } from "lucide-react";
import { SUPPORTED_LANGUAGES, INTERVIEW_TYPES } from "@shared/schema";
import { useInterview } from "@/hooks/useInterview";
import { useVapi } from "@/hooks/useVapi";

const setupSchema = z.object({
  candidateName: z.string().min(1, "Candidate name is required"),
  language: z.string().min(1, "Language selection is required"),
  interviewType: z.string().min(1, "Interview type is required"),
  experienceLevel: z.enum(["fresher", "experienced"]),
});

type SetupFormData = z.infer<typeof setupSchema>;

interface InterviewSetupProps {
  onInterviewStarted: (interviewId: number) => void;
}

export function InterviewSetup({ onInterviewStarted }: InterviewSetupProps) {
  const [selectedLanguage, setSelectedLanguage] = useState("hi-IN");
  const { createInterview, startInterview } = useInterview();
  const { isConnected } = useVapi();

  const form = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      candidateName: "",
      language: "hi-IN",
      interviewType: "Door-to-door Sales Assessment",
      experienceLevel: "experienced",
    },
  });

  const onSubmit = async (data: SetupFormData) => {
    try {
      // Create interview
      const interview = await createInterview.mutateAsync({
        candidateName: data.candidateName,
        language: data.language,
        interviewType: data.interviewType,
        experienceLevel: data.experienceLevel,
        status: "pending",
      });

      // Start interview session
      await startInterview.mutateAsync(interview.id);
      
      onInterviewStarted(interview.id);
    } catch (error) {
      console.error("Error starting interview:", error);
    }
  };

  const isLoading = createInterview.isPending || startInterview.isPending;

  return (
    <Card className="bg-surface shadow-sm border border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg font-semibold text-text-primary">Start New Interview</span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-secondary animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm text-secondary">
              {isConnected ? 'Vapi Connected' : 'Connecting...'}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="candidateName" className="text-sm font-medium text-text-primary">
              Candidate Name
            </Label>
            <Input
              id="candidateName"
              {...form.register("candidateName")}
              placeholder="Enter candidate name"
              className="mt-1"
            />
            {form.formState.errors.candidateName && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.candidateName.message}
              </p>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium text-text-primary">Interview Language</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <Button
                  key={lang.code}
                  type="button"
                  variant={selectedLanguage === lang.code ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedLanguage(lang.code);
                    form.setValue("language", lang.code);
                  }}
                  className="text-xs"
                >
                  {lang.flag} {lang.name}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="interviewType" className="text-sm font-medium text-text-primary">
              Interview Type
            </Label>
            <Select
              value={form.watch("interviewType")}
              onValueChange={(value) => form.setValue("interviewType", value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select interview type" />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-text-primary">Experience Level</Label>
            <RadioGroup
              value={form.watch("experienceLevel")}
              onValueChange={(value) => form.setValue("experienceLevel", value as "fresher" | "experienced")}
              className="flex space-x-6 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fresher" id="fresher" />
                <Label htmlFor="fresher" className="text-sm">Fresher</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="experienced" id="experienced" />
                <Label htmlFor="experienced" className="text-sm">Experienced</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button 
              type="submit" 
              disabled={isLoading || !isConnected}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  Start Interview
                </>
              )}
            </Button>
            <Button type="button" variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
