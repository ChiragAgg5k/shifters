'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { RaceVisualization } from '@/components/RaceVisualization'
import { DataGrid } from '@/components/DataGrid'
import { RaceReport } from '@/components/RaceReport'
import { usePlayerRaceSimulation } from '@/lib/hooks/usePlayerRaceSimulation'
import { Play, Square, RotateCcw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

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

export default function PlayerMode() {
  const [view3D, setView3D] = useState(true)
  const [circuit, setCircuit] = useState('mc-1929')
  const [numLaps, setNumLaps] = useState(3)
  const [numOpponents, setNumOpponents] = useState(4)
  const [circuits, setCircuits] = useState<any[]>([])
  const [playerName, setPlayerName] = useState('Player')
  const [playerNumber, setPlayerNumber] = useState(1)
  const [showReport, setShowReport] = useState(false)
  
  // Race settings
  const [trackTemp, setTrackTemp] = useState(35)
  const [rainProbability, setRainProbability] = useState(0)
  const [speedMultiplier, setSpeedMultiplier] = useState(1)
  
  // Player vehicle real-time controls
  const [differential, setDifferential] = useState(50)
  const [engineBraking, setEngineBraking] = useState(0.5)
  const [brakeBalance, setBrakeBalance] = useState(0.54)
  
  // Pit strategy settings
  const [pitStrategy, setPitStrategy] = useState<'aggressive' | 'conservative' | 'balanced'>('balanced')
  const [targetPitLap, setTargetPitLap] = useState(15)
  const [tireStrategy, setTireStrategy] = useState<'soft-medium' | 'medium-hard' | 'soft-hard'>('soft-medium')
  
  const {
    raceState,
    isRunning,
    startRace,
    stopRace,
    updateSpeedMultiplier,
    updateTrackTemperature,
    updateRainProbability,
    updatePlayerDifferential,
    updatePlayerEngineBraking,
    updatePlayerBrakeBalance,
    reportData
  } = usePlayerRaceSimulation()

  // Load circuits
  useEffect(() => {
    const loadCircuits = async () => {
      try {
        const response = await fetch('/data/circuits/f1-2024-circuits.json')
        const data = await response.json()
        if (data.circuits) {
          setCircuits(data.circuits)
        }
      } catch (error) {
        console.error('Failed to load circuits:', error)
      }
    }
    loadCircuits()
  }, [])

  // Show report when race finishes
  useEffect(() => {
    if (raceState?.raceFinished && !showReport) {
      setShowReport(true)
    }
  }, [raceState?.raceFinished, showReport])

  const handleStartRace = () => {
    const circuitData = circuits.find(c => c.id === circuit)
    if (!circuitData) {
      console.error('Circuit not found:', circuit)
      return
    }

    setShowReport(false)
    startRace({
      numOpponents,
      numLaps,
      trackData: {
        name: circuitData.name,
        coordinates: circuitData.coordinates
      },
      playerConfig: {
        name: playerName,
        number: playerNumber
      },
      trackTemperature: trackTemp,
      rainProbability: rainProbability / 100,
      speedMultiplier,
      pitStrategy: {
        strategy: pitStrategy,
        targetPitLap,
        tireStrategy
      }
    })
  }

  const handleStopRace = () => {
    stopRace()
    setShowReport(false)
  }

  const resetView = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md font-medium hover:bg-secondary/80 transition-colors"
            >
              <ArrowLeft size={18} />
              Simulation Mode
            </Link>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                🏎️ Player Mode
              </h1>
              <p className="text-muted-foreground mt-1">Control your vehicle and race against AI opponents</p>
            </div>
          </div>
          <button
            onClick={() => setView3D(!view3D)}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-md font-medium hover:bg-accent/90 transition-colors"
          >
            {view3D ? '📊 2D View' : '🎮 3D View'}
          </button>
        </div>

        {/* Show Report or Race View */}
        {showReport && reportData ? (
          <div className="space-y-4">
            <div className="flex gap-3">
              <button
                onClick={() => setShowReport(false)}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md font-medium hover:bg-secondary/80 transition-colors"
              >
                ← Back to Race
              </button>
              <button
                onClick={resetView}
                className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md font-medium hover:bg-secondary/80 transition-colors"
              >
                <RotateCcw size={18} />
                New Race
              </button>
            </div>
            <RaceReport reportData={reportData} />
          </div>
        ) : (
          <>
            {/* Player Controls */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-bold text-primary mb-4">🎮 Player Setup</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Your Name</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    disabled={isRunning}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    placeholder="Enter your name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Racing Number</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={playerNumber}
                    onChange={(e) => setPlayerNumber(parseInt(e.target.value) || 1)}
                    disabled={isRunning}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Opponents</label>
                  <input
                    type="number"
                    min="1"
                    max="19"
                    value={numOpponents}
                    onChange={(e) => setNumOpponents(parseInt(e.target.value) || 4)}
                    disabled={isRunning}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Number of Laps</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={numLaps}
                    onChange={(e) => setNumLaps(parseInt(e.target.value) || 3)}
                    disabled={isRunning}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-sm font-medium text-muted-foreground">Circuit ({circuits.length} tracks)</label>
                <select
                  value={circuit}
                  onChange={(e) => setCircuit(e.target.value)}
                  disabled={isRunning}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  {circuits.length > 0 ? (
                    circuits.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - {c.location}
                      </option>
                    ))
                  ) : (
                    <option value="mc-1929">Loading circuits...</option>
                  )}
                </select>
              </div>

              {/* Race Settings */}
              <div className="border-t border-border pt-4 mb-6">
                <h3 className="text-sm font-bold text-primary mb-4">⚙️ Race Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Track Temperature: {trackTemp}°C
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      value={trackTemp}
                      onChange={(e) => {
                        const newTemp = parseInt(e.target.value)
                        setTrackTemp(newTemp)
                        if (isRunning && updateTrackTemperature) {
                          updateTrackTemperature(newTemp)
                        }
                      }}
                      className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Rain Probability: {rainProbability}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={rainProbability}
                      onChange={(e) => {
                        const newRain = parseInt(e.target.value)
                        setRainProbability(newRain)
                        if (isRunning && updateRainProbability) {
                          updateRainProbability(newRain / 100)
                        }
                      }}
                      className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Simulation Speed: {speedMultiplier}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="10"
                      step="0.5"
                      value={speedMultiplier}
                      onChange={(e) => {
                        const newSpeed = parseFloat(e.target.value)
                        setSpeedMultiplier(newSpeed)
                        if (isRunning && updateSpeedMultiplier) {
                          updateSpeedMultiplier(newSpeed)
                        }
                      }}
                      className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Player Vehicle Controls */}
              <div className="border-t border-border pt-4 mb-6">
                <h3 className="text-sm font-bold text-accent mb-4">🎛️ Your Vehicle Controls</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Differential Preload: {differential} Nm
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={differential}
                      onChange={(e) => {
                        const newDiff = parseFloat(e.target.value)
                        setDifferential(newDiff)
                        if (isRunning && updatePlayerDifferential) {
                          updatePlayerDifferential(newDiff)
                        }
                      }}
                      className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-xs text-muted-foreground text-center">0 - 100 Nm (optimal: 50)</div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Engine Braking: {(engineBraking * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={engineBraking}
                      onChange={(e) => {
                        const newEB = parseFloat(e.target.value)
                        setEngineBraking(newEB)
                        if (isRunning && updatePlayerEngineBraking) {
                          updatePlayerEngineBraking(newEB)
                        }
                      }}
                      className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-xs text-muted-foreground text-center">0 - 100% (typical: 50%)</div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Brake Balance: {(brakeBalance * 100).toFixed(0)}% Front
                    </label>
                    <input
                      type="range"
                      min="0.4"
                      max="0.7"
                      step="0.01"
                      value={brakeBalance}
                      onChange={(e) => {
                        const newBB = parseFloat(e.target.value)
                        setBrakeBalance(newBB)
                        if (isRunning && updatePlayerBrakeBalance) {
                          updatePlayerBrakeBalance(newBB)
                        }
                      }}
                      className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-xs text-muted-foreground text-center">40 - 70% (optimal: 52-56%)</div>
                  </div>
                </div>
              </div>

              {/* Pit Strategy */}
              <div className="border-t border-border pt-4 mb-6">
                <h3 className="text-sm font-bold text-blue-400 mb-4">🔧 Pit Strategy</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Strategy Type</label>
                    <select
                      value={pitStrategy}
                      onChange={(e) => setPitStrategy(e.target.value as any)}
                      disabled={isRunning}
                      className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    >
                      <option value="aggressive">🔥 Aggressive (Early Pit)</option>
                      <option value="balanced">⚖️ Balanced</option>
                      <option value="conservative">🛡️ Conservative (Late Pit)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Target Pit Lap: {targetPitLap}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max={numLaps}
                      value={targetPitLap}
                      onChange={(e) => setTargetPitLap(parseInt(e.target.value))}
                      disabled={isRunning}
                      className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                    />
                    <div className="text-xs text-muted-foreground text-center">Lap 1 - {numLaps}</div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Tire Strategy</label>
                    <select
                      value={tireStrategy}
                      onChange={(e) => setTireStrategy(e.target.value as any)}
                      disabled={isRunning}
                      className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    >
                      <option value="soft-medium">🔴 Soft → 🟡 Medium</option>
                      <option value="medium-hard">🟡 Medium → ⚪ Hard</option>
                      <option value="soft-hard">🔴 Soft → ⚪ Hard</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleStartRace}
                  disabled={isRunning}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Play size={18} />
                  Start Race
                </button>

                <button
                  onClick={handleStopRace}
                  disabled={!isRunning}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-destructive text-destructive-foreground rounded-md font-medium hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Square size={18} />
                  Stop Race
                </button>

                <button
                  onClick={resetView}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground rounded-md font-medium hover:bg-secondary/80 transition-colors"
                >
                  <RotateCcw size={18} />
                  Reset
                </button>
              </div>
            </div>

            {/* Visualization and Data Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Race Visualization - 1/2 width */}
              <div className="lg:col-span-1">
                {view3D ? (
                  <Race3DVisualization raceState={raceState} />
                ) : (
                  <RaceVisualization raceState={raceState} />
                )}
              </div>

              {/* Data Grid - 1/3 width */}
              <div className="lg:col-span-1">
                <DataGrid raceState={raceState} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
