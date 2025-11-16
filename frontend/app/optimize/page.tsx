'use client'

import { useState, useEffect } from 'react'
import { useOptimization } from '@/lib/hooks/useOptimization'
import { ParameterEvolutionChart } from '@/components/ParameterEvolutionChart'
import { Play, Square, RotateCcw, ArrowLeft, Brain } from 'lucide-react'
import Link from 'next/link'

export default function OptimizePage() {
  const [circuit, setCircuit] = useState('mc-1929')
  const [numLaps, setNumLaps] = useState(5)
  const [circuits, setCircuits] = useState<any[]>([])
  
  // Optimization config
  const [populationSize, setPopulationSize] = useState(20)
  const [mutationRate, setMutationRate] = useState(0.15)
  const [maxGenerations, setMaxGenerations] = useState(30)

  const { state, startOptimization, stopOptimization, resetOptimization } = useOptimization()

  // Load circuits
  useEffect(() => {
    fetch('/data/circuits/f1-circuits.json')
      .then(res => res.json())
      .then(data => setCircuits(data.circuits || []))
      .catch(err => console.error('Failed to load circuits:', err))
  }, [])

  const handleStartOptimization = () => {
    const selectedCircuit = circuits.find(c => c.id === circuit)
    if (!selectedCircuit) return

    startOptimization({
      numLaps,
      trackData: {
        name: selectedCircuit.name,
        coordinates: selectedCircuit.coordinates
      },
      optimizationConfig: {
        populationSize,
        mutationRate,
        eliteCount: Math.floor(populationSize * 0.1),
        tournamentSize: 5,
        maxGenerations
      }
    })
  }

  const bestParams = state.bestIndividual?.parameters

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
              Back to Simulation
            </Link>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                🧠 ML Parameter Optimizer
              </h1>
              <p className="text-muted-foreground mt-1">Genetic algorithm finds optimal vehicle setup</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <Brain className="text-purple-400" size={24} />
            <div className="text-sm">
              <div className="font-bold text-purple-400">Generation {state.currentGeneration}</div>
              <div className="text-muted-foreground">
                Testing {state.currentIndividual}/{state.totalIndividuals}
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-bold text-purple-400 mb-4">⚙️ Optimization Setup</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Circuit</label>
              <select
                value={circuit}
                onChange={(e) => setCircuit(e.target.value)}
                disabled={state.isRunning}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Laps per Test: {numLaps}</label>
              <input
                type="range"
                min="3"
                max="10"
                value={numLaps}
                onChange={(e) => setNumLaps(parseInt(e.target.value))}
                disabled={state.isRunning}
                className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Population Size: {populationSize}</label>
              <input
                type="range"
                min="10"
                max="50"
                step="5"
                value={populationSize}
                onChange={(e) => setPopulationSize(parseInt(e.target.value))}
                disabled={state.isRunning}
                className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Max Generations: {maxGenerations}</label>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={maxGenerations}
                onChange={(e) => setMaxGenerations(parseInt(e.target.value))}
                disabled={state.isRunning}
                className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Mutation Rate: {(mutationRate * 100).toFixed(0)}%</label>
              <input
                type="range"
                min="0.05"
                max="0.30"
                step="0.05"
                value={mutationRate}
                onChange={(e) => setMutationRate(parseFloat(e.target.value))}
                disabled={state.isRunning}
                className="w-full h-2 bg-input rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              />
              <div className="text-xs text-muted-foreground">Higher = more exploration, lower = more exploitation</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Elite Count: {Math.floor(populationSize * 0.1)}</label>
              <div className="px-3 py-2 bg-input border border-border rounded-md text-sm text-muted-foreground">
                Top {Math.floor(populationSize * 0.1)} performers preserved each generation
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleStartOptimization}
              disabled={state.isRunning || circuits.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-md font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play size={18} />
              Start Optimization
            </button>

            <button
              onClick={stopOptimization}
              disabled={!state.isRunning}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-destructive text-destructive-foreground rounded-md font-medium hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Square size={18} />
              Stop
            </button>

            <button
              onClick={resetOptimization}
              disabled={state.isRunning}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground rounded-md font-medium hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw size={18} />
              Reset
            </button>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Best Parameters Found */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-purple-400 mb-4">🏆 Best Parameters Found</h3>
            {bestParams ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-purple-500/10 rounded-md">
                  <span className="text-sm text-muted-foreground">Differential Preload</span>
                  <span className="font-bold text-purple-400">{bestParams.differential.toFixed(1)} Nm</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-500/10 rounded-md">
                  <span className="text-sm text-muted-foreground">Engine Braking</span>
                  <span className="font-bold text-purple-400">{(bestParams.engineBraking * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-500/10 rounded-md">
                  <span className="text-sm text-muted-foreground">Brake Balance</span>
                  <span className="font-bold text-purple-400">{(bestParams.brakeBalance * 100).toFixed(1)}% Front</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-500/10 rounded-md">
                  <span className="text-sm text-muted-foreground">Max Speed</span>
                  <span className="font-bold text-purple-400">{bestParams.maxSpeed.toFixed(1)} m/s</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-500/10 rounded-md">
                  <span className="text-sm text-muted-foreground">Acceleration</span>
                  <span className="font-bold text-purple-400">{bestParams.acceleration.toFixed(1)} m/s²</span>
                </div>

                {state.bestIndividual && (
                  <>
                    <div className="border-t border-border pt-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Fitness Score</span>
                        <span className="font-bold text-green-400">{state.bestIndividual.fitness.toFixed(0)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg Lap Time</span>
                      <span className="font-bold text-blue-400">{state.bestIndividual.avgLapTime.toFixed(2)}s</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Best Lap Time</span>
                      <span className="font-bold text-yellow-400">{state.bestIndividual.bestLapTime.toFixed(2)}s</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Brain size={48} className="mx-auto mb-3 opacity-30" />
                <p>No results yet</p>
                <p className="text-sm mt-1">Start optimization to find optimal parameters</p>
              </div>
            )}
          </div>

          {/* Evolution Progress */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-pink-400 mb-4">📈 Evolution Progress</h3>
            
            {/* Progress bars when running */}
            {state.isRunning && (
              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Generation Progress</span>
                    <span className="text-pink-400 font-bold">{state.currentGeneration + 1}/{maxGenerations}</span>
                  </div>
                  <div className="w-full bg-input rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                      style={{ width: `${((state.currentGeneration + 1) / maxGenerations) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current Generation</span>
                    <span className="text-pink-400 font-bold">{state.currentIndividual}/{state.totalIndividuals}</span>
                  </div>
                  <div className="w-full bg-input rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-pink-500 transition-all duration-150"
                      style={{ width: `${(state.currentIndividual / state.totalIndividuals) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            <ParameterEvolutionChart 
              history={state.generationHistory} 
              maxGenerations={maxGenerations}
            />

            {state.isComplete && (
              <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                <div className="text-green-400 font-bold text-lg">✓ Optimization Complete!</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Best solution found in generation {state.bestIndividual?.generation}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Race Visualization */}
        {state.currentRaceState && state.currentRaceState.agents.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-accent mb-4">🏁 Live Test Race</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-accent/10 rounded-md">
                <div className="text-sm text-muted-foreground">Current Lap</div>
                <div className="text-2xl font-bold text-accent">
                  {state.currentRaceState.agents[0]?.lap || 0}/{numLaps}
                </div>
              </div>
              <div className="text-center p-3 bg-blue-500/10 rounded-md">
                <div className="text-sm text-muted-foreground">Speed</div>
                <div className="text-2xl font-bold text-blue-400">
                  {state.currentRaceState.agents[0]?.speed.toFixed(1) || 0} m/s
                </div>
              </div>
              <div className="text-center p-3 bg-yellow-500/10 rounded-md">
                <div className="text-sm text-muted-foreground">Distance</div>
                <div className="text-2xl font-bold text-yellow-400">
                  {state.currentRaceState.agents[0]?.position.toFixed(0) || 0} m
                </div>
              </div>
              <div className="text-center p-3 bg-green-500/10 rounded-md">
                <div className="text-sm text-muted-foreground">Tire Temp</div>
                <div className="text-2xl font-bold text-green-400">
                  {state.currentRaceState.agents[0]?.tireTemperature.toFixed(0) || 0}°C
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
