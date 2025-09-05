"use client"
import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { UploadCloud, FileText, Sparkles, Zap } from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

export function UploadResume({ onStartInterview }) {
  const [file, setFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [serverMessage, setServerMessage] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const { toast } = useToast()

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null
    if (f && f.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Please select a PDF file.", variant: "destructive" })
      e.target.value = ""
      setFile(null)
      return
    }
    setFile(f)
  }

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      const f = e.dataTransfer.files?.[0]
      if (!f) return
      if (f.type !== "application/pdf") {
        toast({ title: "Invalid file", description: "Please select a PDF file.", variant: "destructive" })
        return
      }
      setFile(f)
    },
    [toast],
  )

  const handleUpload = async () => {
    if (!file) {
      toast({ title: "No file selected", description: "Please choose a PDF to upload." })
      return
    }
    try {
      setIsUploading(true)
      setServerMessage(null)
      const formData = new FormData()
      formData.append("pdf", file)

      console.log("[v0] Uploading to", `${API_BASE}/upload_pdf`)
      const res = await fetch(`${API_BASE}/upload_pdf`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Upload failed with status ${res.status}`)
      }

      const data = await res.json()
      console.log("[v0] Upload response:", data)

      const firstQuestion = data.first_question || data.question
      const pastQuestions = data.past_questions || []
      const sessionId = data.session_id

      if (!firstQuestion) {
        throw new Error("Server did not return a first question.")
      }

      if (data.message) setServerMessage(data.message)
      onStartInterview({ firstQuestion, pastQuestions, sessionId })
    } catch (err) {
      console.error("[v0] Upload error:", err)
      toast({
        title: "Upload failed",
        description: err?.message || "Please check the server and try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`relative rounded-xl border-2 border-dashed p-8 transition-all duration-300 ${
          isDragging
            ? "border-orange-400 bg-orange-500/10 scale-105 shadow-lg shadow-orange-500/20"
            : file
              ? "border-orange-500/50 bg-orange-500/5"
              : "border-slate-600 hover:border-slate-500 hover:bg-slate-800/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        aria-label="Drag and drop your PDF here"
      >
        {/* Background glow effect */}
        {isDragging && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/20 to-orange-600/20 animate-pulse" />
        )}

        <div className="relative flex flex-col items-center gap-4 text-center">
          <div
            className={`p-4 rounded-full transition-all duration-300 ${
              isDragging ? "bg-orange-500 text-white animate-bounce" : "bg-slate-700 text-orange-400 hover:bg-slate-600"
            }`}
          >
            <UploadCloud className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <Label className="text-lg font-semibold text-slate-200">
              {isDragging ? "Drop your resume here!" : "Upload Your Resume"}
            </Label>
            <p className="text-slate-400 max-w-md text-balance">
              Drag & drop your PDF resume here, or click browse to select. Our AI will analyze it and create
              personalized interview questions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Input
              id="resume"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="max-w-xs cursor-pointer border-slate-600 bg-slate-800 text-slate-200 file:bg-orange-500 file:text-white file:border-0 file:rounded-md hover:border-slate-500 transition-colors"
            />
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Zap className="h-3 w-3" />
              PDF only
            </div>
          </div>
        </div>

        {/* File Preview */}
        {file && (
          <div className="mt-6 animate-slide-up">
            <div className="flex items-center gap-3 rounded-lg bg-slate-800/80 p-4 border border-slate-700">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <FileText className="h-5 w-5 text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-200 truncate">{file.name}</p>
                <p className="text-sm text-slate-400">{(file.size / 1024).toFixed(0)} KB • Ready to analyze</p>
              </div>
              <Sparkles className="h-4 w-4 text-orange-400 animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
          AI-powered analysis ready
        </div>

        <Button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className={`px-6 py-2 font-semibold transition-all duration-300 ${
            !file || isUploading
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105"
          }`}
        >
          {isUploading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Start AI Interview
            </div>
          )}
        </Button>
      </div>

      {/* Server Message */}
      {serverMessage && (
        <Alert className="border-orange-500/50 bg-orange-500/10 animate-slide-up">
          <Sparkles className="h-4 w-4 text-orange-400" />
          <AlertTitle className="text-orange-300">AI Analysis Complete</AlertTitle>
          <AlertDescription className="text-orange-200">{serverMessage}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
