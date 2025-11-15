'use client'

import { useEffect, useRef } from 'react'

interface RaceVisualizationProps {
  raceState: any
}

const AGENT_COLORS = [
  '#f97373', '#ef4444', '#dc2626', '#fb923c', '#facc15',
  '#fda4af', '#fecaca', '#f97316', '#ea580c', '#991b1b',
  '#b91c1c', '#fbbf24', '#fee2e2', '#7f1d1d', '#f87171'
]

export function RaceVisualization({ raceState }: RaceVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !raceState) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#050712'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (!raceState.environment || !raceState.agents) return

    const track = raceState.environment.track
    const trackLength = track.length

    // Debug logging
    if (raceState.step === 0 || raceState.step % 100 === 0) {
      console.log('Track data:', {
        name: track.name,
        hasGeometry: track.hasGeometry,
        coordinates_exists: !!track.coordinates,
        coordinates_length: track.coordinates?.length || 0,
        trackType: track.trackType,
      })
    }

    // Draw track based on geometry
    if (track.hasGeometry && track.coordinates && Array.isArray(track.coordinates) && track.coordinates.length > 0) {
      drawGeoJSONTrack(ctx, canvas, track, raceState.agents)
    } else {
      drawCircularTrack(ctx, canvas, trackLength, raceState.agents)
    }
  }, [raceState])

  const drawCircularTrack = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    trackLength: number,
    agents: any[]
  ) => {
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(canvas.width, canvas.height) / 2 - 80

    // Draw track
    ctx.strokeStyle = '#1f2937'
    ctx.lineWidth = 60
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.stroke()

    // Draw center line
    ctx.strokeStyle = '#374151'
    ctx.lineWidth = 2
    ctx.setLineDash([10, 10])
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw start/finish line
    const startAngle = -Math.PI / 2
    const startX = centerX + radius * Math.cos(startAngle)
    const startY = centerY + radius * Math.sin(startAngle)

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(startX - 30, startY)
    ctx.lineTo(startX + 30, startY)
    ctx.stroke()

    // Draw agents - skip if just crossed finish line to prevent visual jump
    agents.forEach((agent, index) => {
      // Skip this agent if it just crossed the finish line
      if (agent.just_crossed_line) return
      
      const progress = agent.position / trackLength
      const angle = startAngle + progress * 2 * Math.PI
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)
      drawAgent(ctx, agent, index, x, y)
    })
  }

  const drawGeoJSONTrack = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    track: any,
    agents: any[]
  ) => {
    const coords = track.coordinates

    // Calculate bounding box
    const minX = Math.min(...coords.map((c: any) => c.x))
    const maxX = Math.max(...coords.map((c: any) => c.x))
    const minY = Math.min(...coords.map((c: any) => c.y))
    const maxY = Math.max(...coords.map((c: any) => c.y))

    const padding = 60
    const availableWidth = canvas.width - 2 * padding
    const availableHeight = canvas.height - 2 * padding

    const trackWidth = maxX - minX
    const trackHeight = maxY - minY

    const scale = Math.min(availableWidth / trackWidth, availableHeight / trackHeight)

    const offsetX = padding + (availableWidth - trackWidth * scale) / 2
    const offsetY = padding + (availableHeight - trackHeight * scale) / 2

    const transform = (coord: any) => ({
      x: offsetX + (coord.x - minX) * scale,
      y: offsetY + (coord.y - minY) * scale,
    })

    // Draw track outline
    ctx.strokeStyle = '#1f2937'
    ctx.lineWidth = 40
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()

    const transformedCoords = coords.map(transform)
    if (transformedCoords.length > 0) {
      ctx.moveTo(transformedCoords[0].x, transformedCoords[0].y)
      for (let i = 1; i < transformedCoords.length; i++) {
        ctx.lineTo(transformedCoords[i].x, transformedCoords[i].y)
      }
      if (track.track_type === 'circuit') {
        ctx.lineTo(transformedCoords[0].x, transformedCoords[0].y)
      }
    }
    ctx.stroke()

    // Draw center line
    ctx.strokeStyle = '#374151'
    ctx.lineWidth = 2
    ctx.setLineDash([10, 10])
    ctx.beginPath()
    if (transformedCoords.length > 0) {
      ctx.moveTo(transformedCoords[0].x, transformedCoords[0].y)
      for (let i = 1; i < transformedCoords.length; i++) {
        ctx.lineTo(transformedCoords[i].x, transformedCoords[i].y)
      }
      if (track.track_type === 'circuit') {
        ctx.lineTo(transformedCoords[0].x, transformedCoords[0].y)
      }
    }
    ctx.stroke()
    ctx.setLineDash([])

    // Draw start/finish line
    if (transformedCoords.length > 0) {
      const start = transformedCoords[0]
      const next = transformedCoords[1] || transformedCoords[0]

      const dx = next.x - start.x
      const dy = next.y - start.y
      const length = Math.sqrt(dx * dx + dy * dy)
      const perpX = (-dy / length) * 20
      const perpY = (dx / length) * 20

      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.moveTo(start.x - perpX, start.y - perpY)
      ctx.lineTo(start.x + perpX, start.y + perpY)
      ctx.stroke()
    }

    // Draw agents - skip if just crossed finish line to prevent visual jump
    agents.forEach((agent, index) => {
      // Skip this agent if it just crossed the finish line
      if (agent.just_crossed_line) return
      
      const progress = agent.position / track.length
      const distances = [0]
      for (let i = 1; i < coords.length; i++) {
        const dx = coords[i].x - coords[i - 1].x
        const dy = coords[i].y - coords[i - 1].y
        const segmentDist = Math.sqrt(dx * dx + dy * dy)
        distances.push(distances[i - 1] + segmentDist)
      }

      const targetDist = progress * distances[distances.length - 1]

      let segmentIndex = 0
      for (let i = 1; i < distances.length; i++) {
        if (targetDist <= distances[i]) {
          segmentIndex = i - 1
          break
        }
      }

      const segStart = distances[segmentIndex]
      const segEnd = distances[segmentIndex + 1] || distances[segmentIndex]
      const segProgress = segEnd - segStart > 0 ? (targetDist - segStart) / (segEnd - segStart) : 0

      const coord1 = coords[segmentIndex]
      const coord2 = coords[(segmentIndex + 1) % coords.length]

      const agentX = coord1.x + (coord2.x - coord1.x) * segProgress
      const agentY = coord1.y + (coord2.y - coord1.y) * segProgress

      const transformed = transform({ x: agentX, y: agentY })
      drawAgent(ctx, agent, index, transformed.x, transformed.y)
    })
  }

  const drawAgent = (
    ctx: CanvasRenderingContext2D,
    agent: any,
    index: number,
    x: number,
    y: number
  ) => {
    const color = AGENT_COLORS[index % AGENT_COLORS.length]

    // Agent circle
    ctx.fillStyle = agent.finished ? '#4ade80' : color
    ctx.beginPath()
    ctx.arc(x, y, 12, 0, Math.PI * 2)
    ctx.fill()

    // Agent border
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()

    // Agent label
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(agent.name.split('#')[1] || (index + 1).toString(), x, y + 4)

    // Speed indicator
    if (agent.speed > 0 && !agent.finished) {
      const speedFactor = agent.speed / 200
      ctx.strokeStyle = color
      ctx.lineWidth = 4
      ctx.globalAlpha = 0.3 * speedFactor
      ctx.beginPath()
      ctx.arc(x, y, 16 + speedFactor * 8, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="w-full h-auto bg-black rounded-lg"
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-input rounded-md p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">Simulation Time</div>
          <div className="text-lg font-bold text-primary">{raceState?.time?.toFixed(1) || '0.0'}s</div>
        </div>
        <div className="bg-input rounded-md p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">Current Step</div>
          <div className="text-lg font-bold text-primary">{raceState?.step || 0}</div>
        </div>
        <div className="bg-input rounded-md p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">Active Agents</div>
          <div className="text-lg font-bold text-primary">
            {raceState?.agents?.filter((a: any) => !a.finished).length || 0}
          </div>
        </div>
        <div className="bg-input rounded-md p-3 text-center">
          <div className="text-xs text-muted-foreground mb-1">Finished</div>
          <div className="text-lg font-bold text-primary">
            {raceState?.agents?.filter((a: any) => a.finished).length || 0}
          </div>
        </div>
      </div>
    </div>
  )
}
