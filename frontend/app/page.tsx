'use client'

import { useEffect, useState } from 'react'
import { RaceVisualization } from '@/components/RaceVisualization'
import { ControlDeck } from '@/components/ControlDeck'
import { DataGrid } from '@/components/DataGrid'
import { ConnectionStatus } from '@/components/ConnectionStatus'

export default function Home() {
  const [connected, setConnected] = useState(false)
  const [raceState, setRaceState] = useState<any>(null)
  const [raceActive, setRaceActive] = useState(false)

  useEffect(() => {
    let ws: WebSocket | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null
    let isMounted = true

    const connectWebSocket = () => {
      if (!isMounted) return

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      const wsUrl = backendUrl.replace(/^http/, 'ws').replace(/^https/, 'wss') + '/ws'

      try {
        ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          if (isMounted) {
            setConnected(true)
            console.log('WebSocket connected')
          }
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (isMounted) {
              setRaceState(data)
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          if (isMounted) {
            setConnected(false)
          }
        }

        ws.onclose = () => {
          if (isMounted) {
            setConnected(false)
            console.log('WebSocket disconnected, attempting to reconnect in 3 seconds...')
            reconnectTimeout = setTimeout(connectWebSocket, 3000)
          }
        }
      } catch (error) {
        console.error('Failed to create WebSocket:', error)
        if (isMounted) {
          reconnectTimeout = setTimeout(connectWebSocket, 3000)
        }
      }
    }

    connectWebSocket()

    return () => {
      isMounted = false
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close()
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary">🏎️ Shifters Racing Simulator</h1>
          <p className="text-muted-foreground">Real-time Competitive Mobility Systems Visualization</p>
        </div>

        {/* Control Deck */}
        <ControlDeck raceActive={raceActive} setRaceActive={setRaceActive} />

        {/* Race Visualization */}
        <RaceVisualization raceState={raceState} />

        {/* Data Grid */}
        <DataGrid raceState={raceState} />
      </div>

      {/* Connection Status */}
      <ConnectionStatus connected={connected} />
    </div>
  )
}
