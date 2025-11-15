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
  differentialPreload?: number
  engineBraking?: number
  brakeBalance?: number
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


export function useRaceSimulation() {
  const [raceState, setRaceState] = useState<SimulationState | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const simulationRef = useRef<RaceSimulation | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastUpdateRef = useRef<number>(0)
  const speedMultiplierRef = useRef<number>(1)

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

      // Advanced physics parameters
      const differentialPreload = perAgentCfg?.differentialPreload ?? globalCfg?.differentialPreload ?? 50.0
      const engineBraking = perAgentCfg?.engineBraking ?? globalCfg?.engineBraking ?? 0.5
      const brakeBalance = perAgentCfg?.brakeBalance ?? globalCfg?.brakeBalance ?? 0.54

      const vehicle = new RacingVehicle({
        id: `vehicle_${i}`,
        name: `${vehicleNames[i % vehicleNames.length]} #${i + 1}`,
        maxSpeed,
        acceleration,
        qualifyingPosition: i + 1,
        lapTimeStd: 0.15,
        dnfProbability,
        differentialPreload,
        engineBraking,
        brakeBalance
      })

      simulation.addVehicle(vehicle)
    }

    // Start simulation
    simulation.start()
    simulationRef.current = simulation
    setIsRunning(true)

    // Start animation loop
    lastUpdateRef.current = performance.now()
    speedMultiplierRef.current = config.speedMultiplier || 1

    // Run animation loop
    const loop = (currentTime: number) => {
      const sim = simulationRef.current
      if (!sim || !sim.running) {
        setIsRunning(false)
        return
      }

      // Use current speed multiplier (can change during race)
      const speedMultiplier = speedMultiplierRef.current
      const timeStep = 100 / speedMultiplier

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

  /**
   * Update speed multiplier during race
   */
  const updateSpeedMultiplier = useCallback((multiplier: number) => {
    speedMultiplierRef.current = multiplier
  }, [])

  /**
   * Update track temperature during race
   */
  const updateTrackTemperature = useCallback((temp: number) => {
    if (simulationRef.current) {
      simulationRef.current.temperature = temp
    }
  }, [])

  /**
   * Update weather during race
   */
  const updateWeather = useCallback((weather: string) => {
    if (simulationRef.current) {
      simulationRef.current.weather = weather
    }
  }, [])

  /**
   * Update rain probability during race (determines weather)
   */
  const updateRainProbability = useCallback((probability: number) => {
    if (simulationRef.current) {
      // Determine weather based on probability
      const weather = Math.random() < probability ? 'rain' : 'clear'
      simulationRef.current.weather = weather
    }
  }, [])

  /**
   * Update vehicle max speed during race
   */
  const updateVehicleMaxSpeed = useCallback((vehicleIndex: number, maxSpeed: number) => {
    if (simulationRef.current && vehicleIndex < simulationRef.current.vehicles.length) {
      simulationRef.current.vehicles[vehicleIndex].maxSpeed = maxSpeed
      console.log(`[Hook] Updated vehicle ${vehicleIndex} maxSpeed to ${maxSpeed}`)
    }
  }, [])

  /**
   * Update vehicle acceleration during race
   */
  const updateVehicleAcceleration = useCallback((vehicleIndex: number, acceleration: number) => {
    if (simulationRef.current && vehicleIndex < simulationRef.current.vehicles.length) {
      simulationRef.current.vehicles[vehicleIndex].acceleration = acceleration
      console.log(`[Hook] Updated vehicle ${vehicleIndex} acceleration to ${acceleration}`)
    }
  }, [])

  /**
   * Update vehicle DNF probability during race
   */
  const updateVehicleDnfProbability = useCallback((vehicleIndex: number, dnfProbability: number) => {
    if (simulationRef.current && vehicleIndex < simulationRef.current.vehicles.length) {
      simulationRef.current.vehicles[vehicleIndex].dnfProbability = dnfProbability
    }
  }, [])

  /**
   * Update vehicle cornering skill during race
   */
  const updateVehicleCorneringSkill = useCallback((vehicleIndex: number, corneringSkill: number) => {
    if (simulationRef.current && vehicleIndex < simulationRef.current.vehicles.length) {
      simulationRef.current.vehicles[vehicleIndex].corneringSkill = corneringSkill
    }
  }, [])

  /**
   * Update vehicle differential preload during race
   */
  const updateVehicleDifferentialPreload = useCallback((vehicleIndex: number, differentialPreload: number) => {
    if (simulationRef.current && vehicleIndex < simulationRef.current.vehicles.length) {
      simulationRef.current.vehicles[vehicleIndex].updateDifferentialPreload(differentialPreload)
    }
  }, [])

  /**
   * Update vehicle engine braking during race
   */
  const updateVehicleEngineBraking = useCallback((vehicleIndex: number, engineBraking: number) => {
    if (simulationRef.current && vehicleIndex < simulationRef.current.vehicles.length) {
      simulationRef.current.vehicles[vehicleIndex].updateEngineBraking(engineBraking)
    }
  }, [])

  /**
   * Update vehicle brake balance during race
   */
  const updateVehicleBrakeBalance = useCallback((vehicleIndex: number, brakeBalance: number) => {
    if (simulationRef.current && vehicleIndex < simulationRef.current.vehicles.length) {
      simulationRef.current.vehicles[vehicleIndex].updateBrakeBalance(brakeBalance)
    }
  }, [])

  return {
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
  }
}
