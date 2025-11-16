/**
 * Genetic Algorithm for Racing Parameter Optimization
 * Pure TypeScript implementation - no external ML libraries
 */

import type { Individual, VehicleParameters, OptimizationConfig, GenerationStats } from './types'

export class GeneticOptimizer {
  private population: Individual[] = []
  private generation: number = 0
  private config: OptimizationConfig
  private generationHistory: GenerationStats[] = []

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = {
      populationSize: config.populationSize ?? 30,
      mutationRate: config.mutationRate ?? 0.15,
      eliteCount: config.eliteCount ?? 3,
      tournamentSize: config.tournamentSize ?? 5,
      maxGenerations: config.maxGenerations ?? 50,
      targetFitness: config.targetFitness
    }
  }

  /**
   * Initialize population with random parameters
   */
  initializePopulation(): Individual[] {
    this.population = []
    this.generation = 0
    this.generationHistory = []

    for (let i = 0; i < this.config.populationSize; i++) {
      this.population.push({
        id: `gen0_ind${i}`,
        parameters: this.randomParameters(),
        fitness: 0,
        avgLapTime: 0,
        bestLapTime: 0,
        position: 0,
        dnf: false,
        generation: 0
      })
    }

    return this.population
  }

  /**
   * Generate random vehicle parameters within valid ranges
   */
  private randomParameters(): VehicleParameters {
    return {
      differential: this.random(30, 70), // Nm
      engineBraking: this.random(0.3, 0.8),
      brakeBalance: this.random(0.48, 0.60),
      maxSpeed: this.random(88, 96), // m/s
      acceleration: this.random(11, 14) // m/s²
    }
  }

  /**
   * Calculate fitness based on race performance
   * Lower lap times and better positions = higher fitness
   */
  calculateFitness(individual: Individual): number {
    if (individual.dnf) {
      return 0 // DNF gets zero fitness
    }

    // Fitness components:
    // 1. Lap time (most important) - inverse relationship
    // 2. Position bonus
    // 3. Consistency (avg vs best lap)

    const lapTimeScore = 10000 / individual.avgLapTime // Higher score for lower lap times
    const positionBonus = (20 - individual.position) * 50 // Up to 950 points for P1
    const consistencyBonus = 100 / (1 + Math.abs(individual.avgLapTime - individual.bestLapTime))

    return lapTimeScore + positionBonus + consistencyBonus
  }

  /**
   * Tournament selection - select parent for breeding
   */
  private tournamentSelect(): Individual {
    let best: Individual | null = null

    for (let i = 0; i < this.config.tournamentSize; i++) {
      const candidate = this.population[Math.floor(Math.random() * this.population.length)]
      if (!best || candidate.fitness > best.fitness) {
        best = candidate
      }
    }

    return best!
  }

  /**
   * Crossover (breed) two parents to create offspring
   */
  private crossover(parent1: Individual, parent2: Individual): VehicleParameters {
    const alpha = Math.random() // Blend factor

    return {
      differential: this.blend(parent1.parameters.differential, parent2.parameters.differential, alpha),
      engineBraking: this.blend(parent1.parameters.engineBraking, parent2.parameters.engineBraking, alpha),
      brakeBalance: this.blend(parent1.parameters.brakeBalance, parent2.parameters.brakeBalance, alpha),
      maxSpeed: this.blend(parent1.parameters.maxSpeed, parent2.parameters.maxSpeed, alpha),
      acceleration: this.blend(parent1.parameters.acceleration, parent2.parameters.acceleration, alpha)
    }
  }

  /**
   * Blend two values using alpha factor
   */
  private blend(val1: number, val2: number, alpha: number): number {
    return val1 * alpha + val2 * (1 - alpha)
  }

  /**
   * Mutate parameters with small random changes
   */
  private mutate(params: VehicleParameters): VehicleParameters {
    const mutated = { ...params }

    if (Math.random() < this.config.mutationRate) {
      mutated.differential = this.clamp(mutated.differential + this.random(-10, 10), 30, 70)
    }
    if (Math.random() < this.config.mutationRate) {
      mutated.engineBraking = this.clamp(mutated.engineBraking + this.random(-0.1, 0.1), 0.3, 0.8)
    }
    if (Math.random() < this.config.mutationRate) {
      mutated.brakeBalance = this.clamp(mutated.brakeBalance + this.random(-0.03, 0.03), 0.48, 0.60)
    }
    if (Math.random() < this.config.mutationRate) {
      mutated.maxSpeed = this.clamp(mutated.maxSpeed + this.random(-2, 2), 88, 96)
    }
    if (Math.random() < this.config.mutationRate) {
      mutated.acceleration = this.clamp(mutated.acceleration + this.random(-0.5, 0.5), 11, 14)
    }

    return mutated
  }

  /**
   * Evolve to next generation
   */
  evolveGeneration(): Individual[] {
    // Sort by fitness
    this.population.sort((a, b) => b.fitness - a.fitness)

    // Record stats for this generation
    this.recordGenerationStats()

    // Create new population
    const newPopulation: Individual[] = []
    this.generation++

    // Elitism - keep best performers
    for (let i = 0; i < this.config.eliteCount; i++) {
      const elite = { ...this.population[i] }
      elite.id = `gen${this.generation}_elite${i}`
      elite.generation = this.generation
      newPopulation.push(elite)
    }

    // Breed rest of population
    while (newPopulation.length < this.config.populationSize) {
      const parent1 = this.tournamentSelect()
      const parent2 = this.tournamentSelect()
      
      let offspring = this.crossover(parent1, parent2)
      offspring = this.mutate(offspring)

      newPopulation.push({
        id: `gen${this.generation}_ind${newPopulation.length}`,
        parameters: offspring,
        fitness: 0,
        avgLapTime: 0,
        bestLapTime: 0,
        position: 0,
        dnf: false,
        generation: this.generation
      })
    }

    this.population = newPopulation
    return this.population
  }

  /**
   * Record statistics for current generation
   */
  private recordGenerationStats(): void {
    const fitnesses = this.population.map(ind => ind.fitness)
    const lapTimes = this.population.filter(ind => !ind.dnf).map(ind => ind.avgLapTime)

    const stats: GenerationStats = {
      generation: this.generation,
      bestFitness: Math.max(...fitnesses),
      avgFitness: fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length,
      worstFitness: Math.min(...fitnesses),
      bestIndividual: { ...this.population[0] },
      avgLapTime: lapTimes.length > 0 ? lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length : 0,
      bestLapTime: lapTimes.length > 0 ? Math.min(...lapTimes) : 0,
      populationSize: this.population.length,
      timestamp: Date.now()
    }

    this.generationHistory.push(stats)
  }

  /**
   * Get current population
   */
  getPopulation(): Individual[] {
    return this.population
  }

  /**
   * Get best individual from current generation
   */
  getBestIndividual(): Individual | null {
    if (this.population.length === 0) return null
    return [...this.population].sort((a, b) => b.fitness - a.fitness)[0]
  }

  /**
   * Get generation history
   */
  getHistory(): GenerationStats[] {
    return this.generationHistory
  }

  /**
   * Get current generation number
   */
  getGeneration(): number {
    return this.generation
  }

  /**
   * Update individual's race results and calculate fitness
   */
  updateIndividualResults(individualId: string, results: {
    avgLapTime: number
    bestLapTime: number
    position: number
    dnf: boolean
  }): void {
    const individual = this.population.find(ind => ind.id === individualId)
    if (!individual) return

    individual.avgLapTime = results.avgLapTime
    individual.bestLapTime = results.bestLapTime
    individual.position = results.position
    individual.dnf = results.dnf
    individual.fitness = this.calculateFitness(individual)
  }

  /**
   * Check if optimization is complete
   */
  isComplete(): boolean {
    // Check if we've reached max generations (before evolving to next)
    if (this.generation >= this.config.maxGenerations - 1) return true
    if (this.config.targetFitness && this.getBestIndividual()?.fitness! >= this.config.targetFitness) {
      return true
    }
    return false
  }

  /**
   * Check if we should evolve to next generation
   */
  shouldEvolve(): boolean {
    return this.generation < this.config.maxGenerations - 1
  }

  // Utility functions
  private random(min: number, max: number): number {
    return min + Math.random() * (max - min)
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }
}
