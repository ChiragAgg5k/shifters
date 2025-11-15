"""
Quick Start: Running Enhanced F1 Simulations

This script demonstrates all the new F1 racing features in action.
"""

from shifters.agents.base_agent import RacingVehicle
from shifters.environment import GeoJSONTrackParser
from shifters.simcore.simulator import MobilitySimulation
from shifters.racing import TireCompound
from shifters.data import OpenF1Client, F1_2025_RACE_DISTANCES
from pathlib import Path

print("=" * 70)
print("🏎️  SHIFTERS - ENHANCED F1 RACING SIMULATOR")
print("=" * 70)
print()

# 1. Show available F1 circuits
circuits_file = Path(__file__).parent.parent / "data" / "circuits" / "f1-circuits.geojson"
circuits = GeoJSONTrackParser.list_circuits_in_collection_file(str(circuits_file))

print(f"📍 Available F1 Circuits: {len(circuits)}")
print()
for i, circuit in enumerate(circuits[:5], 1):
    distance_key = circuit["id"].split("-")[0] if "-" in circuit["id"] else None
    laps = "?"
    for key, lap_count in F1_2025_RACE_DISTANCES.items():
        if distance_key and distance_key in key:
            laps = lap_count
            break
    print(f"   {i}. {circuit['name']:30s} - {circuit['location']:20s} ({laps} laps)")
print(f"   ... and {len(circuits) - 5} more circuits")
print()

# 2. Load a specific circuit
print("=" * 70)
print("Loading Spa-Francorchamps for demonstration...")
print("=" * 70)
print()

track = GeoJSONTrackParser.from_feature_collection_file(
    str(circuits_file),
    circuit_id="spa-1925",
    use_real_race_distance=True,
)

print(f"✓ Circuit: {track.name}")
print(f"✓ Length: {track.length/1000:.3f} km")
print(f"✓ Race Distance: {track.num_laps} laps = {track.length * track.num_laps / 1000:.1f} km")
print(f"✓ Segments: {len(track.segments)}")
print()

# 3. Create simulation with tire management
print("=" * 70)
print("Setting up race simulation...")
print("=" * 70)
print()

sim = MobilitySimulation(track=track, time_step=0.1)

# Create a grid of 5 drivers with different strategies
drivers_config = [
    {"name": "Driver 1", "compound": TireCompound.SOFT, "stops": 2},
    {"name": "Driver 2", "compound": TireCompound.MEDIUM, "stops": 1},
    {"name": "Driver 3", "compound": TireCompound.SOFT, "stops": 2},
    {"name": "Driver 4", "compound": TireCompound.MEDIUM, "stops": 2},
    {"name": "Driver 5", "compound": TireCompound.HARD, "stops": 1},
]

print("👥 Grid Setup:")
for i, config in enumerate(drivers_config, 1):
    driver = RacingVehicle(
        model=sim,
        unique_id=f"car_{i}",
        name=config["name"],
        max_speed=200.0 + (i * 2),
        acceleration=14.0 + (i * 0.2),
        starting_compound=config["compound"],
        enable_tire_management=True,
        pit_stops_planned=config["stops"],
    )
    sim.add_agent(driver)
    
    print(
        f"   P{i}  {config['name']:12s} - {config['compound'].value:6s} tires, "
        f"{config['stops']}-stop strategy"
    )

print()

# 4. Run a quick simulation (first 5 laps)
print("=" * 70)
print("🚦 Racing! (Simulating first 5 laps for demo)")
print("=" * 70)
print()

sim.start_race()

lap_displayed = 0
max_laps_to_simulate = 5

while sim.running:
    sim.step()
    
    if sim.agents_list:
        leader = max(sim.agents_list, key=lambda a: a.lap)
        
        if leader.lap > lap_displayed and leader.lap <= max_laps_to_simulate:
            lap_displayed = leader.lap
            print(f"\n⏱️  LAP {lap_displayed}/{max_laps_to_simulate}")
            print("-" * 70)
            
            standings = sim.get_current_standings()
            for pos, data in enumerate(standings, 1):
                agent = next(a for a in sim.agents_list if a.name == data["name"])
                
                tire_info = "N/A"
                if hasattr(agent, "current_tires") and agent.current_tires:
                    t = agent.current_tires
                    tire_info = f"{t.compound.value} {t.laps_used}L {t.wear_percentage:.0f}%"
                
                print(
                    f"   P{pos}  {agent.name:12s} | Lap {agent.lap} | "
                    f"Speed: {agent.speed:5.1f} km/h | Tires: {tire_info}"
                )
        
        if leader.lap >= max_laps_to_simulate:
            sim.running = False

print()
print("=" * 70)
print("Demo complete! ✓")
print("=" * 70)
print()

# 5. Show tire degradation details
print("🛞 Tire Degradation Details:")
print("-" * 70)
for agent in sim.agents_list:
    if hasattr(agent, "current_tires") and agent.current_tires:
        tires = agent.current_tires
        state = tires.get_state()
        print(f"\n{agent.name}:")
        print(f"   Compound: {state['compound']}")
        print(f"   Laps Used: {state['laps_used']}")
        print(f"   Wear: {state['wear_percentage']:.1f}%")
        print(f"   Temperature: {state['temperature']:.1f}°C")
        print(f"   Grip Level: {state['grip_level']:.2f}")
        print(f"   Needs Change: {'⚠️  YES' if state['needs_replacement'] else '✓ OK'}")

print()
print("=" * 70)
print("🎓 Next Steps:")
print("=" * 70)
print()
print("1. Run full Monaco GP:")
print("   uv run python examples/monaco_gp_2025.py")
print()
print("2. Start web visualization:")
print("   uv run python run_visualization.py")
print("   Then open http://localhost:8000")
print()
print("3. Explore OpenF1 API data:")
print("   from shifters.data import OpenF1Client")
print("   client = OpenF1Client()")
print("   strategy = client.analyze_circuit_strategy('Monaco', 2024)")
print()
print("4. Read full documentation:")
print("   See RACING_FEATURES.md for complete guide")
print()
print("=" * 70)
print("Happy Racing! 🏁")
print("=" * 70)
