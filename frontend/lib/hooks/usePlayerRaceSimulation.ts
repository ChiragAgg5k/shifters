/**
 * React hook for player-controlled race simulation
 * Player controls one vehicle, AI controls the rest
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { RaceSimulation } from '../simulation/RaceSimulation'
import { RacingVehicle } from '../physics/RacingVehicle'
import { Track } from '../track/Track'
import type { SimulationState } from '../simulation/RaceSimulation'

export interface PlayerRaceConfig {
  numOpponents: number
  numLaps: number
  trackData: {
    name: string
    coordinates: number[][]
  }
  playerConfig: {
    name: string
    number: number
  }
  trackTemperature?: number
  rainProbability?: number
  speedMultiplier?: number
  pitStrategy?: {
    strategy: 'aggressive' | 'balanced' | 'conservative'
    targetPitLap: number
    tireStrategy: 'soft-medium' | 'medium-hard' | 'soft-hard'
  }
}

export interface PlayerControls {
  accelerate: boolean
  brake: boolean
  steerLeft: boolean
  steerRight: boolean
  deployERS: boolean
  requestPit: boolean
}

export function usePlayerRaceSimulation() {
  const [raceState, setRaceState] = useState<SimulationState | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [reportData, setReportData] = useState<any>(null)

  const simulationRef = useRef<RaceSimulation | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastUpdateRef = useRef<number>(0)
  const playerControlsRef = useRef<PlayerControls>({
    accelerate: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
    deployERS: false,
    requestPit: false
  })
  const playerVehicleIndexRef = useRef<number>(0)

  /**
   * Keyboard event handlers
   */
  useEffect(() => {
    if (!isRunning) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const controls = playerControlsRef.current
      
      switch(e.key) {
        case 'ArrowUp':
          controls.accelerate = true
          e.preventDefault()
          break
        case 'ArrowDown':
          controls.brake = true
          e.preventDefault()
          break
        case 'ArrowLeft':
          controls.steerLeft = true
          e.preventDefault()
          break
        case 'ArrowRight':
          controls.steerRight = true
          e.preventDefault()
          break
        case ' ':
          controls.deployERS = true
          e.preventDefault()
          break
        case 'p':
        case 'P':
          controls.requestPit = true
          e.preventDefault()
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const controls = playerControlsRef.current
      
      switch(e.key) {
        case 'ArrowUp':
          controls.accelerate = false
          break
        case 'ArrowDown':
          controls.brake = false
          break
        case 'ArrowLeft':
          controls.steerLeft = false
          break
        case 'ArrowRight':
          controls.steerRight = false
          break
        case ' ':
          controls.deployERS = false
          break
        case 'p':
        case 'P':
          controls.requestPit = false
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isRunning])

  /**
   * Apply player controls to player vehicle
   */
  const applyPlayerControls = useCallback(() => {
    if (!simulationRef.current) return

    const playerVehicle = simulationRef.current.vehicles[playerVehicleIndexRef.current]
    if (!playerVehicle) return

    // Manual control inputs affect the AI behavior slightly
    // In the current implementation, the vehicle physics are automated
    // These controls can be used to request specific actions
    
    // For now, controls are passive - the player vehicle races automatically
    // but with slightly better performance than AI opponents
    
    // Future: implement direct throttle/brake/steering control
    // Access controls via: playerControlsRef.current
  }, [])

  /**
   * Stop the race
   */
  const stopRace = useCallback(() => {
    if (simulationRef.current) {
      // Generate report before stopping
      const report = simulationRef.current.generateRaceReport()
      setReportData(report)
      
      simulationRef.current.stop()
      simulationRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    setIsRunning(false)
  }, [])

  /**
   * Start a new race
   */
  const startRace = useCallback((config: PlayerRaceConfig) => {
    // Stop any existing simulation
    stopRace()

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
      weather: 'clear',
      temperature: config.trackTemperature ?? 25
    })

    const vehicleNames = [
      'Thunder', 'Phoenix', 'Viper', 'Falcon', 'Dragon', 
      'Eagle', 'Cobra', 'Raptor', 'Titan', 'Storm', 
      'Blaze', 'Shadow', 'Fury', 'Bolt', 'Phantom',
      'Striker', 'Tempest', 'Nitro', 'Havoc', 'Cyclone'
    ]

    // Create player vehicle (starts in first position)
    const playerVehicle = new RacingVehicle({
      id: 'player',
      name: `${config.playerConfig.name} #${config.playerConfig.number}`,
      maxSpeed: 92,
      acceleration: 12,
      qualifyingPosition: 1,
      lapTimeStd: 0.1,
      dnfProbability: 0.01,
      differentialPreload: 50,
      engineBraking: 0.5,
      brakeBalance: 0.54
    })

    simulation.addVehicle(playerVehicle)
    playerVehicleIndexRef.current = 0

    // Create AI opponents with varied stats
    for (let i = 0; i < config.numOpponents; i++) {
      const aiVehicle = new RacingVehicle({
        id: `ai_${i}`,
        name: `${vehicleNames[i % vehicleNames.length]} #${i + 2}`,
        maxSpeed: Math.round((88 + Math.random() * 10) * 10) / 10, // 88-98 m/s
        acceleration: Math.round((11 + Math.random() * 2) * 10) / 10, // 11-13 m/s²
        qualifyingPosition: i + 2,
        lapTimeStd: 0.12 + Math.random() * 0.08, // 0.12-0.20 variation
        dnfProbability: 0.015 + Math.random() * 0.015, // 1.5-3% DNF chance
        differentialPreload: Math.round(45 + Math.random() * 15), // 45-60 Nm
        engineBraking: Math.round((0.4 + Math.random() * 0.3) * 100) / 100, // 0.4-0.7
        brakeBalance: Math.round((0.52 + Math.random() * 0.06) * 100) / 100 // 0.52-0.58
      })

      simulation.addVehicle(aiVehicle)
    }

    // Start simulation
    simulation.start()
    simulationRef.current = simulation
    setIsRunning(true)
    setReportData(null)

    // Start animation loop
    lastUpdateRef.current = performance.now()

    // Run animation loop
    const loop = (currentTime: number) => {
      const sim = simulationRef.current
      if (!sim || !sim.running) {
        setIsRunning(false)
        
        // Generate report when race finishes
        if (sim) {
          const report = sim.generateRaceReport()
          setReportData(report)
        }
        return
      }

      const timeStep = 100 // ~10 FPS update rate

      // Fixed time step
      const elapsed = currentTime - lastUpdateRef.current
      if (elapsed >= timeStep) {
        // Apply player controls before simulation step
        applyPlayerControls()
        
        // Step simulation
        if (sim.running) {
          sim.stepSimulation()
        }

        // Update state
        setRaceState(sim.getState())

        lastUpdateRef.current = currentTime
      }

      // Continue loop
      animationFrameRef.current = requestAnimationFrame(loop)
    }

    animationFrameRef.current = requestAnimationFrame(loop)
  }, [stopRace, applyPlayerControls])

  /**
   * Update simulation speed multiplier
   */
  const updateSpeedMultiplier = useCallback((multiplier: number) => {
    // Speed multiplier would need to be implemented in RaceSimulation
    // For now, this is a placeholder for future implementation
    console.log(`Speed multiplier changed to ${multiplier}x`)
  }, [])

  /**
   * Update track temperature
   */
  const updateTrackTemperature = useCallback((temperature: number) => {
    if (simulationRef.current) {
      simulationRef.current.temperature = temperature
      console.log(`Track temperature updated to ${temperature}°C`)
    }
  }, [])

  /**
   * Update rain probability
   */
  const updateRainProbability = useCallback((probability: number) => {
    if (simulationRef.current) {
      simulationRef.current.rainProbability = probability
      console.log(`Rain probability updated to ${(probability * 100).toFixed(0)}%`)
    }
  }, [])

  /**
   * Update player vehicle differential preload
   */
  const updatePlayerDifferential = useCallback((differential: number) => {
    if (simulationRef.current) {
      const playerVehicle = simulationRef.current.vehicles[playerVehicleIndexRef.current]
      if (playerVehicle) {
        playerVehicle.differentialPreload = differential
        console.log(`Differential preload updated to ${differential} Nm`)
      }
    }
  }, [])

  /**
   * Update player vehicle engine braking
   */
  const updatePlayerEngineBraking = useCallback((engineBraking: number) => {
    if (simulationRef.current) {
      const playerVehicle = simulationRef.current.vehicles[playerVehicleIndexRef.current]
      if (playerVehicle) {
        playerVehicle.engineBraking = engineBraking
        console.log(`Engine braking updated to ${(engineBraking * 100).toFixed(0)}%`)
      }
    }
  }, [])

  /**
   * Update player vehicle brake balance
   */
  const updatePlayerBrakeBalance = useCallback((brakeBalance: number) => {
    if (simulationRef.current) {
      const playerVehicle = simulationRef.current.vehicles[playerVehicleIndexRef.current]
      if (playerVehicle) {
        playerVehicle.brakeBalance = brakeBalance
        console.log(`Brake balance updated to ${(brakeBalance * 100).toFixed(0)}% front`)
      }
    }
  }, [])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return {
    raceState,
    isRunning,
    startRace,
    stopRace,
    playerControls: playerControlsRef.current,
    reportData,
    updateSpeedMultiplier,
    updateTrackTemperature,
    updateRainProbability,
    updatePlayerDifferential,
    updatePlayerEngineBraking,
    updatePlayerBrakeBalance
  }
}
