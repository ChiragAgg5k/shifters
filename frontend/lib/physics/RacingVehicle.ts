/**
 * F1 Racing Vehicle Physics Engine
 * Port of Python base_agent.py with full F1-metrics inspired physics
 */

export interface VehicleConfig {
  id: string
  name: string
  maxSpeed: number
  acceleration: number
  brakingRate?: number
  corneringSkill?: number
  mass?: number
  dragCoefficient?: number
  frontalArea?: number
  downforceCoefficient?: number
  qualifyingPosition?: number
  lapTimeStd?: number
  dnfProbability?: number
}

export interface VehicleState {
  id: string
  name: string
  position: number
  speed: number
  lap: number
  finished: boolean
  totalTime: number
  energy: number
  tireWear: number
  tireTemperature: number
  drsActive: boolean
  inSlipstream: boolean
  damageLevel: number
  pitStops: number
  currentPosition: number
  justCrossedLine: boolean
}

export class RacingVehicle {
  // Identity
  id: string
  name: string
  
  // Position and motion
  position: number = 0
  speed: number = 0
  targetSpeed: number = 0
  distanceTraveled: number = 0
  
  // Performance characteristics
  maxSpeed: number
  acceleration: number
  brakingRate: number
  corneringSkill: number
  
  // F1-specific physics
  mass: number
  dragCoefficient: number
  frontalArea: number
  downforceCoefficient: number
  
  // Race state
  lap: number = 0
  finished: boolean = false
  totalTime: number = 0
  lapTimes: number[] = []
  
  // Energy and tire management
  energy: number = 100
  tireWear: number = 0
  tireTemperature: number = 85 // Start with warm tires
  
  // Aerodynamics
  drsActive: boolean = false
  inSlipstream: boolean = false
  
  // Damage
  damageLevel: number = 0
  
  // Strategy
  pitStops: number = 0
  
  // Driver characteristics
  qualifyingPosition: number
  lapTimeStd: number
  dnfProbability: number
  gridPenalty: number
  startBonus: number = 0
  
  // Race position
  currentPosition: number
  overtakenThisLap: boolean = false
  overtakes: number = 0
  positionsGained: number = 0
  
  // Track state
  currentCurvature: number = 0
  
  // DNF tracking
  lastDnfCheckLap: number = -1
  justCrossedLine: boolean = false

  constructor(config: VehicleConfig) {
    this.id = config.id
    this.name = config.name
    this.maxSpeed = config.maxSpeed
    this.acceleration = config.acceleration
    this.brakingRate = config.brakingRate || 15
    this.corneringSkill = config.corneringSkill || 1.2
    
    // F1 physics parameters
    this.mass = config.mass || 798 // kg (F1 minimum weight)
    this.dragCoefficient = config.dragCoefficient || 0.7
    this.frontalArea = config.frontalArea || 1.5 // m²
    this.downforceCoefficient = config.downforceCoefficient || 3.0
    
    // Driver parameters
    this.qualifyingPosition = config.qualifyingPosition || 1
    this.lapTimeStd = config.lapTimeStd || 0.15
    this.dnfProbability = config.dnfProbability || 0.02
    this.gridPenalty = (this.qualifyingPosition - 1) * 0.25
    
    this.currentPosition = this.qualifyingPosition
  }

  /**
   * Calculate target speed based on track curvature, weather, and vehicle state
   * Matches Python backend: base_agent.py _calculate_target_speed()
   */
  calculateTargetSpeed(curvature: number, weather: string, _trackTemp: number): void {
    this.currentCurvature = curvature
    
    // Base speed calculation (from parent class)
    if (curvature === 0) {
      this.targetSpeed = this.maxSpeed
    } else {
      const baseCornerSpeed = this.maxSpeed / (1 + curvature * 10)
      this.targetSpeed = baseCornerSpeed
    }
    
    // Weather effects on grip
    let gripMultiplier = 1.0
    if (weather === 'rain') {
      gripMultiplier = 0.7 // 30% less grip in rain
    } else if (weather === 'wet') {
      gripMultiplier = 0.85 // 15% less grip on wet track
    }
    
    // Tire temperature effects (optimal: 80-100°C) - DISCRETE thresholds like Python
    if (this.tireTemperature < 60) {
      gripMultiplier *= 0.9 // Cold tires
    } else if (this.tireTemperature > 110) {
      gripMultiplier *= 0.85 // Overheated tires
    }
    
    // Downforce increases cornering speed at high speeds (only in corners)
    if (curvature > 0) {
      // Base cornering skill
      const skillFactor = this.corneringSkill * gripMultiplier
      
      // Downforce effect (more effective at higher speeds)
      const speedRatio = this.speed / this.maxSpeed
      const downforceFactor = 1.0 + (this.downforceCoefficient * 0.1 * speedRatio)
      
      // Damage reduces cornering ability
      const damageFactor = 1.0 - (this.damageLevel * 0.003) // Up to 30% reduction at 100% damage
      
      this.targetSpeed *= skillFactor * downforceFactor * damageFactor
    } else {
      // On straights, just apply grip multiplier
      this.targetSpeed *= gripMultiplier
    }
  }

  /**
   * Update vehicle physics for one time step
   */
  move(timeStep: number, trackLength: number): void {
    // Driver consistency variation
    const lapTimeVariation = this.lapTimeStd * (Math.random() * 2 - 1)
    
    // Overtake penalty (0.4s for taking inferior line) - matches Python backend
    const overtakePenalty = this.overtakenThisLap ? 0.4 : 0
    this.overtakenThisLap = false
    
    // Aerodynamic drag: F_drag = 0.5 * ρ * Cd * A * v²
    const airDensity = 1.225 // kg/m³
    let dragForce = 0.5 * airDensity * this.dragCoefficient * this.frontalArea * (this.speed ** 2)
    
    // DRS reduces drag by 25% on straights
    if (this.drsActive && this.currentCurvature === 0) {
      dragForce *= 0.75
    }
    
    // Slipstream reduces drag by 30%
    if (this.inSlipstream) {
      dragForce *= 0.70
    }
    
    // Downforce: F_downforce = 0.5 * ρ * Cl * A * v² (provides grip in corners)
    
    // Drag reduces acceleration
    const dragDeceleration = dragForce / this.mass
    
    // Apply acceleration/braking
    if (this.speed < this.targetSpeed) {
      const netAcceleration = this.acceleration - dragDeceleration
      this.speed = Math.min(this.speed + netAcceleration * timeStep, this.targetSpeed)
    } else if (this.speed > this.targetSpeed) {
      const netBraking = this.brakingRate + dragDeceleration
      this.speed = Math.max(this.speed - netBraking * timeStep, this.targetSpeed)
    } else {
      // Maintain speed with drag
      this.speed = Math.max(0, this.speed - dragDeceleration * timeStep)
    }
    
    // Calculate movement
    const baseMovement = this.speed * timeStep
    const variationDistance = -lapTimeVariation * (this.speed / 10.0)
    const penaltyDistance = -overtakePenalty * (this.speed / 10.0)
    
    let movement = baseMovement + variationDistance + penaltyDistance
    movement = Math.max(0, movement)
    
    this.position += movement
    this.distanceTraveled += movement
    
    // Normalize position for circuit tracks
    this.justCrossedLine = false
    if (this.position >= trackLength) {
      this.position = this.position % trackLength
      this.justCrossedLine = true
    }
    
    // Energy consumption
    const speedFactor = this.speed / this.maxSpeed
    const accelFactor = Math.abs(this.speed - this.targetSpeed) / this.maxSpeed
    const dragFactor = dragForce / 1000.0
    
    const energyConsumption = (speedFactor * 0.01 + accelFactor * 0.005 + dragFactor * 0.002) * timeStep
    this.energy = Math.max(0, this.energy - energyConsumption)
    
    // Tire wear (cornering, braking, high speed, and dirty air) - matches Python backend
    if (this.currentCurvature > 0) {
      let wearRate = (this.speed / this.maxSpeed) * 0.001 * timeStep
      // Dirty air increases tire wear by 10% (F1-metrics inspired)
      if (this.inSlipstream) {
        wearRate *= 1.1
      }
      this.tireWear = Math.min(100.0, this.tireWear + wearRate)
    }
    
    // Hard braking increases tire wear
    if (this.speed > this.targetSpeed) {
      const brakingFactor = Math.abs(this.speed - this.targetSpeed) / this.maxSpeed
      const brakeWear = brakingFactor * 0.0005 * timeStep
      this.tireWear = Math.min(100.0, this.tireWear + brakeWear)
    }
    
    // Tire temperature management - matches Python backend
    // Tires heat up with use (any speed > 0)
    if (this.speed > 0) {
      let heatRate = (this.speed / this.maxSpeed) * 2.0 * timeStep
      if (this.currentCurvature > 0) {
        heatRate *= 1.5 // Cornering generates more heat
      }
      this.tireTemperature = Math.min(120.0, this.tireTemperature + heatRate)
    }
    
    // Tires cool down naturally (will be enhanced by weather in RaceSimulation)
    const ambientTemp = 25
    const coolingRate = (this.tireTemperature - ambientTemp) * 0.01 * timeStep
    this.tireTemperature = Math.max(ambientTemp, this.tireTemperature - coolingRate)
    
    // Reduced performance with tire wear - matches Python backend
    if (this.tireWear > 50) {
      const wearPenalty = (this.tireWear - 50) / 50 // 0 to 1
      this.corneringSkill = Math.max(0.7, 1.0 - wearPenalty * 0.3)
    }
    
    // Damage accumulation (random events, hard cornering)
    if (this.currentCurvature > 0 && this.speed > this.maxSpeed * 0.9) {
      if (Math.random() < 0.0001) { // 0.01% chance per step
        this.damageLevel = Math.min(100.0, this.damageLevel + Math.random() * 4 + 1)
      }
    }
    
    // Update total time
    this.totalTime += timeStep
  }

  /**
   * Activate DRS (only on straights)
   */
  activateDrs(): void {
    if (this.currentCurvature === 0) {
      this.drsActive = true
    }
  }

  /**
   * Deactivate DRS
   */
  deactivateDrs(): void {
    this.drsActive = false
  }

  /**
   * Check if vehicle is in slipstream of another
   */
  checkSlipstream(otherVehicles: RacingVehicle[], trackLength: number): void {
    this.inSlipstream = false
    const slipstreamDistance = 50.0 // meters
    
    for (const other of otherVehicles) {
      if (other.id === this.id) continue
      
      // Calculate distance considering track wrap-around
      let distance = other.position - this.position
      if (distance < 0) distance += trackLength
      
      if (distance > 0 && distance < slipstreamDistance && other.speed > this.speed) {
        this.inSlipstream = true
        break
      }
    }
  }

  /**
   * Perform pit stop
   */
  pitStop(): number {
    // Log-logistic distribution for pit stop time
    // Base time: 2.5s, with variability
    const alpha = 2.5
    const beta = 0.3
    const u = Math.random()
    const pitDuration = alpha * Math.pow(u / (1 - u), 1 / beta)
    
    // Clamp to reasonable range (2.0s - 4.0s)
    const actualPitDuration = Math.max(2.0, Math.min(4.0, pitDuration))
    
    // Reset tire state
    this.tireWear = 0.0
    this.tireTemperature = 60.0 // Fresh cold tires
    this.corneringSkill = Math.max(this.corneringSkill, 1.0)
    
    // Partial damage repair
    this.damageLevel = Math.max(0.0, this.damageLevel - 50.0)
    
    this.pitStops++
    this.speed = 0.0
    this.totalTime += actualPitDuration
    
    return actualPitDuration
  }

  /**
   * Complete a lap
   */
  completeLap(lapTime: number): void {
    this.lap++
    this.lapTimes.push(lapTime)
  }

  /**
   * Check if vehicle can overtake another
   */
  canOvertake(other: RacingVehicle, _trackLength: number): boolean {
    // Calculate pace advantage
    const paceAdvantage = this.speed - other.speed
    
    // DRS bonus
    const drsBonus = this.drsActive && !other.drsActive ? 5.0 : 0
    
    // Straight line speed difference
    const straightLineAdvantage = (this.maxSpeed - other.maxSpeed) * 0.5
    
    // Total advantage
    const totalAdvantage = paceAdvantage + drsBonus + straightLineAdvantage
    
    // Dynamic overtaking threshold (harder in corners)
    const overtakingThreshold = this.currentCurvature > 0 ? 8.0 : 3.0
    
    return totalAdvantage > overtakingThreshold
  }

  /**
   * Get current vehicle state
   */
  getState(): VehicleState {
    return {
      id: this.id,
      name: this.name,
      position: this.position,
      speed: this.speed,
      lap: this.lap,
      finished: this.finished,
      totalTime: this.totalTime,
      energy: Math.round(this.energy * 100) / 100,
      tireWear: Math.round(this.tireWear * 100) / 100,
      tireTemperature: Math.round(this.tireTemperature * 10) / 10,
      drsActive: this.drsActive,
      inSlipstream: this.inSlipstream,
      damageLevel: Math.round(this.damageLevel * 10) / 10,
      pitStops: this.pitStops,
      currentPosition: this.currentPosition,
      justCrossedLine: this.justCrossedLine
    }
  }
}
