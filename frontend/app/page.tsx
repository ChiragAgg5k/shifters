'use client'

import { RaceVisualization } from '@/components/RaceVisualization'
import { ControlDeck } from '@/components/ControlDeck'
import { DataGrid } from '@/components/DataGrid'
import { useRaceSimulation } from '@/lib/hooks/useRaceSimulation'

export default function Home() {
  const { raceState, isRunning, startRace, stopRace } = useRaceSimulation()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">🏎️ F1 Race Simulator</h1>
          <p className="text-muted-foreground">Real-time F1 racing with advanced physics and strategy</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RaceVisualization raceState={raceState} />
          </div>
          <div>
            <ControlDeck raceActive={isRunning} setRaceActive={() => {}} startRace={startRace} stopRace={stopRace} />
          </div>
        </div>

        <div className="mt-6">
          <DataGrid raceState={raceState} />
        </div>
      </div>
    </div>
  )
}
