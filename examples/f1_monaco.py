"""Example: Racing simulation on Monaco Grand Prix circuit with 3D geometry."""

from shifters import MobilitySimulation, RacingVehicle, F1TrackLibrary

# Load the Monaco circuit (real F1 track with elevation, banking, curves)
track = F1TrackLibrary.monaco()

print("=" * 80)
print(f"🏎️  F1 Simulation: {track.name}")
print("=" * 80)

# Display track information
info = track.get_info()
print(f"\nTrack Length: {info['length']:.0f}m ({info['length']/1000:.2f}km)")
print(f"Laps: {info['num_laps']}")
print(f"Total Race Distance: {info['total_distance']/1000:.1f}km")
print(f"Segments: {info['num_segments']}")
print(f"Corners: {info['corners']}")
print(f"Straights: {info['straights']}")
print(f"Elevation Gain: {info['elevation_gain']:.1f}m")
print(f"Elevation Loss: {info['elevation_loss']:.1f}m")
print(f"Max Banking: {info['max_banking']:.1f}°")

# Create simulation
sim = MobilitySimulation(track=track, time_step=0.1)

# Create F1 drivers with varied characteristics
f1_drivers = [
    {
        "name": "Max Verstappen",
        "max_speed": 95,
        "acceleration": 18,
        "cornering_skill": 1.15,
        "braking_rate": 30,
    },
    {
        "name": "Lewis Hamilton",
        "max_speed": 94,
        "acceleration": 17.5,
        "cornering_skill": 1.12,
        "braking_rate": 29,
    },
    {
        "name": "Charles Leclerc",
        "max_speed": 93,
        "acceleration": 17.8,
        "cornering_skill": 1.10,
        "braking_rate": 28,
    },
    {
        "name": "Lando Norris",
        "max_speed": 92,
        "acceleration": 17.2,
        "cornering_skill": 1.08,
        "braking_rate": 27,
    },
    {
        "name": "Fernando Alonso",
        "max_speed": 91,
        "acceleration": 16.8,
        "cornering_skill": 1.13,
        "braking_rate": 28,
    },
    {
        "name": "Carlos Sainz",
        "max_speed": 92,
        "acceleration": 17.0,
        "cornering_skill": 1.07,
        "braking_rate": 27,
    },
    {
        "name": "George Russell",
        "max_speed": 91,
        "acceleration": 17.3,
        "cornering_skill": 1.09,
        "braking_rate": 28,
    },
    {
        "name": "Sergio Perez",
        "max_speed": 90,
        "acceleration": 17.0,
        "cornering_skill": 1.05,
        "braking_rate": 26,
    },
]

print(
    f"\n{'Driver':<20} {'Max Speed':<12} {'Accel':<10} {'Cornering':<12} {'Braking':<10}"
)
print("-" * 80)

for i, driver in enumerate(f1_drivers):
    vehicle = RacingVehicle(
        model=sim,
        unique_id=f"f1_{i}",
        name=driver["name"],
        max_speed=driver["max_speed"],
        acceleration=driver["acceleration"],
        cornering_skill=driver["cornering_skill"],
        braking_rate=driver["braking_rate"],
    )
    sim.add_agent(vehicle)
    print(
        f"{driver['name']:<20} {driver['max_speed']:<12} {driver['acceleration']:<10.1f} "
        f"{driver['cornering_skill']:<12.2f} {driver['braking_rate']:<10.1f}"
    )


# Register event callbacks
def on_lap_complete(agent, lap, lap_time):
    minutes = int(lap_time // 60)
    seconds = lap_time % 60
    print(f"🏁 {agent.name} - Lap {lap}: {minutes}:{seconds:05.2f}")


def on_agent_finish(agent, position):
    minutes = int(agent.total_time // 60)
    seconds = agent.total_time % 60
    print(f"🏆 P{position} - {agent.name} - Total: {minutes}:{seconds:05.2f}")


sim.register_event_callback("lap_complete", on_lap_complete)
sim.register_event_callback("agent_finish", on_agent_finish)

# Run the race
print("\n" + "=" * 80)
print("🚦 LIGHTS OUT AND AWAY WE GO!")
print("=" * 80 + "\n")

sim.run(verbose=True)

# Final results
print("\n" + "=" * 80)
print("FINAL CLASSIFICATION - MONACO GRAND PRIX")
print("=" * 80)
sim.leaderboard.print_leaderboard()

# Get detailed statistics
print("\n" + "=" * 80)
print("RACE STATISTICS")
print("=" * 80)

finished = sim.leaderboard.get_finished_agents()
if finished:
    winner = finished[0]
    print(f"\n🥇 WINNER: {winner['name']}")
    print(f"   Total Time: {winner['total_time']:.2f}s")
    if winner.get("agent"):
        state = winner["agent"].get_state()
        print(f"   Final Energy: {state.get('energy', 'N/A')}%")
        print(f"   Tire Wear: {state.get('tire_wear', 'N/A')}%")
        print(f"   Pit Stops: {state.get('pit_stops', 'N/A')}")

    # Show podium
    print("\n🏆 PODIUM:")
    for i, agent_data in enumerate(finished[:3], 1):
        medal = ["🥇", "🥈", "🥉"][i - 1]
        gap = agent_data["total_time"] - winner["total_time"] if i > 1 else 0
        gap_str = f"+{gap:.2f}s" if gap > 0 else "Winner"
        print(f"   {medal} P{i}: {agent_data['name']:<20} {gap_str}")

print("\n" + "=" * 80)
print(f"Race completed in {sim.current_step} simulation steps")
print(
    f"Simulated time: {sim.simulation_time:.2f}s ({sim.simulation_time/60:.1f} minutes)"
)
print("=" * 80)
