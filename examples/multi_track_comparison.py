"""Example: Multi-track comparison - Monaco vs Spa vs Silverstone."""

from shifters import MobilitySimulation, RacingVehicle, F1TrackLibrary

# Load different circuits
circuits = {
    "Monaco": F1TrackLibrary.monaco(),
    "Spa-Francorchamps": F1TrackLibrary.spa_francorchamps(),
    "Silverstone": F1TrackLibrary.silverstone(),
    "Suzuka": F1TrackLibrary.suzuka(),
}

print("=" * 100)
print("F1 CIRCUIT COMPARISON")
print("=" * 100)

# Compare track characteristics
print(f"\n{'Circuit':<25} {'Length (km)':<15} {'Corners':<10} {'Elev Gain (m)':<15} {'Max Banking':<12}")
print("-" * 100)

for name, track in circuits.items():
    info = track.get_info()
    print(
        f"{name:<25} "
        f"{info['length']/1000:<15.3f} "
        f"{info.get('corners', 'N/A'):<10} "
        f"{info.get('elevation_gain', 0.0):<15.1f} "
        f"{info.get('max_banking', 0.0):<12.1f}"
    )

# Run quick simulation on each track
print("\n" + "=" * 100)
print("RACE SIMULATIONS (3 laps each)")
print("=" * 100)

# Create a standard F1 car profile
def create_f1_car(sim, car_id: int, name: str):
    return RacingVehicle(
        model=sim,
        unique_id=f"car_{car_id}",
        name=name,
        max_speed=95.0,
        acceleration=18.0,
        cornering_skill=1.1,
        braking_rate=28.0,
    )

results = {}

for circuit_name, track in circuits.items():
    print(f"\n{'='*100}")
    print(f"Circuit: {circuit_name}")
    print(f"{'='*100}")

    # Reduce laps for quick demo
    track.num_laps = 3

    sim = MobilitySimulation(track=track, time_step=0.1)

    # Add 3 cars
    for i in range(3):
        car = create_f1_car(sim, i, f"Driver {i+1}")
        sim.add_agent(car)

    # Run simulation
    sim.run(verbose=False)

    # Get winner
    finished = sim.leaderboard.get_finished_agents()
    if finished:
        winner = finished[0]
        avg_lap_time = winner['total_time'] / track.num_laps
        results[circuit_name] = {
            'winner_time': winner['total_time'],
            'avg_lap_time': avg_lap_time,
            'length': track.length,
            'simulation_steps': sim.current_step,
        }

        print(f"\n✓ Winner: {winner['name']}")
        print(f"  Total Time: {winner['total_time']:.2f}s")
        print(f"  Average Lap: {avg_lap_time:.2f}s")
        print(f"  Simulation Steps: {sim.current_step}")

# Final comparison
print("\n" + "=" * 100)
print("SUMMARY COMPARISON")
print("=" * 100)

print(f"\n{'Circuit':<25} {'Avg Lap Time':<20} {'Length/Lap Ratio':<20}")
print("-" * 100)

for circuit_name, data in results.items():
    lap_time = data['avg_lap_time']
    length = data['length']
    ratio = length / lap_time  # meters per second (average speed)

    print(
        f"{circuit_name:<25} "
        f"{lap_time:<20.2f} "
        f"{ratio:<20.1f} m/s ({ratio*3.6:.0f} km/h)"
    )

print("\n" + "=" * 100)
print("TRACK CHARACTERISTICS")
print("=" * 100)

# Which track is fastest/slowest
fastest = min(results.items(), key=lambda x: x[1]['avg_lap_time'])
slowest = max(results.items(), key=lambda x: x[1]['avg_lap_time'])

print(f"\n⚡ Fastest Circuit: {fastest[0]}")
print(f"   Average lap: {fastest[1]['avg_lap_time']:.2f}s")
print(f"   Track favors: High-speed corners and long straights")

print(f"\n🐌 Slowest Circuit: {slowest[0]}")
print(f"   Average lap: {slowest[1]['avg_lap_time']:.2f}s")
print(f"   Track favors: Technical precision and low-speed corners")

# Track difficulty analysis
print("\n" + "=" * 100)
print("DIFFICULTY FACTORS")
print("=" * 100)

for name, track in circuits.items():
    info = track.get_info()
    corners = info.get('corners', 0)
    elevation = info.get('elevation_gain', 0) + info.get('elevation_loss', 0)
    length = info['length']

    # Simple difficulty score
    corner_density = (corners / length) * 1000  # corners per km
    elevation_factor = elevation / length * 1000
    difficulty = corner_density * 2 + elevation_factor

    print(f"\n{name}:")
    print(f"  Corner Density: {corner_density:.2f} corners/km")
    print(f"  Elevation Factor: {elevation_factor:.2f} m/km")
    print(f"  Difficulty Score: {difficulty:.1f}")

print("\n" + "=" * 100)
print("Analysis complete! All circuits ready for simulation.")
print("=" * 100)
