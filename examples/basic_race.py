"""Basic example of running a mobility simulation."""

from shifters import MobilitySimulation, Track, RacingVehicle

# Create a track
track = Track(
    length=2000.0, num_laps=5, track_type="circuit", name="Example Circuit"  # 2km track
)

# Add checkpoints
track.add_checkpoint("turn1", 500, "Turn 1")
track.add_checkpoint("turn2", 1000, "Turn 2")
track.add_checkpoint("turn3", 1500, "Turn 3")

# Create simulation
sim = MobilitySimulation(track=track, time_step=0.1)

# Add racing vehicles
vehicle_configs = [
    {"name": "Red Bull", "max_speed": 220, "acceleration": 18},
    {"name": "Mercedes", "max_speed": 215, "acceleration": 17},
    {"name": "Ferrari", "max_speed": 218, "acceleration": 16},
]

for i, config in enumerate(vehicle_configs):
    vehicle = RacingVehicle(model=sim, unique_id=f"car_{i}", **config)
    sim.add_agent(vehicle)


# Register event callbacks
def on_lap_complete(agent, lap, lap_time):
    print(f"🏁 {agent.name} completed lap {lap} in {lap_time:.2f}s")


def on_agent_finish(agent, position):
    print(f"🏆 {agent.name} finished P{position} - Total time: {agent.total_time:.2f}s")


sim.register_event_callback("lap_complete", on_lap_complete)
sim.register_event_callback("agent_finish", on_agent_finish)

# Run the simulation
print("Starting race simulation...")
print(f"Track: {track.name} - {track.length}m x {track.num_laps} laps\n")

sim.run(verbose=False)

# Display final results
print("\n" + "=" * 60)
print("FINAL STANDINGS")
print("=" * 60)
sim.leaderboard.print_leaderboard()

# Get simulation data
state = sim.get_simulation_state()
print(f"\nSimulation completed in {state['time']}s ({state['step']} steps)")
