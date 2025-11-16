/**
 * Types and interfaces for ML-based parameter optimization
 */

export interface VehicleParameters {
  differential: number // 0-100 Nm
  engineBraking: number // 0-1
  brakeBalance: number // 0.4-0.7
  maxSpeed: number // 85-100 m/s
  acceleration: number // 10-15 m/s²
}

export interface Individual {
  id: string
  parameters: VehicleParameters
  fitness: number
  avgLapTime: number
  bestLapTime: number
  position: number
  dnf: boolean
  generation: number
}

export interface GenerationStats {
  generation: number
  bestFitness: number
  avgFitness: number
  worstFitness: number
  bestIndividual: Individual
  avgLapTime: number
  bestLapTime: number
  populationSize: number
  timestamp: number
}

export interface OptimizationConfig {
  populationSize: number
  mutationRate: number
  eliteCount: number
  tournamentSize: number
  maxGenerations: number
  targetFitness?: number
}

export interface RaceResult {
  avgLapTime: number
  bestLapTime: number
  position: number
  dnf: boolean
  totalTime: number
}
