"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UploadResume } from "@/components/upload"
import { InterviewChat } from "@/components/interview"
import { Button } from "@/components/ui/button"
import { Sparkles, Brain, Upload, MessageSquare } from "lucide-react"

export default function Page() {
  const [started, setStarted] = useState(false)
  const [firstQuestion, setFirstQuestion] = useState("")
  const [pastQuestions, setPastQuestions] = useState([])
  const [sessionId, setSessionId] = useState(null)

  const handleStart = ({ firstQuestion, pastQuestions, sessionId }) => {
    setFirstQuestion(firstQuestion)
    setPastQuestions(pastQuestions)
    setSessionId(sessionId)
    setStarted(true)
  }

  const handleReset = () => {
    setStarted(false)
    setFirstQuestion("")
    setPastQuestions([])
    setSessionId(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-3/4 left-1/2 w-48 h-48 bg-orange-400/10 rounded-full blur-2xl animate-float"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <main className="relative mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl animate-pulse-glow">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              AI Interview Platform
            </h1>
            <Sparkles className="h-6 w-6 text-orange-400 animate-float" />
          </div>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto text-balance">
            Experience the future of interviews with our AI-powered platform. Upload your resume and engage in
            intelligent conversations.
          </p>
        </div>

        {/* Main Card */}
        <div className="gradient-border animate-scale-in">
          <Card className="border-0 bg-slate-800/50 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-slate-100 flex items-center justify-center gap-2">
                {!started ? (
                  <>
                    <Upload className="h-6 w-6 text-orange-400" />
                    Ready to Begin?
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-6 w-6 text-orange-400" />
                    Interview in Progress
                  </>
                )}
              </CardTitle>
              <CardDescription className="">
                {!started
                  ? "Upload your resume PDF to begin your personalized AI interview experience."
                  : "Answer each question thoughtfully to receive the next one. Take your time!"}
              </CardDescription>

              {/* Progress Steps */}
              <div className="mt-6 flex items-center justify-center gap-4">
                <div
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-500 ${
                    !started
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 scale-105"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  Upload Resume
                </div>

                <div className={`h-px w-8 transition-all duration-500 ${started ? "bg-orange-400" : "bg-slate-600"}`} />

                <div
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-500 ${
                    started
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 scale-105"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  Interview
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className={`transition-all duration-700 ${started ? "animate-slide-up" : "animate-scale-in"}`}>
                {!started ? (
                  <UploadResume onStartInterview={handleStart} />
                ) : (
                  <>
                    <InterviewChat
                      initialQuestion={firstQuestion}
                      initialPastQuestions={pastQuestions}
                      sessionId={sessionId}
                    />
                    <div className="flex justify-end pt-4 border-t border-slate-700">
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-300 hover:scale-105 bg-transparent"
                      >
                        Start Over
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-slate-500 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <p>Powered by advanced AI • Secure & Private</p>
        </div>
      </main>
    </div>
  )
}
