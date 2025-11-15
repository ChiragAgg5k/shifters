/**
 * React hook for managing F1 race simulation
 * Replaces WebSocket connection with local simulation
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { RaceSimulation } from '../simulation/RaceSimulation'
import { RacingVehicle } from '../physics/RacingVehicle'
import { Track } from '../track/Track'
import type { SimulationState } from '../simulation/RaceSimulation'

export interface AgentConfig {
  maxSpeed?: number
  acceleration?: number
  dnfProbability?: number
}

export interface PerAgentConfig {
  [agentIndex: number]: AgentConfig
}

export interface RaceConfig {
  numAgents: number
  numLaps: number
  trackData: {
    name: string
    coordinates: number[][]
  }
  trackTemperature: number
  rainProbability: number
  speedMultiplier?: number
  agentConfig?: AgentConfig
  perAgentConfig?: PerAgentConfig
}

// Load circuits from public folder
async function loadCircuits() {
  try {
    const response = await fetch('/data/circuits/f1-circuits.json')
    const data = await response.json()
    return data.circuits
  } catch (error) {
    console.error('Failed to load circuits:', error)
    return []
  }
}

export function useRaceSimulation() {
  const [raceState, setRaceState] = useState<SimulationState | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  
  const simulationRef = useRef<RaceSimulation | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastUpdateRef = useRef<number>(0)

  /**
   * Stop the race
   */
  const stopRace = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.stop()
      simulationRef.current = null
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    setIsRunning(false)
    setRaceState(null)
  }, [])

  /**
   * Start a new race
   */
  const startRace = useCallback((config: RaceConfig) => {
    // Stop any existing simulation
    stopRace()

    // Determine weather
    const weather = Math.random() < config.rainProbability ? 'rain' : 'clear'

    // Create track from GeoJSON
    const track = Track.fromGeoJSON(
      config.trackData.name,
      config.trackData.coordinates,
      config.numLaps
    )

    // Add checkpoints
    const numCheckpoints = 4
    for (let i = 1; i < numCheckpoints; i++) {
      track.addCheckpoint(
        `checkpoint_${i}`,
        track.length * (i / numCheckpoints),
        `Sector ${i}`
      )
    }

    // Create simulation
    const simulation = new RaceSimulation({
      track,
      timeStep: 0.1,
      weather,
      temperature: config.trackTemperature
    })

    // Create vehicles
    const vehicleNames = [
      'Lightning', 'Thunder', 'Phoenix', 'Viper', 'Falcon',
      'Dragon', 'Eagle', 'Cobra', 'Raptor', 'Titan',
      'Storm', 'Blaze', 'Shadow', 'Fury', 'Bolt'
    ]

    for (let i = 0; i < config.numAgents; i++) {
      // Priority: per-agent config > global agent config > defaults with skill variation
      const perAgentCfg = config.perAgentConfig?.[i]
      const globalCfg = config.agentConfig
      
      const maxSpeed = perAgentCfg?.maxSpeed ?? globalCfg?.maxSpeed ?? (85 + ((config.numAgents - 1 - i) * 2)) // 85-95 m/s
      const acceleration = perAgentCfg?.acceleration ?? globalCfg?.acceleration ?? (12 + ((config.numAgents - 1 - i) * 0.5))
      const dnfProbability = perAgentCfg?.dnfProbability ?? globalCfg?.dnfProbability ?? 0.02

      const vehicle = new RacingVehicle({
        id: `vehicle_${i}`,
        name: `${vehicleNames[i % vehicleNames.length]} #${i + 1}`,
        maxSpeed,
        acceleration,
        qualifyingPosition: i + 1,
        lapTimeStd: 0.15,
        dnfProbability
      })

      simulation.addVehicle(vehicle)
    }

    // Start simulation
    simulation.start()
    simulationRef.current = simulation
    setIsRunning(true)

    // Start animation loop
    lastUpdateRef.current = performance.now()
    const speedMultiplier = config.speedMultiplier || 1
    const timeStep = 100 / speedMultiplier // Adjust time step based on speed multiplier
    
    // Run animation loop
    const loop = (currentTime: number) => {
      const sim = simulationRef.current
      if (!sim || !sim.running) {
        setIsRunning(false)
        return
      }

      // Fixed time step with speed multiplier
      const elapsed = currentTime - lastUpdateRef.current
      if (elapsed >= timeStep) {
        // Step simulation multiple times for speed multiplier > 1
        const stepsToRun = Math.max(1, Math.floor(speedMultiplier))
        for (let i = 0; i < stepsToRun; i++) {
          if (sim.running) {
            sim.stepSimulation()
          }
        }
        
        // Update state
        setRaceState(sim.getState())
        
        lastUpdateRef.current = currentTime
      }

      // Continue loop
      animationFrameRef.current = requestAnimationFrame(loop)
    }

    animationFrameRef.current = requestAnimationFrame(loop)
  }, [stopRace])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopRace()
    }
  }, [stopRace])

  return {
    raceState,
    isRunning,
    startRace,
    stopRace
  }
}
