"use client"

import { useRef, useEffect, useState } from "react"

interface Stroke {
  type: string
  startX: number
  startY: number
  endX: number
  endY: number
  controlX?: number
  controlY?: number
  centerX?: number
  centerY?: number
  radius?: number
}

interface StrokeAnimationProps {
  letter: string
  strokes: Stroke[]
}

export default function StrokeAnimation({ letter, strokes }: StrokeAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentStroke, setCurrentStroke] = useState(0)
  const [progress, setProgress] = useState(0)
  const animationRef = useRef<number | null>(null)

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas dimensions
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Draw guide letter
    ctx.font = "120px Arial"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillStyle = "rgba(180, 180, 240, 0.1)"
    ctx.fillText(letter, canvas.width / 2, canvas.height / 2)

    // Draw dotted circle guide
    ctx.beginPath()
    ctx.arc(canvas.width / 2, canvas.height / 2, 100, 0, Math.PI * 2)
    ctx.strokeStyle = "rgba(180, 180, 240, 0.3)"
    ctx.setLineDash([5, 5])
    ctx.lineWidth = 2
    ctx.stroke()

    // Start animation
    startAnimation()

    // Clean up function
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [letter, strokes])

  // Animation function
  const startAnimation = () => {
    setCurrentStroke(0)
    setProgress(0)

    // Start animation loop
    animateNextFrame()
  }

  const animateNextFrame = () => { 
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw guide letter
    ctx.font = "120px Arial"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillStyle = "rgba(180, 180, 240, 0.1)"
    ctx.fillText(letter, canvas.width / 2, canvas.height / 2)

    // Draw dotted circle guide
    ctx.beginPath()
    ctx.arc(canvas.width / 2, canvas.height / 2, 100, 0, Math.PI * 2)
    ctx.strokeStyle = "rgba(180, 180, 240, 0.3)"
    ctx.setLineDash([5, 5])
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw completed strokes
    for (let i = 0; i < currentStroke; i++) {
      drawStroke(ctx, strokes[i], 1)
    }

    // Draw current stroke with progress
    if (currentStroke < strokes.length) {
      drawStroke(ctx, strokes[currentStroke], progress)

      // Update progress
      setProgress((prev) => {
        const newProgress = prev + 0.01
        if (newProgress >= 1) {
          // Move to next stroke
          setTimeout(() => {
            setCurrentStroke((curr) => {
              if (curr + 1 < strokes.length) {
                return curr + 1
              }
              return curr
            })
            setProgress(0)
          }, 200)
          return 1
        }
        return newProgress
      })

      // Continue animation
      animationRef.current = requestAnimationFrame(animateNextFrame)
    } else {
      // Animation complete
      setTimeout(() => {
        // Restart animation
        setCurrentStroke(0)
        setProgress(0)
        animationRef.current = requestAnimationFrame(animateNextFrame)
      }, 1000)
    }
  }

  // Helper function to draw a stroke with progress
  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke, progress: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const startX = stroke.startX * canvas.width
    const startY = stroke.startY * canvas.height
    const endX = stroke.endX * canvas.width
    const endY = stroke.endY * canvas.height

    ctx.strokeStyle = "#4f46e5" // Indigo
    ctx.lineWidth = 4
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.setLineDash([])

    if (stroke.type === "line") {
      // Draw line with progress
      const currentX = startX + (endX - startX) * progress
      const currentY = startY + (endY - startY) * progress

      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.lineTo(currentX, currentY)
      ctx.stroke()

      // Draw moving dot at the end
      ctx.fillStyle = "#ef4444" // Red
      ctx.beginPath()
      ctx.arc(currentX, currentY, 6, 0, Math.PI * 2)
      ctx.fill()
    } else if (stroke.type === "curve" && stroke.controlX !== undefined && stroke.controlY !== undefined) {
      // Draw curve with progress
      const controlX = stroke.controlX * canvas.width
      const controlY = stroke.controlY * canvas.height

      // Calculate point along the curve using quadratic Bezier formula
      const t = progress
      const currentX = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * endX
      const currentY = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * endY

      // Draw curve up to current point
      ctx.beginPath()
      ctx.moveTo(startX, startY)

      // Draw curve segments
      const segments = 20
      for (let i = 0; i <= segments * progress; i++) {
        const segmentT = i / segments
        const segmentX =
          Math.pow(1 - segmentT, 2) * startX + 2 * (1 - segmentT) * segmentT * controlX + Math.pow(segmentT, 2) * endX
        const segmentY =
          Math.pow(1 - segmentT, 2) * startY + 2 * (1 - segmentT) * segmentT * controlY + Math.pow(segmentT, 2) * endY
        ctx.lineTo(segmentX, segmentY)
      }

      ctx.stroke()

      // Draw moving dot at the end
      ctx.fillStyle = "#ef4444" // Red
      ctx.beginPath()
      ctx.arc(currentX, currentY, 6, 0, Math.PI * 2)
      ctx.fill()
    } else if (
      stroke.type === "circle" &&
      stroke.centerX !== undefined &&
      stroke.centerY !== undefined &&
      stroke.radius !== undefined
    ) {
      // Draw circle with progress
      const centerX = stroke.centerX * canvas.width
      const centerY = stroke.centerY * canvas.height
      const radius = stroke.radius * canvas.width

      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2 * progress)
      ctx.stroke()

      // Calculate current point on circle
      const angle = Math.PI * 2 * progress
      const currentX = centerX + radius * Math.cos(angle)
      const currentY = centerY + radius * Math.sin(angle)

      // Draw moving dot at the end
      ctx.fillStyle = "#ef4444" // Red
      ctx.beginPath()
      ctx.arc(currentX, currentY, 6, 0, Math.PI * 2)
      ctx.fill()
    }

    // Show stroke number and direction
    if (progress > 0.1 && progress < 0.9) {
      ctx.font = "16px Arial"
      ctx.fillStyle = "#4f46e5"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      // Calculate position for the stroke number
      let textX, textY

      if (stroke.type === "line") {
        textX = startX + (endX - startX) * 0.5 + 20
        textY = startY + (endY - startY) * 0.5 - 20
      } else if (stroke.type === "curve" && stroke.controlX !== undefined && stroke.controlY !== undefined) {
        const controlX = stroke.controlX * canvas.width
        const controlY = stroke.controlY * canvas.height
        textX = (startX + controlX + endX) / 3 + 20
        textY = (startY + controlY + endY) / 3 - 20
      } else {
        textX = startX + 30
        textY = startY - 30
      }

      ctx.fillText(`Stroke ${currentStroke + 1}`, textX, textY)
    }
  }

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="w-full h-[400px] bg-white rounded-lg" />
      <div className="absolute bottom-4 left-4 bg-white px-4 py-2 rounded-full shadow-md border border-indigo-100">
        <p className="text-sm font-medium flex items-center">
          <span className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center mr-2 text-indigo-600 text-xs">
            {currentStroke + 1}
          </span>
          Watching stroke {currentStroke + 1} of {strokes.length}
        </p>
      </div>

      {/* Add a child-friendly character to guide the animation */}
      <div className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-md border border-indigo-100">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-lg">👧</div>
          <div className="ml-2 bg-yellow-50 p-2 rounded-lg relative">
            <div className="absolute left-0 top-1/2 -translate-x-2 -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-r-8 border-r-yellow-50 border-b-4 border-b-transparent"></div>
            <p className="text-xs text-yellow-800">Watch carefully!</p>
          </div>
        </div>
      </div>
    </div>
  )
}

