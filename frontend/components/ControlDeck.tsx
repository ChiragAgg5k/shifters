'use client'

import { useState } from 'react'
import { Play, Square, RotateCcw } from 'lucide-react'

interface ControlDeckProps {
  raceActive: boolean
  setRaceActive: (active: boolean) => void
}

export function ControlDeck({ raceActive, setRaceActive }: ControlDeckProps) {
  const [numAgents, setNumAgents] = useState(5)
  const [numLaps, setNumLaps] = useState(3)
  const [circuit, setCircuit] = useState('mc-1929')
  const [circuits, setCircuits] = useState<any[]>([])

  const startRace = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      const response = await fetch(`${backendUrl}/api/simulation/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          num_agents: numAgents,
          num_laps: numLaps,
          circuit_id: circuit,
        }),
      })
      if (response.ok) {
        setRaceActive(true)
      }
    } catch (error) {
      console.error('Error starting race:', error)
    }
  }

  const stopRace = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      const response = await fetch(`${backendUrl}/api/simulation/stop`, {
        method: 'POST',
      })
      if (response.ok) {
        setRaceActive(false)
      }
    } catch (error) {
      console.error('Error stopping race:', error)
    }
  }

  const resetView = () => {
    window.location.reload()
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Number of Agents</label>
          <input
            type="number"
            min="2"
            max="20"
            value={numAgents}
            onChange={(e) => setNumAgents(parseInt(e.target.value))}
            disabled={raceActive}
            className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Circuit</label>
          <select
            value={circuit}
            onChange={(e) => setCircuit(e.target.value)}
            disabled={raceActive}
            className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            <option value="mc-1929">Circuit de Monaco</option>
            <option value="gb-1948">Silverstone Circuit</option>
            <option value="be-1925">Circuit de Spa-Francorchamps</option>
            <option value="au-1953">Albert Park Circuit</option>
            <option value="it-1922">Autodromo Nazionale Monza</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Number of Laps</label>
          <input
            type="number"
            min="1"
            max="100"
            value={numLaps}
            onChange={(e) => setNumLaps(parseInt(e.target.value))}
            disabled={raceActive}
            className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Status</label>
          <div className="px-3 py-2 bg-input border border-border rounded-md text-foreground flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${raceActive ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
            <span className="text-sm font-medium">{raceActive ? 'RACING' : 'IDLE'}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={startRace}
          disabled={raceActive}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play size={18} />
          Start Race
        </button>

        <button
          onClick={stopRace}
          disabled={!raceActive}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-md font-medium hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Square size={18} />
          Stop Race
        </button>

        <button
          onClick={resetView}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md font-medium hover:bg-secondary/80 transition-colors"
        >
          <RotateCcw size={18} />
          Reset
        </button>
      </div>
    </div>
  )
}
