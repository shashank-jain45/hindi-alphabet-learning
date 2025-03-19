"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw, Volume2, Play, CheckCircle2 } from "lucide-react"
import DrawingCanvas from "./drawing-canvas"
import StrokeAnimation from "./stroke-animation"

// Hindi alphabet data with 20 letters
const hindiLetters = [
  {
    letter: "अ",
    transliteration: "a",
    description: "First letter of Hindi alphabet",
    audioSrc: "/audio/u.mp4", // In a real app, these would be actual audio files
    "strokeOrder": [
      "Step 1: Start with a curved stroke resembling '3'.",
      "Step 2: Add a small horizontal line connecting the '3' shape to the first vertical stroke.",
      "Step 3: Draw a vertical line on the right.",
      "Step 4: Add a horizontal bar on top, connecting strokes."
    ],
    "strokes": [
      {
        "type": "curve",
        "startX": 0.25,
        "startY": 0.3,
        "endX": 0.28,
        "endY": 0.45,
        "controlX": 0.4,
        "controlY": 0.4,
        "opacity": 1.0,

      },
      {
        "type": "curve",
        "startX": 0.28,
        "startY": 0.45,
        "endX": 0.2,
        "endY": 0.6,
        "controlX": 0.4,
        "controlY": 0.7,
        "opacity": 1.0,

      },
      {
        "type": "line",
        "startX": 0.28,
        "startY": 0.45,
        "endX": 0.4,
        "endY": 0.45,
        "opacity": 1.0
      },
      {
        "type": "line",
        "startX": 0.4,
        "startY": 0.3,
        "endX": 0.4,
        "endY": 0.6,
        "opacity": 1.0
      },
      {
        "type": "line",
        "startX": 0.25,
        "startY": 0.3,
        "endX": 0.5,
        "endY": 0.3,
        "opacity": 1.0
      }
    ]
  },
  {
    "letter": "आ",
    "transliteration": "aa",
    "description": "Second letter of the Hindi alphabet",
    "audioSrc": "/audio/aa.mp4",
    "strokeOrder": [
      "Step 1: Start with a curved stroke resembling '3'.",
      "Step 2: Add a small horizontal line connecting the '3' shape to the first vertical stroke.",
      "Step 3: Draw a vertical line on the right.",
      "Step 4: Add a horizontal bar on top, connecting strokes.",
      "Step 5: Draw an additional vertical stroke on the right.",
    ],
    "strokes": [
      {
        "type": "curve",
        "startX": 0.25,
        "startY": 0.3,
        "endX": 0.28,
        "endY": 0.45,
        "controlX": 0.4,
        "controlY": 0.4,
        "opacity": 1.0,

      },
      {
        "type": "curve",
        "startX": 0.28,
        "startY": 0.45,
        "endX": 0.2,
        "endY": 0.6,
        "controlX": 0.4,
        "controlY": 0.7,
        "opacity": 1.0,

      },
      {
        "type": "line",
        "startX": 0.28,
        "startY": 0.45,
        "endX": 0.4,
        "endY": 0.45,
        "opacity": 1.0
      },
      {
        "type": "line",
        "startX": 0.4,
        "startY": 0.3,
        "endX": 0.4,
        "endY": 0.6,
        "opacity": 1.0
      },
      {
        "type": "line",
        "startX": 0.25,
        "startY": 0.3,
        "endX": 0.5,
        "endY": 0.3,
        "opacity": 1.0
      },
      {
        "type": "line",
        "startX": 0.5,
        "startY": 0.3,
        "endX": 0.5,
        "endY": 0.6,
        "opacity": 1.0
      }
    ]
  },
  {
    "letter": "इ",
    "transliteration": "i",
    "description": "Third letter of the Hindi alphabet",
    "audioSrc": "/audio/e.mp4",
    "strokeOrder": [
      "Step 1: Draw a vertical curve from top to bottom.",
      "Step 2: Add a small horizontal line at the top."
    ],
    "strokes": [
      {
        "type": "line",
        "startX": 0.4,
        "startY": 0.2,
        "endX": 0.6,
        "endY": 0.2,
        "opacity": 1.0
      },
      {
        "type": "line",
        "startX": 0.5,
        "startY": 0.2,
        "endX": 0.5,
        "endY": 0.3,
        "opacity": 1.0
      },
      {
        "type": "curve",
        "startX": 0.5,
        "startY": 0.3,
        "endX": 0.5,
        "endY": 0.4,
        "controlX": 0.35,
        "controlY": 0.35,
        "opacity": 1.0
      },
      {
        "type": "curve",
        "startX": 0.5,
        "startY": 0.4,
        "endX": 0.43,
        "endY": 0.48,
        "controlX": 0.6,
        "controlY": 0.45,
        "opacity": 1.0
      },
      {
        "type": "line",
        "startX": 0.43,
        "startY": 0.48,
        "endX": 0.48,
        "endY": 0.5,
        "opacity": 1.0
      },

    ]
  },
  {
    letter: "उ",
    transliteration: "u",
    description: "Fifth letter of Hindi alphabet",
    audioSrc: "/audio/unmount.mp4",
    strokeOrder: ["Draw the curved line from top to bottom", "Add the small hook at the bottom"],
    strokes: [
      { type: "curve", startX: 0.6, startY: 0.3, endX: 0.4, endY: 0.7, controlX: 0.3, controlY: 0.5 },
      { type: "curve", startX: 0.4, startY: 0.7, endX: 0.5, endY: 0.8, controlX: 0.5, controlY: 0.7 },
    ],
  }
]

export default function LetterPractice() {
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [mode, setMode] = useState<"guided" | "practice" | "free">("guided")
  const [mastery, setMastery] = useState(0)
  const [showAnimation, setShowAnimation] = useState(false)
  const [feedback, setFeedback] = useState<"none" | "correct" | "incorrect">("none")
  const [strokeAccuracy, setStrokeAccuracy] = useState<number[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const canvasRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const currentLetter = hindiLetters[currentLetterIndex]

  // Create audio element for pronunciation
  useEffect(() => {
    // Create a new audio element for the current letter
    const audio = new Audio()
    audio.src = currentLetter.audioSrc
    audio.onended = () => setIsPlaying(false)
    audioRef.current = audio

    // Cleanup on unmount or letter change
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [currentLetter])

  const handleNextLetter = () => {
    if (currentLetterIndex < hindiLetters.length - 1) {
      setCurrentLetterIndex(currentLetterIndex + 1)
      setMastery(0)
      setStrokeAccuracy([])
      setFeedback("none")
    }
  }

  const handlePreviousLetter = () => {
    if (currentLetterIndex > 0) {
      setCurrentLetterIndex(currentLetterIndex - 1)
      setMastery(0)
      setStrokeAccuracy([])
      setFeedback("none")
    }
  }

  const handleCheck = () => {
    if (!canvasRef.current) return

    // Get stroke accuracy from the canvas component
    const accuracy = canvasRef.current.checkAccuracy()
    setStrokeAccuracy(accuracy)

    // Calculate overall accuracy
    const overallAccuracy = accuracy.reduce((sum, val) => sum + val, 0) / accuracy.length

    // Update mastery based on actual accuracy
    const newMastery = Math.min(100, Math.round(overallAccuracy * 100))
    setMastery(newMastery)

    // Set feedback based on accuracy
    if (overallAccuracy > 0.3) {
      setFeedback("correct")
      // Play success sound
      const successAudio = new Audio("/audio/success.mp3")
      successAudio.play()

      // Show success animation
      setTimeout(() => {
        setFeedback("none")
      }, 2000)

      // Move to next letter after a delay if mastery is high enough
      if (newMastery >= 90) {
        setTimeout(() => {
          handleNextLetter()
        }, 2000)
      }
    } else {
      setFeedback("incorrect")
      // Play error sound
      const errorAudio = new Audio("/audio/error.mp3")
      errorAudio.play()

      // Reset feedback after a delay
      setTimeout(() => {
        setFeedback("none")
      }, 2000)
    }
  }

  const playPronunciation = () => {
    if (audioRef.current && !isPlaying) {
      setIsPlaying(true)
      audioRef.current.currentTime = 0
      audioRef.current.play().catch((error) => {
        console.error("Error playing audio:", error)
        setIsPlaying(false)
      })
    }
  }

  const playAnimation = () => {
    setShowAnimation(true)

    // Hide animation after it completes
    setTimeout(
      () => {
        setShowAnimation(false)
      },
      currentLetter.strokes.length * 1500 + 500,
    )
  }

  const clearCanvas = () => {
    if (canvasRef.current) {
      canvasRef.current.clearCanvas()
    }
    setFeedback("none")
  }

  useEffect(() => {
    // Update overall progress whenever the current letter changes
    setProgress(Math.round((currentLetterIndex / hindiLetters.length) * 100))
    setMastery(0)
    setStrokeAccuracy([])
    setFeedback("none")
  }, [currentLetterIndex])

  // Update the letter practice component to make it more child-friendly
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex justify-between items-center rounded-b-lg shadow-md">
        <h1 className="text-xl font-bold flex items-center">
          <span className="text-2xl mr-2">✏️</span>
          अक्षर अभ्यास (Letter Practice)
        </h1>
        <div className="flex items-center gap-4">
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
            Level: Beginner | Letter: {currentLetterIndex + 1}/{hindiLetters.length}
          </span>
          <div className="w-40 bg-white/20 rounded-full overflow-hidden">
            <Progress value={progress} className="h-2" />
          </div>
          <span className="bg-white/30 px-2 py-1 rounded-full text-sm font-bold">{progress}%</span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 divide-x divide-slate-200">
        {/* Left panel - Letter information */}
        <div className="w-1/2 p-6 flex flex-col">
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2 flex items-center">
              <span className="text-5xl mr-3">{currentLetter.letter}</span>
              <span className="text-slate-500">({currentLetter.transliteration})</span>
            </h2>
            <p className="text-slate-600 mb-4">{currentLetter.description}. Follow the stroke order shown below.</p>

            <div className="border-4 border-dashed border-indigo-200 rounded-lg p-8 mb-4 flex items-center justify-center bg-white shadow-inner">
              <div className="relative">
                <span className="text-8xl">{currentLetter.letter}</span>
                <div className="absolute inset-0 border-4 border-dashed border-slate-200 rounded-full opacity-50"></div>
                <div className="absolute top-0 right-0 w-4 h-4 bg-pink-200 rounded-full opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 bg-pink-200 rounded-full opacity-50"></div>

                {/* Add decorative elements to make it more appealing to children */}
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-yellow-200 rounded-full opacity-70 animate-pulse"></div>
                <div
                  className="absolute -bottom-4 -right-4 w-8 h-8 bg-green-200 rounded-full opacity-70 animate-pulse"
                  style={{ animationDelay: "0.5s" }}
                ></div>
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              <Button
                variant="outline"
                className={`flex items-center gap-2 ${isPlaying ? "bg-primary/20" : ""} rounded-full px-4 py-2 border-2`}
                onClick={playPronunciation}
                disabled={isPlaying}
              >
                <Volume2 className={`w-5 h-5 ${isPlaying ? "text-primary" : ""}`} />
                {isPlaying ? "Listening..." : "Hear the Sound"}
              </Button>
              <Button
                variant="outline"
                className={`flex items-center gap-2 ${showAnimation ? "bg-primary/20" : ""} rounded-full px-4 py-2 border-2`}
                onClick={playAnimation}
                disabled={showAnimation}
              >
                <Play className="w-5 h-5" />
                {showAnimation ? "Watching..." : "Show Me How"}
              </Button>
            </div>

            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-slate-100">
              <h3 className="font-semibold mb-2 flex items-center">
                <span className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-2 text-indigo-600 text-sm">
                  1
                </span>
                Stroke Order:
              </h3>
              <ol className="list-decimal pl-5 space-y-2">
                {currentLetter.strokeOrder.map((step, index) => (
                  <li
                    key={index}
                    className={`p-2 rounded-md ${strokeAccuracy[index] > 0.7
                      ? "bg-green-50 text-green-700 font-medium"
                      : strokeAccuracy[index] > 0
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-50"
                      }`}
                  >
                    {step}
                    {strokeAccuracy[index] > 0.7 && (
                      <CheckCircle2 className="inline-block ml-2 w-4 h-4 text-green-600" />
                    )}
                  </li>
                ))}
              </ol>
            </div>

            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-slate-100">
              <h3 className="font-semibold mb-2 flex items-center">
                <span className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-2 text-indigo-600 text-sm">
                  2
                </span>
                Your Progress:
              </h3>
              <Progress value={mastery} className="h-6 mb-4" />

              <div className="flex justify-between text-sm text-slate-600 mb-2">
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-red-200 rounded-full mr-1"></span>
                  Beginner
                </span>
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-yellow-200 rounded-full mr-1"></span>
                  Learning
                </span>
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-green-200 rounded-full mr-1"></span>
                  Master
                </span>
              </div>

              <div className="flex gap-4 mt-4 justify-center">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${mode === "guided" ? "bg-indigo-600" : "bg-slate-200"}`}></div>
                  <span>Guided</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full ${mode === "practice" ? "bg-indigo-600" : "bg-slate-200"}`}
                  ></div>
                  <span>Practice</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${mode === "free" ? "bg-indigo-600" : "bg-slate-200"}`}></div>
                  <span>Free</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={handlePreviousLetter}
                disabled={currentLetterIndex === 0}
                className="rounded-full px-5"
              >
                ← Previous
              </Button>
              <Button
                variant="outline"
                onClick={handleNextLetter}
                disabled={currentLetterIndex === hindiLetters.length - 1}
                className="rounded-full px-5"
              >
                Next →
              </Button>
            </div>
          </div>
        </div>

        {/* Right panel - Drawing area */}
        <div className="w-1/2 p-6">
          <h2 className="text-2xl font-bold mb-2 flex items-center">
            <span className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-2 text-indigo-600 text-sm">
              ✏️
            </span>
            Let's Draw!
          </h2>
          <p className="text-slate-600 mb-6">
            Trace over the dotted lines to learn how to write the letter "{currentLetter.letter}".
          </p>

          <div
            className={`border-4 rounded-lg p-4 mb-4 bg-white relative shadow-lg ${feedback === "correct"
              ? "border-green-400 ring-4 ring-green-200"
              : feedback === "incorrect"
                ? "border-red-400 ring-4 ring-red-200"
                : "border-indigo-200"
              }`}
          >
            {showAnimation ? (
              <StrokeAnimation letter={currentLetter.letter} strokes={currentLetter.strokes} />
            ) : (
              <DrawingCanvas
                ref={canvasRef}
                letter={currentLetter.letter}
                strokes={currentLetter.strokes}
                mode={mode}
              />
            )}

            {feedback === "correct" && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-50 bg-opacity-80 rounded-lg">
                <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-green-700">Great job!</p>
                  <p className="text-green-600 mb-3">You traced the letter correctly!</p>
                  <div className="flex justify-center">
                    <Button onClick={() => setFeedback("none")} className="rounded-full">
                      Continue
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {feedback === "incorrect" && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-50 bg-opacity-80 rounded-lg">
                <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                  <p className="text-2xl font-bold text-red-700">Let's try again!</p>
                  <p className="text-red-600 mb-3">Follow the dotted lines more carefully.</p>
                  <div className="flex justify-center">
                    <Button onClick={() => setFeedback("none")} variant="outline" className="rounded-full">
                      Try Again
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-center mb-6">
            <Button variant="outline" className="flex items-center gap-2 rounded-full" onClick={clearCanvas}>
              <RefreshCw className="w-4 h-4" />
              Clear
            </Button>
            <Button onClick={handleCheck} className="rounded-full px-6">
              Check My Drawing
            </Button>
          </div>

          <div className="mt-6">
            <Tabs defaultValue="guided" onValueChange={(value) => setMode(value as "guided" | "practice" | "free")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="guided" className="rounded-full">
                  Guided Tracing
                </TabsTrigger>
                <TabsTrigger value="practice" className="rounded-full">
                  Practice
                </TabsTrigger>
                <TabsTrigger value="free" className="rounded-full">
                  Free Drawing
                </TabsTrigger>
              </TabsList>
              <TabsContent value="guided" className="mt-2">
                <div className="bg-indigo-50 p-3 rounded-lg text-sm text-indigo-700">
                  <p>
                    Follow the dotted lines to learn the correct stroke order. The app will guide you through each
                    stroke.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="practice" className="mt-2">
                <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-700">
                  <p>Practice drawing the letter with light guidance. Try to remember the correct stroke order.</p>
                </div>
              </TabsContent>
              <TabsContent value="free" className="mt-2">
                <div className="bg-green-50 p-3 rounded-lg text-sm text-green-700">
                  <p>Draw the letter without any guidance. Test your memory of the correct stroke order.</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}



