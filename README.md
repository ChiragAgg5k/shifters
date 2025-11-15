# Shifters - Competitive Mobility Systems Simulator

A lightweight mobility event simulator that models many moving agents, events, and outputs a live leaderboard.

## Applications

- Formula E racing
- MotoGP racing
- Drone racing
- Supply-chain races
- Traffic flow management
- Any competitive mobility scenario

## Features

- **Agent-Based Modeling**: Each agent (vehicle, drone, etc.) has independent properties and decision logic
- **Discrete Event Simulation**: Efficient state changes over time
- **Live Leaderboard**: Real-time ranking updates with efficient sorted data structures
- **Flexible Environments**: Customizable tracks and scenarios
- **Event System**: Trigger callbacks for laps, checkpoints, finishes, etc.
- **Pre-configured Scenarios**: Formula E, MotoGP, drones, supply chain, and traffic flow

## Project Structure

```
shifters/
├── agents/          # Agent classes (vehicles, drones, etc.)
├── environment/     # Track and environment representation
├── simcore/         # Simulation engine and event loop
├── leaderboard/     # Real-time ranking system
├── ui/              # Dashboard and visualization (future)
├── config/          # Scenario configurations
└── cli.py           # Command-line interface
```

## Installation

This project uses `uv` for Python environment management.

```bash
# Install dependencies
uv sync
```

## Quick Start

Run a sample racing simulation:

```bash
# Basic race with 5 agents
uv run python -m shifters.cli

# Customize the race
uv run python -m shifters.cli -n 10 --laps 5 --track-length 2000

# Run without live leaderboard updates
uv run python -m shifters.cli --no-leaderboard
```

### CLI Options

- `-n, --num-agents`: Number of racing agents (default: 5)
- `-l, --track-length`: Track length in meters (default: 1000.0)
- `--laps`: Number of laps (default: 3)
- `--max-steps`: Maximum simulation steps (default: unlimited)
- `--no-leaderboard`: Disable live leaderboard display

## Usage Examples

### Basic Simulation

```python
from shifters.agents.base_agent import RacingVehicle
from shifters.environment.track import Track
from shifters.simcore.simulator import MobilitySimulation

# Create track
track = Track(length=1000.0, num_laps=3, name="Test Circuit")

# Create simulation
sim = MobilitySimulation(track=track)

# Add agents
for i in range(5):
    vehicle = RacingVehicle(
        unique_id=f"car_{i}",
        model=sim,
        name=f"Racer #{i+1}",
        max_speed=200.0,
        acceleration=15.0
    )
    sim.add_agent(vehicle)

# Run simulation
sim.run()

# Get results
standings = sim.get_current_standings()
```

### Event Callbacks

```python
# Register callbacks for events
def on_lap_complete(agent, lap, lap_time):
    print(f"{agent.name} completed lap {lap} in {lap_time:.2f}s")

def on_agent_finish(agent, position):
    print(f"{agent.name} finished in position {position}!")

sim.register_event_callback('lap_complete', on_lap_complete)
sim.register_event_callback('agent_finish', on_agent_finish)
```

### Custom Agents

```python
from shifters.agents.base_agent import MobilityAgent

class Drone(MobilityAgent):
    def __init__(self, unique_id, model, battery_capacity=100.0, **kwargs):
        super().__init__(unique_id, model, **kwargs)
        self.battery = battery_capacity

    def _move(self):
        super()._move()
        # Custom battery drain logic
        self.battery -= 0.1 * (self.speed / self.max_speed)
```

## Architecture Components

### Agents (`shifters/agents/`)
- `MobilityAgent`: Base class for all moving entities
- `RacingVehicle`: Specialized for racing scenarios with energy management

### Environment (`shifters/environment/`)
- `Track`: Represents racing circuit or path
- `Environment`: Manages track and conditions
- `Checkpoint`: Track waypoints

### Simulation Core (`shifters/simcore/`)
- `MobilitySimulation`: Main simulation engine
- Event management system
- Time-stepping logic

### Leaderboard (`shifters/leaderboard/`)
- `Leaderboard`: Real-time ranking system
- `AgentRanking`: Individual agent stats and position
- Efficient sorting and updates

## Pre-configured Scenarios

The system includes several pre-configured scenarios:

- **Formula E**: Electric street racing (22 agents, 2.4km track)
- **MotoGP**: Motorcycle racing (24 agents, 4.8km track)
- **Drone Racing**: FPV drone racing (8 agents, 800m technical course)
- **Supply Chain**: Last-mile delivery (50 agents, 15km urban route)
- **Traffic Flow**: Urban traffic management (100 agents, 5km corridor)

## Roadmap

- [ ] Web-based live dashboard
- [ ] Real-time API for leaderboard access
- [ ] 2D/3D visualization
- [ ] More agent types (drones, autonomous vehicles, etc.)
- [ ] Complex event rules (collisions, overtaking, pit stops)
- [ ] Weather and environmental effects
- [ ] Multi-track support
- [ ] Historical data analysis
- [ ] Machine learning agent strategies

## Development

```bash
# Activate virtual environment
source .venv/bin/activate

# Run tests (when available)
uv run pytest

# Format code
uv run black shifters/

# Type checking
uv run mypy shifters/
```

## Contributing

This is a foundational implementation designed for extension. Key areas for contribution:

1. New agent types and behaviors
2. Additional scenarios
3. Visualization components
4. Performance optimizations
5. Event types and rules

## License

MIT License
