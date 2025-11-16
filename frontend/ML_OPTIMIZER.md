# ML Parameter Optimizer

## Overview
Pure TypeScript genetic algorithm implementation for optimizing F1 vehicle parameters. No external ML libraries required - completely native JavaScript/TypeScript.

## Features

### Genetic Algorithm
- **Population-based evolution** with configurable size (10-50 individuals)
- **Tournament selection** for parent breeding
- **Crossover (breeding)** with blend factor
- **Mutation** with configurable rate (5-30%)
- **Elitism** preserves top performers (10% by default)

### Parameters Optimized
1. **Differential Preload** (30-70 Nm)
2. **Engine Braking** (0.3-0.8)
3. **Brake Balance** (0.48-0.60)
4. **Max Speed** (88-96 m/s)
5. **Acceleration** (11-14 m/s²)

### Fitness Function
```typescript
fitness = lap_time_score + position_bonus + consistency_bonus

where:
  lap_time_score = 10000 / avgLapTime  // Lower times = higher score
  position_bonus = (20 - position) * 50 // P1 gets most points
  consistency_bonus = 100 / (1 + |avgLap - bestLap|)
```

## Usage

1. Navigate to **ML Optimizer** from main menu
2. Configure optimization:
   - Select circuit and number of laps
   - Set population size (more = better exploration, slower)
   - Set max generations (30-100 recommended)
   - Adjust mutation rate (15% default)
3. Click **Start Optimization**
4. Watch evolution in real-time:
   - Fitness improvement chart
   - Lap time reduction graph
   - Best parameters display
   - Live race telemetry
5. Copy best parameters when complete

## Algorithm Details

### Initialization
- Random population generated within parameter bounds
- Each individual gets unique parameter combination

### Selection
- Tournament selection (size 5)
- Best performers more likely to breed
- Ensures diversity while favoring fitness

### Breeding
- Blend crossover: `child = parent1 * α + parent2 * (1-α)`
- Random alpha ensures variety in offspring

### Mutation
- 15% chance per parameter to mutate
- Small random adjustments maintain exploration
- Prevents premature convergence

### Evolution Cycle
```
Generation N:
1. Evaluate all individuals (run races)
2. Calculate fitness scores
3. Select elite (top 10%)
4. Tournament select parents
5. Breed new population
6. Mutate offspring
7. Repeat until max generations or target fitness
```

## Performance

- **Headless racing**: 10 simulation steps per frame for speed
- **Fast convergence**: Typically 20-30 generations
- **Improvement**: Usually 10-20% lap time reduction
- **Time**: ~30 seconds per generation (20 individuals, 5 laps)

## Visualization

### Real-time Charts
- **Fitness Evolution**: Best vs Average over generations
- **Lap Time Improvement**: Shows reduction over time
- **Parameter Display**: Live best values
- **Progress Bars**: Generation and individual progress

### Live Telemetry
- Current lap number
- Vehicle speed
- Track position
- Tire temperature

## Tips for Best Results

1. **Start Small**: Use 20 individuals, 20 generations for quick tests
2. **Increase for Quality**: 50 individuals, 50 generations for optimal results
3. **Mutation Rate**: 
   - High (25-30%) for exploration early on
   - Low (10-15%) for fine-tuning
4. **Laps**: 5-7 laps gives good balance of speed vs accuracy
5. **Circuit**: Start with Monaco (short) for faster iterations

## Future Enhancements

- Multi-objective optimization (speed vs consistency vs tire wear)
- Neural network policy learning
- Reinforcement learning with PPO/A3C
- Transfer learning across circuits
- Ensemble of best individuals
