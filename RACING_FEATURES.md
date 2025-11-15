># Enhanced F1 Racing Simulation Features

## 🆕 What's New

The Shifters simulator now includes detailed F1 racing features for realistic race simulation:

### 1. **Tire Compound System**

Three dry compounds with realistic characteristics:
- **SOFT** (Red): Fastest grip, degrades quickly (~20 laps max life)
- **MEDIUM** (Yellow): Balanced performance (~35 laps max life)  
- **HARD** (White): Durable, slower pace (~50 laps max life)

Plus wet weather compounds:
- **INTERMEDIATE**: For damp conditions
- **WET**: For heavy rain

### 2. **Tire Degradation Modeling**

Tires realistically degrade based on:
- **Wear**: Increases with speed, cornering, and temperature
- **Temperature**: Optimal range for grip (overheating or cold = reduced performance)
- **Track Conditions**: Wrong compound for conditions degrades faster
- **Warm-up Period**: Tires take 1-3 laps to reach optimal temperature

### 3. **Pit Stop Strategy**

Automated pit stop management including:
- **Strategic Planning**: Pre-race strategy with 0-3 planned stops
- **Pit Lane Time Loss**: ~20 seconds per pit stop
- **Stop Duration**: 2.0-4.0 seconds (realistic F1 tire change times)
- **Dynamic Decisions**: Pit when tires critically worn or damaged

### 4. **F1 2025 Race Distances**

All circuits use official race distances:
- **Monaco**: 78 laps (260.3 km) - Special exception <305km
- **Spa-Francorchamps**: 44 laps (308.1 km)
- **Monza**: 53 laps (306.7 km)
- All other circuits: ~50-72 laps to achieve ~305km regulation distance

### 5. **OpenF1 API Integration**

Access real F1 data:
- Historical stint data (tire compounds and lengths)
- Pit stop statistics
- Circuit-specific strategy analysis
- Driver performance data

## 📊 Usage Examples

### Basic Race with Tire Management

```python
from shifters.agents.base_agent import RacingVehicle
from shifters.environment import GeoJSONTrackParser
from shifters.simcore.simulator import MobilitySimulation
from shifters.racing import TireCompound

# Load circuit with real F1 2025 race distance
track = GeoJSONTrackParser.from_feature_collection_file(
    "data/circuits/f1-circuits.geojson",
    circuit_id="mc-1929",  # Monaco
    use_real_race_distance=True,  # Uses 78 laps
)

sim = MobilitySimulation(track=track)

# Create driver with tire management
driver = RacingVehicle(
    model=sim,
    unique_id="driver_1",
    name="Max Verstappen",
    max_speed=200.0,
    starting_compound=TireCompound.MEDIUM,
    enable_tire_management=True,
    pit_stops_planned=2,  # 2-stop strategy
)
sim.add_agent(driver)

sim.start_race()
sim.run()

# Check tire state
print(driver.current_tires.get_state())
# {'compound': 'MEDIUM', 'laps_used': 25, 'wear_percentage': 68.5, ...}

print(driver.pit_strategy.get_strategy_info())
# {'planned_stops': [...], 'completed_stops': [...], ...}
```

### Analyzing Real F1 Data with OpenF1

```python
from shifters.data import OpenF1Client

client = OpenF1Client()

# Analyze tire strategy for Monaco 2024
strategy = client.analyze_circuit_strategy("Monaco", year=2024)

print(f"Most common strategy: {strategy['most_common_stops']} stops")
print(f"Compound usage: {strategy['compound_usage']}")
print(f"Average stint lengths: {strategy['average_stint_lengths']}")
```

### Running the Monaco GP Example

```bash
# Run the complete Monaco Grand Prix simulation
uv run python examples/monaco_gp_2025.py
```

Expected output:
```
🏎️  F1 2025 MONACO GRAND PRIX SIMULATION
============================================================
🏁 Circuit: Circuit de Monaco
📏 Length: 3337m (3.337km)
🔄 Laps: 78
📍 Total Distance: 260.3km
🌀 Corners: 159

👥 Drivers:
   # 1 Max Verstappen       - Starting: MEDIUM | Strategy: aggressive (2 stops)
   #16 Charles Leclerc      - Starting: SOFT   | Strategy: aggressive (2 stops)
   #44 Lewis Hamilton       - Starting: MEDIUM | Strategy: conservative (1 stop)
   ...

📍 LAP 10/78
------------------------------------------------------------
   P1  Max Verstappen (# 1)  | Lap 10 | Tires: MEDIUM  9L  28.5% | no stops
   P2  Charles Leclerc (#16) | Lap 10 | Tires: SOFT    9L  45.2% | no stops
   ...

📍 LAP 20/78
------------------------------------------------------------
   P1  Charles Leclerc (#16) | Lap 20 | Tires: MEDIUM  8L  22.1% | 1 stops
   P2  Max Verstappen (# 1)  | Lap 20 | Tires: MEDIUM 19L  58.3% | no stops
   ...

🏁 RACE COMPLETE!
============================================================

📊 Final Results - Circuit de Monaco
------------------------------------------------------------
   P1  Max Verstappen (# 1)  | 98:23.450 | WINNER       | 2 pit stops
   P2  Charles Leclerc (#16) | 98:28.123 | +4.673s      | 2 pit stops
   P3  Lewis Hamilton (#44)  | 98:35.891 | +12.441s     | 1 pit stop
   ...
```

## 🎮 Web Visualization

The web UI now includes tire management controls:

1. **Tire Management Toggle**: Enable/disable realistic tire simulation
2. **Planned Pit Stops**: Set number of strategic pit stops (0-3)
3. **Live Tire Data**: See compound, wear%, and laps on current tires
4. **Pit Lane Indicator**: Visual indicator when drivers are in pit lane

Start the server:
```bash
uv run python run_visualization.py
```

Navigate to `http://localhost:8000` and configure:
- Select an F1 circuit (uses real 2025 race distance)
- Enable "Tire Management"
- Set "Planned Pit Stops" (1-2 recommended for most circuits)
- Click "Start Race"

## 📚 Technical Details

### Tire Physics Model

The tire simulation includes:
- **Base Grip**: Compound-dependent coefficient (0.75 - 1.0)
- **Degradation Rate**: % per lap (0.8% - 2.5% depending on compound)
- **Temperature Model**: Heating from speed, cooling from ambient
- **Optimal Temperature Window**: Each compound has ideal operating range
- **Wear Calculation**: Speed factor × temperature factor × condition factor

### Pit Stop Simulation

Pit stops include:
- **Entry**: Decision point based on strategy or tire condition
- **Pit Lane Transit**: Time lost driving through pit lane (~20s)
- **Stop Duration**: Stationary time for tire change (2-4s typical)
- **Exit**: Return to track with fresh tires at reduced speed

### Strategy Planning

The system automatically generates strategies:
- **1-Stop**: Conservative (MEDIUM→HARD or SOFT→MEDIUM)
- **2-Stop**: Balanced (SOFT→MEDIUM→SOFT or MEDIUM→HARD→MEDIUM)
- **3-Stop**: Aggressive (Multiple SOFT stints)

## 🔧 Dependencies

The tire management system requires:
```bash
uv add httpx  # For OpenF1 API client
```

All other features use standard dependencies.

## 🎯 Future Enhancements

Planned features:
- [ ] Safety car periods affecting strategy
- [ ] Tire blanket warming pre-installation
- [ ] Fuel load simulation
- [ ] DRS (Drag Reduction System)
- [ ] Weather changes during race
- [ ] More granular damage modeling
- [ ] Team radio strategy calls

## 📖 API Reference

### TireSet Class

```python
TireSet(
    compound: TireCompound,
    age_at_fitting: int = 0,
    initial_temperature: float = 60.0
)
```

**Methods:**
- `update(lap_distance, track_length, speed, ambient_temp, is_wet)`: Update tire state
- `get_grip_level(is_wet)`: Returns current grip coefficient (0.0-1.0)
- `get_performance_multiplier(is_wet)`: Returns speed multiplier (0.0-1.2)
- `needs_replacement()`: Returns True if tires should be changed
- `get_state()`: Returns tire state dictionary

### PitStopStrategy Class

```python
PitStopStrategy(
    total_laps: int,
    track_length: float,
    pit_lane_time_loss: float = 20.0
)
```

**Methods:**
- `plan_strategy(starting_compound, target_stops)`: Generate race strategy
- `should_pit(current_lap, current_tires, is_damaged)`: Determine if pit needed
- `execute_pit_entry(current_lap, current_tires)`: Start pit procedure
- `update_pit_stop(dt)`: Progress pit stop execution
- `get_strategy_info()`: Returns strategy data dictionary

### OpenF1Client Class

```python
client = OpenF1Client()
```

**Methods:**
- `get_stints(session_key)`: Get all tire stints from a session
- `get_driver_stints(session_key, driver_number)`: Get stints for specific driver
- `get_pit_stops(session_key)`: Get pit stop data
- `analyze_circuit_strategy(circuit_name, year)`: Analyze typical strategy
- `get_race_distance(circuit_name, year)`: Get official race lap count

## 💡 Tips for Best Results

1. **Monaco**: 2-stop strategies work well due to slow corners wearing tires
2. **Spa**: 1-stop possible with HARD compound due to high-speed nature
3. **Enable tire management** for realistic race simulation
4. **Plan 1-2 stops** for most circuits to balance performance and time loss
5. **Watch tire temperature** - cold tires at race start reduce initial pace
6. **Use OpenF1 data** to inform strategy decisions for each circuit

## 🏁 Example Races

Try these scenarios:

**Conservative 1-Stop**:
- Starting: MEDIUM
- Pit lap ~30-35 
- Second stint: HARD
- Best for: Low-degradation circuits (Spa, Monza)

**Aggressive 2-Stop**:
- Starting: SOFT
- First pit: Lap 15-20 → MEDIUM
- Second pit: Lap 40-45 → SOFT
- Best for: High-degradation circuits (Monaco, Singapore)

**Experimental 3-Stop**:
- Multiple SOFT stints for qualifying pace
- High risk (more pit time lost)
- Best for: Circuits where overtaking is easy

---

**Enjoy realistic F1 racing simulation! 🏎️💨**
