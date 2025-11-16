/**
 * React hook for ML-based parameter optimization
 */

import { useState, useCallback, useRef } from 'react'
import { RaceSimulation } from '../simulation/RaceSimulation'
import { RacingVehicle } from '../physics/RacingVehicle'
import { Track } from '../track/Track'
import { GeneticOptimizer } from '../ml/GeneticOptimizer'
import type { Individual, GenerationStats, OptimizationConfig } from '../ml/types'
import type { SimulationState } from '../simulation/RaceSimulation'

export interface OptimizationState {
  currentGeneration: number
  currentIndividual: number
  totalIndividuals: number
  isRunning: boolean
  isComplete: boolean
  bestIndividual: Individual | null
  generationHistory: GenerationStats[]
  currentRaceState: SimulationState | null
}

export interface OptimizeConfig {
  numLaps: number
  trackData: {
    name: string
    coordinates: number[][]
  }
  optimizationConfig: Partial<OptimizationConfig>
}

export function useOptimization() {
  const [state, setState] = useState<OptimizationState>({
    currentGeneration: 0,
    currentIndividual: 0,
    totalIndividuals: 0,
    isRunning: false,
    isComplete: false,
    bestIndividual: null,
    generationHistory: [],
    currentRaceState: null
  })

  const optimizerRef = useRef<GeneticOptimizer | null>(null)
  const simulationRef = useRef<RaceSimulation | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const currentPopulationRef = useRef<Individual[]>([])
  const currentIndividualIndexRef = useRef<number>(0)
  const configRef = useRef<OptimizeConfig | null>(null)

  /**
   * Start optimization process
   */
  const startOptimization = useCallback(async (config: OptimizeConfig) => {
    // Store config
    configRef.current = config

    // Initialize optimizer
    optimizerRef.current = new GeneticOptimizer(config.optimizationConfig)
    const population = optimizerRef.current.initializePopulation()
    currentPopulationRef.current = population
    currentIndividualIndexRef.current = 0

    setState(prev => ({
      ...prev,
      isRunning: true,
      isComplete: false,
      currentGeneration: 0,
      currentIndividual: 0,
      totalIndividuals: population.length,
      generationHistory: []
    }))

    // Start evaluating first individual
    setTimeout(() => evaluateNextIndividual(), 0)
  }, [])

  /**
   * Evaluate next individual in population
   */
  const evaluateNextIndividual = useCallback(async () => {
    const optimizer = optimizerRef.current
    const config = configRef.current
    if (!optimizer || !config) return

    const population = currentPopulationRef.current
    const currentIndex = currentIndividualIndexRef.current

    // Check if generation is complete
    if (currentIndex >= population.length) {
      // All individuals evaluated for this generation
      // Sort population by fitness before recording stats
      population.sort((a, b) => b.fitness - a.fitness)
      
      // Record stats for completed generation (including generation 0)
      const fitnesses = population.map(ind => ind.fitness)
      const lapTimes = population.filter(ind => !ind.dnf).map(ind => ind.avgLapTime)

      const stats = {
        generation: optimizer.getGeneration(),
        bestFitness: Math.max(...fitnesses, 0),
        avgFitness: fitnesses.length > 0 ? fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length : 0,
        worstFitness: Math.min(...fitnesses, 0),
        bestIndividual: { ...population[0] },
        avgLapTime: lapTimes.length > 0 ? lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length : 0,
        bestLapTime: lapTimes.length > 0 ? Math.min(...lapTimes) : 0,
        populationSize: population.length,
        timestamp: Date.now()
      }

      // Add to history manually since we're tracking it ourselves
      const updatedHistory = [...optimizer.getHistory(), stats]
      
      // Update state with completed generation stats
      setState(prev => ({
        ...prev,
        bestIndividual: population[0],
        generationHistory: updatedHistory
      }))

      // Check if optimization should stop
      if (optimizer.isComplete()) {
        // Optimization complete!
        setState(prev => ({
          ...prev,
          isRunning: false,
          isComplete: true
        }))
        return
      }

      // Evolve to next generation
      const newPopulation = optimizer.evolveGeneration()
      currentPopulationRef.current = newPopulation
      currentIndividualIndexRef.current = 0

      setState(prev => ({
        ...prev,
        currentGeneration: optimizer.getGeneration(),
        currentIndividual: 0,
        generationHistory: optimizer.getHistory()
      }))

      // Start evaluating next generation
      setTimeout(() => evaluateNextIndividual(), 100)
      return
    }

    // Evaluate current individual
    const individual = population[currentIndex]
    
    setState(prev => ({
      ...prev,
      currentIndividual: currentIndex + 1
    }))

    // Run race for this individual
    await runRaceForIndividual(individual, config)

    // Move to next individual
    currentIndividualIndexRef.current++
    setTimeout(() => evaluateNextIndividual(), 100) // Small delay between races
  }, [])

  /**
   * Run a race for a specific individual
   */
  const runRaceForIndividual = useCallback(async (individual: Individual, config: OptimizeConfig): Promise<void> => {
    return new Promise((resolve) => {
      // Create track
      const track = Track.fromGeoJSON(
        config.trackData.name,
        config.trackData.coordinates,
        config.numLaps
      )

      // Create simulation
      const simulation = new RaceSimulation({
        track,
        timeStep: 0.1,
        weather: 'clear',
        temperature: 35
      })

      // Create vehicle with individual's parameters
      const vehicle = new RacingVehicle({
        id: individual.id,
        name: `AI #${individual.id}`,
        maxSpeed: individual.parameters.maxSpeed,
        acceleration: individual.parameters.acceleration,
        qualifyingPosition: 1,
        lapTimeStd: 0.15,
        dnfProbability: 0.02,
        differentialPreload: individual.parameters.differential,
        engineBraking: individual.parameters.engineBraking,
        brakeBalance: individual.parameters.brakeBalance
      })

      simulation.addVehicle(vehicle)
      simulation.start()
      simulationRef.current = simulation

      const lapTimes: number[] = []
      let lastLap = 0

      // Run simulation in fast-forward
      const runSimulation = () => {
        if (!simulation.running) {
          // Race finished
          const avgLapTime = lapTimes.length > 0 
            ? lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length 
            : 999

          const bestLapTime = lapTimes.length > 0 ? Math.min(...lapTimes) : 999

          // Update optimizer with results
          optimizerRef.current?.updateIndividualResults(individual.id, {
            avgLapTime,
            bestLapTime,
            position: 1,
            dnf: vehicle.finished === false && simulation.running === false // DNF if not finished when race ends
          })

          simulationRef.current = null
          resolve()
          return
        }

        // Step simulation multiple times per frame for speed
        for (let i = 0; i < 10; i++) {
          if (simulation.running) {
            simulation.stepSimulation()

            // Track lap times
            const currentLap = vehicle.lap
            if (currentLap > lastLap && currentLap > 1) {
              const lapTime = vehicle.lapTimes[vehicle.lapTimes.length - 1]
              if (lapTime > 0) {
                lapTimes.push(lapTime)
              }
              lastLap = currentLap
            }
          }
        }

        // Update state for visualization
        setState(prev => ({
          ...prev,
          currentRaceState: simulation.getState()
        }))

        // Continue simulation
        requestAnimationFrame(runSimulation)
      }

      runSimulation()
    })
  }, [])

  /**
   * Stop optimization
   */
  const stopOptimization = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.stop()
      simulationRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    setState(prev => ({
      ...prev,
      isRunning: false
    }))
  }, [])

  /**
   * Reset optimization
   */
  const resetOptimization = useCallback(() => {
    stopOptimization()
    optimizerRef.current = null
    currentPopulationRef.current = []
    currentIndividualIndexRef.current = 0

    setState({
      currentGeneration: 0,
      currentIndividual: 0,
      totalIndividuals: 0,
      isRunning: false,
      isComplete: false,
      bestIndividual: null,
      generationHistory: [],
      currentRaceState: null
    })
  }, [stopOptimization])

  return {
    state,
    startOptimization,
    stopOptimization,
    resetOptimization
  }
}
