'use client'

import { RaceVisualization } from '@/components/RaceVisualization'
import { ControlDeck } from '@/components/ControlDeck'
import { DataGrid } from '@/components/DataGrid'
import { RaceReport } from '@/components/RaceReport'
import { useRaceSimulation } from '@/lib/hooks/useRaceSimulation'

export default function Home() {
  const {
    raceState,
    isRunning,
    startRace,
    stopRace,
    updateSpeedMultiplier,
    updateTrackTemperature,
    updateWeather,
    updateRainProbability,
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
          <div className="lg:col-span-2">
            <RaceVisualization raceState={raceState} />
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
              updateVehicleMaxSpeed={updateVehicleMaxSpeed}
              updateVehicleAcceleration={updateVehicleAcceleration}
              updateVehicleDnfProbability={updateVehicleDnfProbability}
              updateVehicleCorneringSkill={updateVehicleCorneringSkill}
            />
          </div>
        </div>

        <div className="mt-6">
          <DataGrid raceState={raceState} />
        </div>

        {/* Race Report - shown when race is complete */}
        {raceState?.raceReport && (
          <div className="mt-6">
            <RaceReport reportData={raceState.raceReport} />
          </div>
        )}
      </div>
    </div>
  )
}
