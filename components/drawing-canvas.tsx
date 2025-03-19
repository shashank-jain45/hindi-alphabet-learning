    "use client"

import type React from "react"

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react"

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

interface DrawingCanvasProps {
  letter: string
  strokes: Stroke[]
  mode: "guided" | "practice" | "free"
}

interface Point {
  x: number
  y: number
  timestamp: number
  pressure?: number
}

const DrawingCanvas = forwardRef(({ letter, strokes, mode }: DrawingCanvasProps, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null)
  const [currentStroke, setCurrentStroke] = useState(0)
  const [userStrokes, setUserStrokes] = useState<Point[][]>([])
  const [currentUserStroke, setCurrentUserStroke] = useState<Point[]>([])
  const [strokeDirections, setStrokeDirections] = useState<string[]>([])
  const [strokeStartTime, setStrokeStartTime] = useState<number | null>(null)

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    clearCanvas: () => {
      clearCanvas()
    },
    checkAccuracy: () => {
      return calculateAccuracy()
    },
  }))

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas dimensions
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    setContext(ctx)

    // Reset state
    setCurrentStroke(0)
    setUserStrokes([])
    setCurrentUserStroke([])
    setStrokeDirections([])

    // Draw initial state
    drawGuideLines(ctx)

    // Clean up function
    return () => {
      setContext(null)
    }
  }, [letter, strokes, mode])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (!canvas || !context) return

      // Save current drawing
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

      // Resize canvas
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight

      // Restore drawing
      context.putImageData(imageData, 0, 0)

      // Redraw guide lines
      drawGuideLines(context)
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [context, letter, strokes, mode])

  // Drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!context) return

    setIsDrawing(true)
    context.beginPath()

    // Get coordinates
    let x, y, pressure
    if ("touches" in e) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
      // @ts-ignore - Some browsers support pressure
      pressure = e.touches[0].force || 0.5
    } else {
      x = e.nativeEvent.offsetX
      y = e.nativeEvent.offsetY
      pressure = 0.5
    }

    context.moveTo(x, y)

    // Set stroke style based on mode
    if (mode === "guided") {
      context.strokeStyle = "#4f46e5" // Indigo for guided mode
    } else if (mode === "practice") {
      context.strokeStyle = "#0891b2" // Cyan for practice mode
    } else {
      context.strokeStyle = "#000000" // Black for free drawing
    }

    context.lineWidth = 4
    context.lineCap = "round"
    context.lineJoin = "round"
    context.setLineDash([])

    // Start new user stroke with timestamp
    const now = Date.now()
    setStrokeStartTime(now)
    setCurrentUserStroke([{ x, y, timestamp: now, pressure }])

    // Check if starting point is close to the expected starting point
    if (mode === "guided" || mode === "practice") {
      const canvas = canvasRef.current
      if (!canvas) return

      const stroke = strokes[currentStroke]
      if (!stroke) return

      // Convert normalized coordinates to canvas coordinates
      const expectedStartX = stroke.startX * canvas.width
      const expectedStartY = stroke.startY * canvas.height

      // Check if user is close to the expected starting point
      const distance = Math.sqrt(Math.pow(x - expectedStartX, 2) + Math.pow(y - expectedStartY, 2))

      if (distance > 30 && mode === "guided") {
        // Provide visual feedback for incorrect starting point
        context.fillStyle = "rgba(239, 68, 68, 0.5)" // Red with transparency
        context.beginPath()
        context.arc(x, y, 10, 0, Math.PI * 2)
        context.fill()

        // Draw arrow pointing to correct starting point
        drawArrow(context, x, y, expectedStartX, expectedStartY, "rgba(239, 68, 68, 0.7)")
      }
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !context) return

    // Get coordinates
    let x, y, pressure
    if ("touches" in e) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
      // @ts-ignore - Some browsers support pressure
      pressure = e.touches[0].force || 0.5
    } else {
      x = e.nativeEvent.offsetX
      y = e.nativeEvent.offsetY
      pressure = 0.5
    }

    context.lineTo(x, y)
    context.stroke()

    // Add point to current user stroke with timestamp
    const now = Date.now()
    setCurrentUserStroke((prev) => [...prev, { x, y, timestamp: now, pressure }])

    // Provide visual feedback in guided mode
    if (mode === "guided") {
      const canvas = canvasRef.current
      if (!canvas) return

      const stroke = strokes[currentStroke]
      if (!stroke) return

      // Convert normalized coordinates to canvas coordinates
      const expectedStartX = stroke.startX * canvas.width
      const expectedStartY = stroke.startY * canvas.height
      const expectedEndX = stroke.endX * canvas.width
      const expectedEndY = stroke.endY * canvas.height

      // Check if user is close to the expected path
      let isOnPath = false

      if (stroke.type === "line") {
        // Check distance to line
        isOnPath = isPointNearLine(
          { x, y },
          { x: expectedStartX, y: expectedStartY },
          { x: expectedEndX, y: expectedEndY },
          20, // Tolerance in pixels
        )
      } else if (stroke.type === "curve" && stroke.controlX !== undefined && stroke.controlY !== undefined) {
        // Check distance to curve (simplified)
        const controlX = stroke.controlX * canvas.width
        const controlY = stroke.controlY * canvas.height
        isOnPath = isPointNearCurve(
          { x, y },
          { x: expectedStartX, y: expectedStartY },
          { x: expectedEndX, y: expectedEndY },
          { x: controlX, y: controlY },
          20, // Tolerance in pixels
        )
      }

      // Visual feedback based on path correctness
      if (!isOnPath) {
        // Subtle visual feedback for being off path
        context.globalAlpha = 0.3
        context.fillStyle = "#ef4444" // Red
        context.beginPath()
        context.arc(x, y, 3, 0, Math.PI * 2)
        context.fill()
        context.globalAlpha = 1.0
      }

      // Check if user is close to the expected endpoint
      const distanceToEnd = Math.sqrt(Math.pow(x - expectedEndX, 2) + Math.pow(y - expectedEndY, 2))

      if (distanceToEnd < 20) {
        // User is close to the endpoint of the current stroke
        context.fillStyle = "#22c55e" // Green
        context.beginPath()
        context.arc(expectedEndX, expectedEndY, 8, 0, Math.PI * 2)
        context.fill()

        // Move to next stroke if this is the last point of the current stroke
        if (currentStroke < strokes.length - 1) {
          setTimeout(() => {
            setCurrentStroke(currentStroke + 1)
          }, 500)
        }
      }
    }
  }

  const stopDrawing = () => {
    if (!context || !canvasRef.current) return

    setIsDrawing(false)
    context.closePath()

    // Save completed user stroke
    if (currentUserStroke.length > 0) {
      // Analyze stroke direction
      const direction = analyzeStrokeDirection(currentUserStroke)
      setStrokeDirections((prev) => [...prev, direction])

      // Save the stroke
      setUserStrokes((prev) => [...prev, currentUserStroke])
      setCurrentUserStroke([])

      // Check if the stroke was drawn in the correct direction
      if (mode === "guided" || mode === "practice") {
        const canvas = canvasRef.current
        const stroke = strokes[userStrokes.length]

        if (canvas && stroke) {
          const expectedStartX = stroke.startX * canvas.width
          const expectedStartY = stroke.startY * canvas.height
          const expectedEndX = stroke.endX * canvas.width
          const expectedEndY = stroke.endY * canvas.height

          // Determine expected direction
          let expectedDirection = ""
          if (expectedStartY > expectedEndY) expectedDirection += "up"
          else if (expectedStartY < expectedEndY) expectedDirection += "down"

          if (expectedStartX > expectedEndX) expectedDirection += "left"
          else if (expectedStartX < expectedEndX) expectedDirection += "right"

          // Check if direction matches
          const isCorrectDirection =
            direction.includes(expectedDirection) ||
            (expectedDirection.includes("up") && direction.includes("up")) ||
            (expectedDirection.includes("down") && direction.includes("down")) ||
            (expectedDirection.includes("left") && direction.includes("left")) ||
            (expectedDirection.includes("right") && direction.includes("right"))

          if (!isCorrectDirection && mode === "guided") {
            // Show feedback for incorrect direction
            context.font = "14px Arial"
            context.fillStyle = "rgba(239, 68, 68, 0.9)"
            context.textAlign = "center"

            const midX = (expectedStartX + expectedEndX) / 2
            const midY = (expectedStartY + expectedEndY) / 2

            context.fillText("Try drawing in the correct direction", midX, midY - 20)

            // Draw arrow showing correct direction
            drawArrow(context, expectedStartX, expectedStartY, expectedEndX, expectedEndY, "rgba(34, 197, 94, 0.7)")
          }
        }
      }
    }
  }

  // Helper function to draw an arrow
  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
  ) => {
    const headLength = 15
    const angle = Math.atan2(toY - fromY, toX - fromX)

    ctx.save()
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 2
    ctx.setLineDash([5, 3])

    // Draw line
    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.lineTo(toX, toY)
    ctx.stroke()

    // Draw arrowhead
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(toX, toY)
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6))
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6))
    ctx.closePath()
    ctx.fill()

    ctx.restore()
  }

  // Helper function to analyze stroke direction
  const analyzeStrokeDirection = (points: Point[]): string => {
    if (points.length < 2) return "unknown"

    const first = points[0]
    const last = points[points.length - 1]

    let direction = ""

    // Vertical direction
    if (last.y < first.y - 10) direction += "up"
    else if (last.y > first.y + 10) direction += "down"

    // Horizontal direction
    if (last.x < first.x - 10) direction += "left"
    else if (last.x > first.x + 10) direction += "right"

    // If no clear direction, analyze curve
    if (!direction && points.length > 5) {
      // Find the point with maximum deviation from the straight line
      const straightLineDistance = Math.sqrt(Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2))

      let maxDeviation = 0
      let maxDeviationIndex = 0

      for (let i = 1; i < points.length - 1; i++) {
        const deviation = distanceFromPointToLine(points[i], first, last)

        if (deviation > maxDeviation) {
          maxDeviation = deviation
          maxDeviationIndex = i
        }
      }

      if (maxDeviation > 20) {
        // There's a significant curve
        const midPoint = points[maxDeviationIndex]

        // Determine curve direction
        if (midPoint.x > first.x && midPoint.x > last.x) direction = "curve-right"
        else if (midPoint.x < first.x && midPoint.x < last.x) direction = "curve-left"

        if (midPoint.y > first.y && midPoint.y > last.y) direction += "-down"
        else if (midPoint.y < first.y && midPoint.y < last.y) direction += "-up"
      }
    }

    return direction || "unknown"
  }

  // Helper function to calculate distance from point to line
  const distanceFromPointToLine = (point: Point, lineStart: Point, lineEnd: Point): number => {
    const A = point.x - lineStart.x
    const B = point.y - lineStart.y
    const C = lineEnd.x - lineStart.x
    const D = lineEnd.y - lineStart.y

    const dot = A * C + B * D
    const lenSq = C * C + D * D
    let param = -1

    if (lenSq !== 0) param = dot / lenSq

    let xx, yy

    if (param < 0) {
      xx = lineStart.x
      yy = lineStart.y
    } else if (param > 1) {
      xx = lineEnd.x
      yy = lineEnd.y
    } else {
      xx = lineStart.x + param * C
      yy = lineStart.y + param * D
    }

    const dx = point.x - xx
    const dy = point.y - yy

    return Math.sqrt(dx * dx + dy * dy)
  }

  // Helper function to check if a point is near a line
  const isPointNearLine = (
    point: { x: number; y: number },
    lineStart: { x: number; y: number },
    lineEnd: { x: number; y: number },
    tolerance: number,
  ): boolean => {
    return (
      distanceFromPointToLine(
        { x: point.x, y: point.y, timestamp: 0 },
        { x: lineStart.x, y: lineStart.y, timestamp: 0 },
        { x: lineEnd.x, y: lineEnd.y, timestamp: 0 },
      ) <= tolerance
    )
  }

  // Helper function to check if a point is near a curve
  const isPointNearCurve = (
    point: { x: number; y: number },
    start: { x: number; y: number },
    end: { x: number; y: number },
    control: { x: number; y: number },
    tolerance: number,
  ): boolean => {
    // Sample points along the curve
    const numPoints = 20
    let minDistance = Number.POSITIVE_INFINITY

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints
      const x = Math.pow(1 - t, 2) * start.x + 2 * (1 - t) * t * control.x + Math.pow(t, 2) * end.x
      const y = Math.pow(1 - t, 2) * start.y + 2 * (1 - t) * t * control.y + Math.pow(t, 2) * end.y

      const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2))
      minDistance = Math.min(minDistance, distance)
    }

    return minDistance <= tolerance
  }

  // Clear the canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas || !context) return

    context.clearRect(0, 0, canvas.width, canvas.height)
    setUserStrokes([])
    setCurrentUserStroke([])
    setStrokeDirections([])
    setCurrentStroke(0)

    // Redraw guide lines
    drawGuideLines(context)
  }

  // Calculate accuracy of user strokes compared to expected strokes
  const calculateAccuracy = () => {
    const canvas = canvasRef.current
    if (!canvas) return Array(strokes.length).fill(0)

    // If no user strokes, return zero accuracy
    if (userStrokes.length === 0) return Array(strokes.length).fill(0)

    // Calculate accuracy for each stroke
    const accuracies = strokes.map((stroke, index) => {
      // If we don't have a user stroke for this expected stroke, return 0
      if (index >= userStrokes.length) return 0

      const userStroke = userStrokes[index]

      // Convert normalized coordinates to canvas coordinates
      const startX = stroke.startX * canvas.width
      const startY = stroke.startY * canvas.height
      const endX = stroke.endX * canvas.width
      const endY = stroke.endY * canvas.height

      // Check start point accuracy
      const startPointAccuracy = calculatePointAccuracy(userStroke[0], { x: startX, y: startY })

      // Check end point accuracy
      const endPointAccuracy = calculatePointAccuracy(userStroke[userStroke.length - 1], { x: endX, y: endY })

      // Check path accuracy (simplified)
      let pathAccuracy = 0
      if (stroke.type === "line") {
        pathAccuracy = calculateLinePathAccuracy(userStroke, { x: startX, y: startY }, { x: endX, y: endY })
      } else if (stroke.type === "curve" && stroke.controlX !== undefined && stroke.controlY !== undefined) {
        const controlX = stroke.controlX * canvas.width
        const controlY = stroke.controlY * canvas.height
        pathAccuracy = calculateCurvePathAccuracy(
          userStroke,
          { x: startX, y: startY },
          { x: endX, y: endY },
          { x: controlX, y: controlY },
        )
      } else if (
        stroke.type === "circle" &&
        stroke.centerX !== undefined &&
        stroke.centerY !== undefined &&
        stroke.radius !== undefined
      ) {
        const centerX = stroke.centerX * canvas.width
        const centerY = stroke.centerY * canvas.height
        const radius = stroke.radius * canvas.width
        pathAccuracy = calculateCircleAccuracy(userStroke, { x: centerX, y: centerY }, radius)
      } else {
        pathAccuracy = 0.5 // Default for other stroke types
      }

      // Check stroke direction accuracy
      let directionAccuracy = 0.5 // Default value
      if (strokeDirections[index]) {
        // Determine expected direction
        let expectedDirection = ""
        if (startY > endY) expectedDirection += "up"
        else if (startY < endY) expectedDirection += "down"

        if (startX > endX) expectedDirection += "left"
        else if (startX < endX) expectedDirection += "right"

        // Check if direction matches
        const direction = strokeDirections[index]
        const isCorrectDirection =
          direction.includes(expectedDirection) ||
          (expectedDirection.includes("up") && direction.includes("up")) ||
          (expectedDirection.includes("down") && direction.includes("down")) ||
          (expectedDirection.includes("left") && direction.includes("left")) ||
          (expectedDirection.includes("right") && direction.includes("right"))

        directionAccuracy = isCorrectDirection ? 1.0 : 0.2
      }

      // Check stroke speed and fluidity
      let speedAccuracy = 0.5 // Default value
      if (userStroke.length > 1) {
        const strokeDuration = userStroke[userStroke.length - 1].timestamp - userStroke[0].timestamp

        // Calculate average speed (pixels per ms)
        let totalDistance = 0
        for (let i = 1; i < userStroke.length; i++) {
          totalDistance += Math.sqrt(
            Math.pow(userStroke[i].x - userStroke[i - 1].x, 2) + Math.pow(userStroke[i].y - userStroke[i - 1].y, 2),
          )
        }

        const avgSpeed = totalDistance / strokeDuration

        // Check if speed is reasonable (not too slow or too fast)
        // Typical good speed range: 0.1-1.0 pixels/ms
        if (avgSpeed > 0.05 && avgSpeed < 2.0) {
          speedAccuracy = 0.8

          // Check for fluidity (consistent speed)
          let speedVariation = 0
          for (let i = 1; i < userStroke.length - 1; i++) {
            const segmentDistance = Math.sqrt(
              Math.pow(userStroke[i + 1].x - userStroke[i].x, 2) + Math.pow(userStroke[i + 1].y - userStroke[i].y, 2),
            )
            const segmentDuration = userStroke[i + 1].timestamp - userStroke[i].timestamp
            const segmentSpeed = segmentDistance / (segmentDuration || 1)

            speedVariation += Math.abs(segmentSpeed - avgSpeed)
          }

          const avgSpeedVariation = speedVariation / (userStroke.length - 2 || 1)

          // Lower variation means more fluid stroke
          if (avgSpeedVariation < 0.3) {
            speedAccuracy = 1.0
          }
        }
      }

      // Combine accuracies (weighted)
      return (
        startPointAccuracy * 0.2 +
        endPointAccuracy * 0.2 +
        pathAccuracy * 0.3 +
        directionAccuracy * 0.2 +
        speedAccuracy * 0.1
      )
    })

    return accuracies
  }

  // Helper function to calculate accuracy between two points
  const calculatePointAccuracy = (point: Point, target: { x: number; y: number }) => {
    const distance = Math.sqrt(Math.pow(point.x - target.x, 2) + Math.pow(point.y - target.y, 2))
    const canvas = canvasRef.current
    if (!canvas) return 0

    // Convert distance to accuracy (0-1)
    // 20px or less is considered perfect, 100px or more is considered completely wrong
    const maxDistance = 100
    const minDistance = 20

    if (distance <= minDistance) return 1
    if (distance >= maxDistance) return 0

    return 1 - (distance - minDistance) / (maxDistance - minDistance)
  }

  // Helper function to calculate accuracy of a line path
  const calculateLinePathAccuracy = (
    userStroke: Point[],
    start: { x: number; y: number },
    end: { x: number; y: number },
  ) => {
    // Calculate average distance from each point to the line
    let totalDistance = 0

    for (const point of userStroke) {
      // Calculate distance from point to line
      const lineLength = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))
      if (lineLength === 0) continue

      const t =
        ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) / (lineLength * lineLength)
      const projectionX = start.x + t * (end.x - start.x)
      const projectionY = start.y + t * (end.y - start.y)

      const distance = Math.sqrt(Math.pow(point.x - projectionX, 2) + Math.pow(point.y - projectionY, 2))
      totalDistance += distance
    }

    const averageDistance = totalDistance / userStroke.length

    // Convert distance to accuracy (0-1)
    // 10px or less is considered perfect, 50px or more is considered completely wrong
    const maxDistance = 50
    const minDistance = 10

    if (averageDistance <= minDistance) return 1
    if (averageDistance >= maxDistance) return 0

    return 1 - (averageDistance - minDistance) / (maxDistance - minDistance)
  }

  // Helper function to calculate accuracy of a curve path
  const calculateCurvePathAccuracy = (
    userStroke: Point[],
    start: { x: number; y: number },
    end: { x: number; y: number },
    control: { x: number; y: number },
  ) => {
    // Generate points along the quadratic curve
    const numPoints = 20
    const expectedPoints: { x: number; y: number }[] = []

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints
      const x = Math.pow(1 - t, 2) * start.x + 2 * (1 - t) * t * control.x + Math.pow(t, 2) * end.x
      const y = Math.pow(1 - t, 2) * start.y + 2 * (1 - t) * t * control.y + Math.pow(t, 2) * end.y
      expectedPoints.push({ x, y })
    }

    // Calculate minimum distances from user points to curve points
    let totalDistance = 0
    for (const userPoint of userStroke) {
      let minDistance = Number.POSITIVE_INFINITY
      for (const curvePoint of expectedPoints) {
        const distance = Math.sqrt(Math.pow(userPoint.x - curvePoint.x, 2) + Math.pow(userPoint.y - curvePoint.y, 2))
        minDistance = Math.min(minDistance, distance)
      }
      totalDistance += minDistance
    }

    const averageDistance = totalDistance / userStroke.length

    // Convert distance to accuracy (0-1)
    // 15px or less is considered perfect, 60px or more is considered completely wrong
    const maxDistance = 60
    const minDistance = 15

    if (averageDistance <= minDistance) return 1
    if (averageDistance >= maxDistance) return 0

    return 1 - (averageDistance - minDistance) / (maxDistance - minDistance)
  }

  // Helper function to calculate accuracy of a circle
  const calculateCircleAccuracy = (userStroke: Point[], center: { x: number; y: number }, radius: number) => {
    // Calculate how well the user's stroke follows a circle
    let totalRadiusDeviation = 0

    for (const point of userStroke) {
      // Calculate distance from point to center
      const distanceToCenter = Math.sqrt(Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2))

      // Calculate deviation from expected radius
      const radiusDeviation = Math.abs(distanceToCenter - radius)
      totalRadiusDeviation += radiusDeviation
    }

    const averageDeviation = totalRadiusDeviation / userStroke.length

    // Convert deviation to accuracy (0-1)
    // 10px or less is considered perfect, 40px or more is considered completely wrong
    const maxDeviation = 40
    const minDeviation = 10

    if (averageDeviation <= minDeviation) return 1
    if (averageDeviation >= maxDeviation) return 0

    return 1 - (averageDeviation - minDeviation) / (maxDeviation - minDeviation)
  }

  // Helper function to draw guide lines based on the letter and mode
  const drawGuideLines = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // // Draw guide letter based on mode
    // ctx.font = "120px Arial"
    // ctx.textAlign = "center"
    // ctx.textBaseline = "middle"

    if (mode === "guided") {
      // Fully visible guide for guided mode
      ctx.fillStyle = "rgba(180, 180, 240, 0.2)"
    } else if (mode === "practice") {
      // Faint guide for practice mode
      ctx.fillStyle = "rgba(180, 180, 240, 0.1)"
    } else {
      // Very faint guide for free drawing mode
      ctx.fillStyle = "rgba(180, 180, 240, 0.05)"
    }

    ctx.fillText(letter, canvas.width / 2, canvas.height / 2)

    // // Draw dotted circle guide
    // ctx.beginPath()
    // ctx.arc(canvas.width / 2, canvas.height / 2, 100, 0, Math.PI * 2)
    // ctx.strokeStyle = "rgba(180, 180, 240, 0.5)"
    // ctx.setLineDash([5, 5])
    // ctx.lineWidth = 2
    // ctx.stroke()

    // Draw stroke guides based on mode
    if (mode === "guided" || mode === "practice") {
      // Draw all strokes as guides
      strokes.forEach((stroke, index) => {
        const startX = stroke.startX * canvas.width
        const startY = stroke.startY * canvas.height
        const endX = stroke.endX * canvas.width
        const endY = stroke.endY * canvas.height

        // Set color and line style based on current stroke and mode
        if (mode === "guided") {
          if (index === currentStroke) {
            ctx.strokeStyle = "rgba(79, 70, 229, 0.7)" // Indigo for current stroke
            ctx.lineWidth = 4
            ctx.setLineDash([5, 5])
          } else if (index < currentStroke) {
            ctx.strokeStyle = "rgba(34, 197, 94, 0.5)" // Green for completed strokes
            ctx.lineWidth = 3
            ctx.setLineDash([])
          } else {
            ctx.strokeStyle = "rgba(180, 180, 240, 0.3)" // Light blue for future strokes
            ctx.lineWidth = 2
            ctx.setLineDash([3, 3])
          }
        } else {
          // Practice mode - fainter guides
          ctx.strokeStyle = "rgba(180, 180, 240, 0.3)"
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
        }

        ctx.beginPath()

        if (stroke.type === "line") {
          // Draw line with animated dashes for current stroke
          if (index === currentStroke && mode === "guided") {
            // Draw animated dashed line for better tracing guidance
            const dashLength = 10
            const dashGap = 5
            const lineLength = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2))
            const dashCount = Math.floor(lineLength / (dashLength + dashGap))

            for (let i = 0; i < dashCount; i++) {
              const t1 = i / dashCount
              const t2 = (i + 0.5) / dashCount

              const x1 = startX + (endX - startX) * t1
              const y1 = startY + (endY - startY) * t1
              const x2 = startX + (endX - startX) * t2
              const y2 = startY + (endY - startY) * t2

              ctx.beginPath()
              ctx.moveTo(x1, y1)
              ctx.lineTo(x2, y2)
              ctx.stroke()
            }
          } else {
            // Regular line
            ctx.moveTo(startX, startY)
            ctx.lineTo(endX, endY)
            ctx.stroke()
          }
        } else if (stroke.type === "curve" && stroke.controlX !== undefined && stroke.controlY !== undefined) {
          // Draw curve
          const controlX = stroke.controlX * canvas.width
          const controlY = stroke.controlY * canvas.height

          if (index === currentStroke && mode === "guided") {
            // Draw animated dashed curve for better tracing guidance
            const segments = 20
            for (let i = 0; i < segments; i++) {
              const t1 = i / segments
              const t2 = (i + 0.5) / segments

              const x1 = Math.pow(1 - t1, 2) * startX + 2 * (1 - t1) * t1 * controlX + Math.pow(t1, 2) * endX
              const y1 = Math.pow(1 - t1, 2) * startY + 2 * (1 - t1) * t1 * controlY + Math.pow(t1, 2) * endY

              const x2 = Math.pow(1 - t2, 2) * startX + 2 * (1 - t2) * t2 * controlX + Math.pow(t2, 2) * endX
              const y2 = Math.pow(1 - t2, 2) * startY + 2 * (1 - t2) * t2 * controlY + Math.pow(t2, 2) * endY

              ctx.beginPath()
              ctx.moveTo(x1, y1)
              ctx.lineTo(x2, y2)
              ctx.stroke()
            }
          } else {
            // Regular curve
            ctx.moveTo(startX, startY)
            ctx.quadraticCurveTo(controlX, controlY, endX, endY)
            ctx.stroke()
          }
        } else if (
          stroke.type === "circle" &&
          stroke.centerX !== undefined &&
          stroke.centerY !== undefined &&
          stroke.radius !== undefined
        ) {
          // Draw circle
          const centerX = stroke.centerX * canvas.width
          const centerY = stroke.centerY * canvas.height
          const radius = stroke.radius * canvas.width

          if (index === currentStroke && mode === "guided") {
            // Draw animated dashed circle for better tracing guidance
            const segments = 20
            for (let i = 0; i < segments; i++) {
              const angle1 = (i / segments) * Math.PI * 2
              const angle2 = ((i + 0.5) / segments) * Math.PI * 2

              const x1 = centerX + radius * Math.cos(angle1)
              const y1 = centerY + radius * Math.sin(angle1)
              const x2 = centerX + radius * Math.cos(angle2)
              const y2 = centerY + radius * Math.sin(angle2)

              ctx.beginPath()
              ctx.moveTo(x1, y1)
              ctx.lineTo(x2, y2)
              ctx.stroke()
            }
          } else {
            // Regular circle
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
            ctx.stroke()
          }
        }

        // Draw start and end points
        if (mode === "guided") {
          if (index === currentStroke) {
            // Start point for current stroke - make it more noticeable
            ctx.fillStyle = "rgba(239, 68, 68, 0.8)" // Brighter red
            ctx.beginPath()
            ctx.arc(startX, startY, 8, 0, Math.PI * 2)
            ctx.fill()

            // Add pulsing effect to start point
            ctx.beginPath()
            ctx.arc(startX, startY, 12 + Math.sin(Date.now() / 200) * 3, 0, Math.PI * 2)
            ctx.fillStyle = "rgba(239, 68, 68, 0.3)"
            ctx.fill()

            // End point for current stroke
            ctx.fillStyle = "rgba(34, 197, 94, 0.7)" // Green
            ctx.beginPath()
            ctx.arc(endX, endY, 6, 0, Math.PI * 2)
            ctx.fill()

            // Add labels with child-friendly text
            ctx.font = "14px Arial"
            ctx.fillStyle = "#000"
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.fillText("Start here!", startX, startY - 20)
            ctx.fillText("End here!", endX, endY - 20)

            // Draw arrow showing direction with animated dash offset
            const dashOffset = (Date.now() / 100) % 20
            ctx.setLineDash([5, 5])
            ctx.lineDashOffset = -dashOffset
            drawArrow(ctx, startX, startY, endX, endY, "rgba(79, 70, 229, 0.6)")
            ctx.setLineDash([])

            // Draw finger pointer icon near start point for better guidance
            drawFingerPointer(ctx, startX - 20, startY - 10)
          }
        }
      })
    }
  }

  // Add a helper function to draw a finger pointer icon
  const drawFingerPointer = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.save()

    // Draw hand shape
    ctx.fillStyle = "rgba(255, 200, 150, 0.9)"
    ctx.strokeStyle = "rgba(100, 80, 60, 0.8)"
    ctx.lineWidth = 1.5

    // Finger
    ctx.beginPath()
    ctx.ellipse(x, y, 8, 12, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Hand
    ctx.beginPath()
    ctx.ellipse(x - 5, y + 15, 10, 8, -Math.PI / 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.restore()
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-[400px] bg-white rounded-lg touch-none"
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
    />
  )
})

DrawingCanvas.displayName = "DrawingCanvas"

export default DrawingCanvas

