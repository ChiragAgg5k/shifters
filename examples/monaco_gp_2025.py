"""
Example: F1 2025 Monaco Grand Prix Simulation with Tire Management

This example demonstrates the enhanced F1 simulation features:
- Real tire compound management (SOFT, MEDIUM, HARD)
- Tire degradation and temperature modeling
- Strategic pit stops
- Official F1 2025 race distance (78 laps at Monaco)
"""

from shifters.agents.base_agent import RacingVehicle
from shifters.environment.geojson_parser import GeoJSONTrackParser
from shifters.simcore.simulator import MobilitySimulation
from shifters.racing import TireCompound, TireSet
from pathlib import Path

# Load Monaco circuit with real 2025 race distance
circuits_file = Path(__file__).parent.parent / "data" / "circuits" / "f1-circuits.geojson"

print("=" * 60)
print("🏎️  F1 2025 MONACO GRAND PRIX SIMULATION")
print("=" * 60)
print()

# Load Monaco circuit (78 laps as per F1 2025 calendar)
track = GeoJSONTrackParser.from_feature_collection_file(
    str(circuits_file),
    circuit_id="mc-1929",  # Monaco
    num_laps=78,  # F1 2025 Monaco GP race distance
)

print(f"🏁 Circuit: {track.name}")
print(f"📏 Length: {track.length:.0f}m ({track.length/1000:.3f}km)")
print(f"🔄 Laps: {track.num_laps}")
print(f"📍 Total Distance: {track.length * track.num_laps / 1000:.1f}km")
print(f"🌀 Corners: {track.get_info().get('corners', 'N/A')}")
print()

# Create simulation with realistic time step
sim = MobilitySimulation(track=track, time_step=0.1)

# Create F1 drivers with different strategies
drivers = [
    {
        "name": "Max Verstappen",
        "number": 1,
        "compound": TireCompound.MEDIUM,
        "pit_stops": 2,
        "skill": 1.2,
    },
    {
        "name": "Charles Leclerc",
        "number": 16,
        "compound": TireCompound.SOFT,
        "pit_stops": 2,
        "skill": 1.15,
    },
    {
        "name": "Lewis Hamilton",
        "number": 44,
        "compound": TireCompound.MEDIUM,
        "pit_stops": 1,
        "skill": 1.18,
    },
    {
        "name": "Lando Norris",
        "number": 4,
        "compound": TireCompound.SOFT,
        "pit_stops": 2,
        "skill": 1.12,
    },
    {
        "name": "Oscar Piastri",
        "number": 81,
        "compound": TireCompound.HARD,
        "pit_stops": 1,
        "skill": 1.1,
    },
]

print("👥 Drivers:")
for driver in drivers:
    vehicle = RacingVehicle(
        model=sim,
        unique_id=f"car_{driver['number']}",
        name=f"{driver['name']} (#{driver['number']})",
        max_speed=200.0,
        acceleration=15.0,
        cornering_skill=driver["skill"],
        starting_compound=driver["compound"],
        enable_tire_management=True,
        pit_stops_planned=driver["pit_stops"],
    )
    sim.add_agent(vehicle)
    
    strategy = "aggressive" if driver["pit_stops"] >= 2 else "conservative"
    print(
        f"   #{driver['number']:2d} {driver['name']:20s} - "
        f"Starting: {driver['compound'].value:6s} | "
        f"Strategy: {strategy} ({driver['pit_stops']} stop{'s' if driver['pit_stops'] > 1 else ''})"
    )

print()
print("=" * 60)
print("🚦 LIGHTS OUT AND AWAY WE GO!")
print("=" * 60)

# Start the race
sim.start_race()

# Display updates every 10 laps
last_displayed_lap = 0

while sim.running:
    sim.step()
    
    # Get leader's lap
    if sim.agents_list:
        leader_lap = max(agent.lap for agent in sim.agents_list)
        
        # Display update every 10 laps
        if leader_lap > 0 and leader_lap % 10 == 0 and leader_lap != last_displayed_lap:
            last_displayed_lap = leader_lap
            print(f"\n📍 LAP {leader_lap}/{track.num_laps}")
            print("-" * 60)
            
            standings = sim.get_current_standings()
            for i, agent_data in enumerate(standings[:5], 1):
                agent = next(a for a in sim.agents_list if a.name == agent_data["name"])
                
                # Get tire info
                tire_info = "N/A"
                if hasattr(agent, "current_tires") and agent.current_tires:
                    tire = agent.current_tires
                    tire_info = f"{tire.compound.value:6s} {tire.laps_used:2d}L {tire.wear_percentage:5.1f}%"
                
                # Pit stop info
                pit_info = f"{agent.pit_stops} stops" if agent.pit_stops > 0 else "no stops"
                
                # In pit lane?
                in_pit = ""
                if hasattr(agent, "pit_strategy") and agent.pit_strategy:
                    if agent.pit_strategy.in_pit_lane:
                        in_pit = " [IN PIT]"
                
                print(
                    f"   P{i}  {agent.name:25s} | Lap {agent.lap:2d} | "
                    f"Tires: {tire_info} | {pit_info}{in_pit}"
                )

print()
print("=" * 60)
print("🏁 RACE COMPLETE!")
print("=" * 60)

# Final standings
standings = sim.get_current_standings()
print(f"\n📊 Final Results - {track.name}")
print("-" * 60)

for i, agent_data in enumerate(standings, 1):
    agent = next(a for a in sim.agents_list if a.name == agent_data["name"])
    
    # Calculate race time
    total_time = agent.total_time
    minutes = int(total_time // 60)
    seconds = total_time % 60
    
    # Tire strategy summary
    pit_summary = f"{agent.pit_stops} pit stop{'s' if agent.pit_stops != 1 else ''}"
    
    # Time behind leader
    if i == 1:
        gap = "WINNER"
    else:
        gap_seconds = total_time - standings[0]["total_time"]
        if gap_seconds < 60:
            gap = f"+{gap_seconds:.3f}s"
        else:
            gap = f"+{int(gap_seconds // 60)}:{gap_seconds % 60:06.3f}"
    
    print(
        f"   P{i}  {agent.name:25s} | {minutes}:{seconds:06.3f} | "
        f"{gap:12s} | {pit_summary}"
    )

# Race statistics
print()
print("📈 Race Statistics:")
print("-" * 60)
print(f"   Total Laps: {track.num_laps}")
print(f"   Race Distance: {track.length * track.num_laps / 1000:.3f}km")
print(f"   Total Pit Stops: {sum(agent.pit_stops for agent in sim.agents_list)}")
print(f"   Simulation Steps: {sim.current_step}")
print(f"   Simulation Time: {sim.simulation_time:.1f}s")

# Tire usage analysis
print()
print("🛞 Tire Compound Usage:")
from collections import Counter

tire_usage = Counter()
for agent in sim.agents_list:
    if hasattr(agent, "current_tires") and agent.current_tires:
        tire_usage[agent.current_tires.compound.value] += 1
    if hasattr(agent, "tire_history"):
        for tire in agent.tire_history:
            tire_usage[tire["compound"]] += 1

for compound, count in tire_usage.most_common():
    print(f"   {compound:10s}: {count} stints")

print()
print("=" * 60)
