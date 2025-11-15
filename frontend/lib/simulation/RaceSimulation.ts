/**
 * F1 Race Simulation Engine
 * Port of Python simulator.py - coordinates all race logic
 */

import { RacingVehicle, VehicleState } from '../physics/RacingVehicle'
import { Track, TrackInfo } from '../track/Track'

export interface SimulationConfig {
  track: Track
  timeStep?: number
  weather?: string
  temperature?: number
}

export interface SimulationState {
  step: number
  simulationTime: number
  running: boolean
  agents: VehicleState[]
  environment: {
    track: TrackInfo
    weather: string
    temperature: number
  }
  currentLap: number
  safetyCar?: {
    active: boolean
    duration: number
  }
  dnfs?: string[]
}

export class RaceSimulation {
  track: Track
  timeStep: number
  weather: string
  temperature: number
  
  vehicles: RacingVehicle[] = []
  running: boolean = false
  simulationTime: number = 0
  step: number = 0
  currentLap: number = 0
  
  // Safety car
  safetyCarActive: boolean = false
  safetyCarDuration: number = 0
  safetyCarLapsRemaining: number = 0
  
  // DNFs
  dnfVehicles: Set<string> = new Set()

  constructor(config: SimulationConfig) {
    this.track = config.track
    this.timeStep = config.timeStep || 0.1
    this.weather = config.weather || 'clear'
    this.temperature = config.temperature || 35
  }

  /**
   * Add a vehicle to the simulation
   */
  addVehicle(vehicle: RacingVehicle): void {
    this.vehicles.push(vehicle)
  }

  /**
   * Start the race
   */
  start(): void {
    this.running = true
    this.simulationTime = 0
    this.step = 0
    this.currentLap = 0
    
    console.log(`🏁 Race started with ${this.vehicles.length} vehicles on ${this.track.name}`)
    console.log(`📏 Track length: ${this.track.length.toFixed(0)}m, Laps: ${this.track.numLaps}`)
    console.log(`🌡️ Track Temperature: ${this.temperature}°C`)
    console.log(`🌧️ Weather: ${this.weather}`)
    console.log(`⏱️ Time step: ${this.timeStep}s (${(1/this.timeStep).toFixed(0)} FPS)`)
  }

  /**
   * Stop the race
   */
  stop(): void {
    this.running = false
    console.log(`🏁 Race stopped at ${this.simulationTime.toFixed(2)}s`)
  }

  /**
   * Advance simulation by one time step
   */
  stepSimulation(): void {
    if (!this.running) return

    this.step++
    this.simulationTime += this.timeStep

    // Update current lap (max lap of unfinished vehicles)
    const unfinishedVehicles = this.vehicles.filter(v => !v.finished && !this.dnfVehicles.has(v.id))
    if (unfinishedVehicles.length > 0) {
      this.currentLap = Math.max(...unfinishedVehicles.map(v => v.lap))
    }

    // Update safety car
    if (this.safetyCarActive) {
      this.safetyCarLapsRemaining -= this.timeStep / 60 // Rough lap time estimate
      if (this.safetyCarLapsRemaining <= 0) {
        this.safetyCarActive = false
        console.log('🟢 Safety car returning to pits')
      }
    }

    // Update each vehicle
    for (const vehicle of this.vehicles) {
      if (vehicle.finished || this.dnfVehicles.has(vehicle.id)) continue

      // Get track curvature at current position
      const curvature = this.track.getCurvature(vehicle.position)
      
      // Calculate target speed BEFORE moving
      vehicle.calculateTargetSpeed(curvature, this.weather, this.temperature)
      
      // Safety car limits speed
      if (this.safetyCarActive) {
        vehicle.targetSpeed = Math.min(vehicle.targetSpeed, 40) // 40 m/s under safety car
      }
      
      // Check slipstream
      vehicle.checkSlipstream(this.vehicles, this.track.length)
      
      // DRS management (only on straights, not under safety car)
      if (curvature === 0 && !this.safetyCarActive) {
        vehicle.activateDrs()
      } else {
        vehicle.deactivateDrs()
      }
      
      // Move vehicle
      vehicle.move(this.timeStep, this.track.length)
      
      // Check lap completion
      if (vehicle.justCrossedLine) {
        const lapTime = this.simulationTime - vehicle.lapTimes.reduce((a, b) => a + b, 0)
        vehicle.completeLap(lapTime)
        
        // Check if finished race (after completing the lap)
        if (vehicle.lap >= this.track.numLaps) {
          vehicle.finished = true
          console.log(`🏁 ${vehicle.name} finished in position ${this.getFinishedCount()}`)
        }
      }
      
      // DNF check (once per lap)
      if (vehicle.lap > vehicle.lastDnfCheckLap && vehicle.lap > 0) {
        vehicle.lastDnfCheckLap = vehicle.lap
        
        const dnfChance = vehicle.dnfProbability / Math.max(this.track.numLaps, 1)
        if (Math.random() < dnfChance) {
          this.dnfVehicles.add(vehicle.id)
          console.log(`❌ DNF: ${vehicle.name} on lap ${vehicle.lap}`)
          
          // 30% chance of safety car
          if (Math.random() < 0.3 && !this.safetyCarActive) {
            this.deploySafetyCar()
          }
        }
      }
    }

    // Update positions
    this.updatePositions()

    // Check if race is complete
    const activeVehicles = this.vehicles.filter(v => !v.finished && !this.dnfVehicles.has(v.id))
    if (activeVehicles.length === 0 && this.vehicles.some(v => v.finished)) {
      this.running = false
      console.log(`🏆 Race finished! Total time: ${this.simulationTime.toFixed(2)}s`)
    }
    
    // Debug: log first vehicle status every 10 steps
    if (this.step % 100 === 0 && this.step > 0) {
      const v = this.vehicles[0]
      console.log(`Step ${this.step}: ${v.name} - Lap ${v.lap}/${this.track.numLaps}, Pos ${v.position.toFixed(0)}m, Speed ${v.speed.toFixed(1)} m/s`)
    }
  }

  /**
   * Deploy safety car
   */
  deploySafetyCar(): void {
    this.safetyCarActive = true
    this.safetyCarLapsRemaining = 3 // 3 laps under safety car
    this.safetyCarDuration = 3
    console.log('🟡 Safety car deployed!')
  }

  /**
   * Update vehicle positions based on race progress
   */
  updatePositions(): void {
    // Sort vehicles by progress (lap * track length + position)
    const sortedVehicles = [...this.vehicles]
      .filter(v => !this.dnfVehicles.has(v.id))
      .sort((a, b) => {
        if (a.finished !== b.finished) return a.finished ? -1 : 1
        const progressA = a.lap * this.track.length + a.position
        const progressB = b.lap * this.track.length + b.position
        return progressB - progressA
      })

    // Assign positions
    sortedVehicles.forEach((vehicle, index) => {
      const oldPosition = vehicle.currentPosition
      vehicle.currentPosition = index + 1
      
      // Track overtakes
      if (oldPosition > vehicle.currentPosition) {
        vehicle.overtakes++
        vehicle.positionsGained++
      } else if (oldPosition < vehicle.currentPosition) {
        vehicle.overtakenThisLap = true
      }
    })
  }

  /**
   * Get count of finished vehicles
   */
  getFinishedCount(): number {
    return this.vehicles.filter(v => v.finished).length
  }

  /**
   * Get current simulation state
   */
  getState(): SimulationState {
    return {
      step: this.step,
      simulationTime: this.simulationTime,
      running: this.running,
      agents: this.vehicles.map(v => v.getState()),
      environment: {
        track: this.track.getInfo(),
        weather: this.weather,
        temperature: this.temperature
      },
      currentLap: this.currentLap,
      safetyCar: {
        active: this.safetyCarActive,
        duration: this.safetyCarLapsRemaining
      },
      dnfs: Array.from(this.dnfVehicles)
    }
  }
}
