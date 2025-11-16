'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { RaceVisualization } from '@/components/RaceVisualization'
import { ControlDeck } from '@/components/ControlDeck'
import { DataGrid } from '@/components/DataGrid'
import { useRaceSimulation } from '@/lib/hooks/useRaceSimulation'

// Dynamically import 3D visualization to avoid SSR issues with Three.js
const Race3DVisualization = dynamic(
  () => import('@/components/Race3DVisualization').then(mod => ({ default: mod.Race3DVisualization })),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-card border border-border rounded-lg flex items-center justify-center" style={{ height: '600px' }}>
        <div className="text-center">
          <div className="text-2xl mb-2">🎮</div>
          <div className="text-muted-foreground">Loading 3D Visualization...</div>
        </div>
      </div>
    )
  }
)

export default function Home() {
  const [view3D, setView3D] = useState(true)
  
  const {
    raceState,
    isRunning,
    startRace,
    stopRace,
    updateSpeedMultiplier,
    updateTrackTemperature,
    updateWeather,
    updateRainProbability,
    updateGlobalDnfProbability,
    updateVehicleMaxSpeed,
    updateVehicleAcceleration,
    updateVehicleDnfProbability,
    updateVehicleCorneringSkill,
    updateVehicleDifferentialPreload,
    updateVehicleEngineBraking,
    updateVehicleBrakeBalance
  } = useRaceSimulation()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">🏎️ F1 Race Simulator</h1>
          <p className="text-muted-foreground">Real-time F1 racing with advanced physics and strategy</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* View Toggle */}
            <div className="flex justify-end">
              <button
                onClick={() => setView3D(!view3D)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
              >
                {view3D ? '📐 Switch to 2D' : '🎮 Switch to 3D'}
              </button>
            </div>
            
            {/* Visualization */}
            {view3D ? (
              raceState ? (
                <Race3DVisualization raceState={raceState} />
              ) : (
                <div className="bg-card border border-border rounded-lg flex items-center justify-center" style={{ height: '600px' }}>
                  <div className="text-center">
                    <div className="text-2xl mb-2">🏁</div>
                    <div className="text-muted-foreground">Start a race to see the 3D visualization</div>
                  </div>
                </div>
              )
            ) : (
              <RaceVisualization raceState={raceState} />
            )}
          </div>
          <div>
            <ControlDeck
              raceActive={isRunning}
              setRaceActive={() => { }}
              startRace={startRace}
              stopRace={stopRace}
              updateSpeedMultiplier={updateSpeedMultiplier}
              updateTrackTemperature={updateTrackTemperature}
              updateWeather={updateWeather}
              updateRainProbability={updateRainProbability}
              updateGlobalDnfProbability={updateGlobalDnfProbability}
              updateVehicleMaxSpeed={updateVehicleMaxSpeed}
              updateVehicleAcceleration={updateVehicleAcceleration}
              updateVehicleDnfProbability={updateVehicleDnfProbability}
              updateVehicleCorneringSkill={updateVehicleCorneringSkill}
              updateVehicleDifferentialPreload={updateVehicleDifferentialPreload}
              updateVehicleEngineBraking={updateVehicleEngineBraking}
              updateVehicleBrakeBalance={updateVehicleBrakeBalance}
            />
          </div>
        </div>

        <div className="mt-6">
          <DataGrid raceState={raceState} />
        </div>

        {/* Race Report - shown when race is complete */}
        {/* {raceState?.raceReport && (
          <div className="mt-6">
            <RaceReport reportData={raceState.raceReport} />
          </div>
        )} */}
      </div>
    </div>
  )
}
