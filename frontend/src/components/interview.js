"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, MessageSquare, Send, Sparkles } from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

export function InterviewChat({ initialQuestion, initialPastQuestions, sessionId }) {
  const { toast } = useToast()
  const [currentQuestion, setCurrentQuestion] = useState(initialQuestion)
  const [pastQuestions, setPastQuestions] = useState(initialPastQuestions || [])
  const [pastResponses, setPastResponses] = useState([]) // New: Track past responses
  const [answer, setAnswer] = useState("")
  const [history, setHistory] = useState([])
  const [isSending, setIsSending] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [questionCount, setQuestionCount] = useState(0) // New: Track question count
  const endRef = useRef(null)

  const maxChars = 1200
  const remaining = maxChars - answer.length

  const disabled = useMemo(
    () => !currentQuestion || isSending || !answer.trim() || remaining < 0,
    [currentQuestion, isSending, answer, remaining]
  )

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [history, currentQuestion, feedback])

  const sendAnswer = async () => {
    if (!answer.trim()) return
    const payload = {
      session_id: sessionId,
      question: currentQuestion,
      response: answer.trim(),
      past_questions: pastQuestions.length ? pastQuestions : [currentQuestion],
      past_responses: pastResponses, // New: Include past responses
      question_count: questionCount // New: Include question count
    }

    try {
      setIsSending(true)
      console.log("[v0] Chat payload ->", payload)

      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Chat failed with status ${res.status}`)
      }

      const data = await res.json()
      console.log("[v0] Chat response <-", data)
      setFeedback(data.feedback || "")

      // Update history and past responses
      setHistory((h) => [...h, { question: currentQuestion, answer: answer.trim() }])
      setPastResponses((r) => [...r, answer.trim()]) // New: Append current response
      setAnswer("")

      // Update past questions
      const updatedPast =
        data.past_questions && data.past_questions.length
          ? data.past_questions
          : Array.from(new Set([...(pastQuestions || []), currentQuestion]))
      setPastQuestions(updatedPast)

      // Check if interview is complete
      if (data.question === "Interview complete." || data.question === "Interview evaluation complete.") {
        toast({
          title: "Interview Complete! 🎉",
          description: data.feedback || "Great job! You've completed all questions."
        })
        setCurrentQuestion("")
        setQuestionCount(data.question_count) // Update question count
        return
      }

      // Update question and count
      const nextQ = data.question || data.first_question
      if (!nextQ) {
        toast({
          title: "Interview Complete! 🎉",
          description: data.feedback || "Great job! You've completed all questions."
        })
        setCurrentQuestion("")
        setQuestionCount(data.question_count)
        return
      }

      setCurrentQuestion(nextQ)
      setQuestionCount(data.question_count) // Update question count from backend
    } catch (err) {
      console.error("[v0] Chat error:", err)
      toast({
        title: "Connection Error",
        description: err?.message || "Unable to send answer. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Container */}
      <div className="flex-1 pr-2 space-y-4">
        {/* Initial Question */}
        {history.length === 0 && currentQuestion && (
          <div className="flex justify-start animate-scale-in">
            <div className="max-w-[70%] rounded-lg border border-slate-700 bg-slate-800/50 p-4 transition-all duration-300 hover:bg-slate-800/70">
              <div className="flex items-start gap-2">
                <div className="p-2 bg-orange-500 rounded-full animate-pulse-glow">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <p className="text-slate-100 leading-relaxed">{currentQuestion}</p>
              </div>
            </div>
          </div>
        )}

        {/* Chat History */}
        {history.map((qa, i) => (
          <div key={i} className="space-y-4">
            {/* AI Question (Left) */}
            <div
              className="flex justify-start animate-scale-in"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="max-w-[70%] rounded-lg border border-slate-700 bg-slate-800/50 p-4 transition-all duration-300 hover:bg-slate-800/70">
                <div className="flex items-start gap-2">
                  <div className="p-2 bg-orange-500 rounded-full">
                    <MessageSquare className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-slate-100 leading-relaxed">{qa.question}</p>
                </div>
              </div>
            </div>
            {/* Human Answer (Right) */}
            <div
              className="flex justify-end animate-scale-in"
              style={{ animationDelay: `${i * 0.1 + 0.05}s` }}
            >
              <div className="max-w-[70%] rounded-lg border border-blue-700 bg-blue-800/50 p-4 transition-all duration-300 hover:bg-blue-800/70">
                <div className="flex items-start gap-2">
                  <p className="text-slate-100 leading-relaxed">{qa.answer}</p>
                  <div className="p-2 bg-blue-500 rounded-full">
                    <MessageSquare className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
            </div>
            {/* Feedback (Left) */}
            {feedback && i === history.length - 1 && (
              <div className="flex justify-start animate-scale-in">
                <div className="max-w-[70%] rounded-lg border border-emerald-700 bg-emerald-800/50 p-4 transition-all duration-300 hover:bg-emerald-800/70">
                  <div className="flex items-start gap-2">
                    <div className="p-2 bg-emerald-500 rounded-full animate-pulse-glow">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-emerald-100 leading-relaxed">{feedback}</p>
                  </div>
                </div>
              </div>
            )}
            {/* Current Question (Left) */}
            {currentQuestion && i === history.length - 1 && (
              <div className="flex justify-start animate-scale-in">
                <div className="max-w-[70%] rounded-lg border border-slate-700 bg-slate-800/50 p-4 transition-all duration-300 hover:bg-slate-800/70">
                  <div className="flex items-start gap-2">
                    <div className="p-2 bg-orange-500 rounded-full animate-pulse-glow">
                      <MessageSquare className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-slate-100 leading-relaxed">{currentQuestion}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Interview Complete */}
        {!currentQuestion && history.length > 0 && (
          <div className="flex justify-start animate-scale-in">
            <div className="max-w-[70%] rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-full animate-pulse-glow">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-green-300">Interview Complete! 🎉</p>
                  <p className="text-sm text-green-200/80">
                    {feedback || "Excellent work! You can start over from the top if you'd like to practice more."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Answer Input */}
      <section className="space-y-4 animate-slide-up pt-4" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Send className="h-4 w-4 text-blue-400" />
          </div>
          <Label htmlFor="answer" className="text-base font-semibold text-slate-200">
            Your Answer
          </Label>
          <div className="flex-1 h-px bg-gradient-to-r from-blue-500/50 to-transparent" />
        </div>

        <div className="space-y-3">
          <Textarea
            id="answer"
            placeholder="Share your thoughts here... Take your time to craft a thoughtful response. (Tip: 2–4 concise paragraphs work well)"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !disabled) {
                e.preventDefault()
                sendAnswer()
              }
            }}
            rows={6}
            maxLength={maxChars}
            className="resize-none border-slate-600 bg-slate-800/50 text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500/20 transition-all duration-300"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-2 h-2 bg-slate-500 rounded-full" />
                <span>
                  {pastQuestions.length} past {pastQuestions.length === 1 ? "question" : "questions"}
                </span>
              </div>
              <div className="h-4 w-px bg-slate-600" />
              <div className="flex items-center gap-1 text-slate-500">
                <Sparkles className="h-3 w-3" />
                <span>Cmd/Ctrl + Enter to send</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span
                className={`text-sm transition-colors ${
                  remaining < 0 ? "text-red-400" : remaining < 100 ? "text-orange-400" : "text-slate-500"
                }`}
              >
                {remaining} characters left
              </span>

              <Button
                onClick={sendAnswer}
                disabled={disabled}
                className={`px-6 font-semibold transition-all duration-300 ${
                  disabled
                    ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105"
                }`}
              >
                {isSending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Send & Continue
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}