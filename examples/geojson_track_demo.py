"""Example: Load and simulate F1 tracks from GeoJSON data."""

from shifters import (
    MobilitySimulation,
    RacingVehicle,
    GeoJSONTrackParser,
)
import os

print("=" * 100)
print("F1 CIRCUIT SIMULATION FROM GEOJSON DATA")
print("=" * 100)

# Get the data directory
data_dir = os.path.join(os.path.dirname(__file__), "..", "data", "circuits")

# Load Monaco circuit from GeoJSON
monaco_path = os.path.join(data_dir, "monaco.geojson")
if os.path.exists(monaco_path):
    print("\n📍 Loading Monaco Grand Prix Circuit from GeoJSON...")
    monaco = GeoJSONTrackParser.from_geojson_file(
        monaco_path,
        track_name="Circuit de Monaco",
        num_laps=5,  # Short demo
        track_width=12.0,
    )

    # Add sector checkpoints
    GeoJSONTrackParser.add_checkpoints_by_percentage(
        monaco,
        [
            (33.3, "Sector 1"),
            (66.6, "Sector 2"),
        ],
    )

    print(f"✓ Track loaded: {monaco.name}")
    info = monaco.get_info()
    print(f"  Length: {info['length']:.0f}m ({info['length']/1000:.3f}km)")
    print(f"  Segments: {info['num_segments']}")
    print(f"  Corners: {info.get('corners', 'N/A')}")
    print(f"  Straights: {info.get('straights', 'N/A')}")
    if info.get('elevation_gain'):
        print(f"  Elevation Gain: {info['elevation_gain']:.1f}m")
        print(f"  Elevation Loss: {info['elevation_loss']:.1f}m")

    # Analyze track segments
    print("\n  Track Profile (first 10 segments):")
    print(f"  {'Segment':<12} {'Type':<15} {'Length (m)':<12} {'Curvature (m)':<15}")
    print("  " + "-" * 70)
    for i, seg in enumerate(monaco.segments[:10]):
        seg_dict = seg.to_dict()
        print(
            f"  {seg_dict['id']:<12} "
            f"{seg_dict['type']:<15} "
            f"{seg_dict['length']:<12.1f} "
            f"{seg_dict['curvature']:<15.1f}"
        )

    # Create simulation
    print("\n🏎️  Setting up race simulation...")
    sim = MobilitySimulation(track=monaco, time_step=0.1)

    # Add F1 drivers
    drivers = [
        {"name": "Max Verstappen", "max_speed": 95, "cornering": 1.15},
        {"name": "Lewis Hamilton", "max_speed": 94, "cornering": 1.12},
        {"name": "Charles Leclerc", "max_speed": 93, "cornering": 1.10},
        {"name": "Lando Norris", "max_speed": 92, "cornering": 1.08},
    ]

    for i, driver in enumerate(drivers):
        vehicle = RacingVehicle(
            model=sim,
            unique_id=f"f1_{i}",
            name=driver["name"],
            max_speed=driver["max_speed"],
            acceleration=18.0,
            cornering_skill=driver["cornering"],
            braking_rate=28.0,
        )
        sim.add_agent(vehicle)
        print(f"  ✓ {driver['name']} - Max Speed: {driver['max_speed']}m/s")

    # Run simulation
    print("\n" + "=" * 100)
    print("🚦 LIGHTS OUT AND AWAY WE GO!")
    print("=" * 100 + "\n")

    sim.run(verbose=False)

    # Results
    print("\n" + "=" * 100)
    print("FINAL RESULTS - MONACO GRAND PRIX")
    print("=" * 100)
    sim.leaderboard.print_leaderboard()

    finished = sim.leaderboard.get_finished_agents()
    if finished:
        winner = finished[0]
        print(f"\n🏆 Winner: {winner['name']}")
        print(f"   Total Time: {winner['total_time']:.2f}s")
        print(f"   Average Lap: {winner['total_time']/monaco.num_laps:.2f}s")

else:
    print(f"\n⚠️  Monaco GeoJSON file not found at: {monaco_path}")

# Load Silverstone circuit
print("\n" + "=" * 100)
silverstone_path = os.path.join(data_dir, "silverstone.geojson")
if os.path.exists(silverstone_path):
    print("\n📍 Loading Silverstone Circuit from GeoJSON...")
    silverstone = GeoJSONTrackParser.from_geojson_file(
        silverstone_path,
        track_name="Silverstone Circuit",
        num_laps=3,
        track_width=15.0,  # Wider track
    )

    # Add checkpoints
    GeoJSONTrackParser.add_checkpoints_by_percentage(
        silverstone,
        [
            (25.0, "Maggotts-Becketts"),
            (50.0, "Stowe"),
            (75.0, "Vale"),
        ],
    )

    print(f"✓ Track loaded: {silverstone.name}")
    info = silverstone.get_info()
    print(f"  Length: {info['length']:.0f}m ({info['length']/1000:.3f}km)")
    print(f"  Segments: {info['num_segments']}")
    print(f"  Corners: {info.get('corners', 'N/A')}")

    # Quick race
    print("\n🏎️  Running quick race at Silverstone...")
    sim2 = MobilitySimulation(track=silverstone, time_step=0.1)

    for i in range(3):
        vehicle = RacingVehicle(
            model=sim2,
            unique_id=f"car_{i}",
            name=f"Driver {i+1}",
            max_speed=95.0,
            acceleration=18.0,
            cornering_skill=1.1,
            braking_rate=28.0,
        )
        sim2.add_agent(vehicle)

    sim2.run(verbose=False)

    finished2 = sim2.leaderboard.get_finished_agents()
    if finished2:
        winner2 = finished2[0]
        print(f"  ✓ Winner: {winner2['name']} - Time: {winner2['total_time']:.2f}s")

else:
    print(f"\n⚠️  Silverstone GeoJSON file not found at: {silverstone_path}")

# Demonstrate creating track from raw GeoJSON
print("\n" + "=" * 100)
print("CUSTOM GEOJSON TRACK EXAMPLE")
print("=" * 100)

# Example GeoJSON for a simple test track
custom_geojson = {
    "type": "Feature",
    "properties": {"name": "Test Track"},
    "geometry": {
        "type": "LineString",
        "coordinates": [
            [0.0000, 0.0000, 0],
            [0.0010, 0.0000, 0],
            [0.0020, 0.0005, 2],
            [0.0025, 0.0015, 4],
            [0.0025, 0.0025, 6],
            [0.0020, 0.0035, 8],
            [0.0010, 0.0040, 8],
            [0.0000, 0.0040, 6],
            [-0.0010, 0.0035, 4],
            [-0.0015, 0.0025, 2],
            [-0.0015, 0.0015, 0],
            [-0.0010, 0.0005, 0],
            [0.0000, 0.0000, 0],
        ],
    },
}

print("\nCreating track from custom GeoJSON data...")
custom_track = GeoJSONTrackParser.from_geojson(
    custom_geojson,
    track_name="Custom Test Circuit",
    num_laps=10,
    track_width=10.0,
)

print(f"✓ Custom track created: {custom_track.name}")
print(f"  Length: {custom_track.length:.1f}m")
print(f"  Segments: {len(custom_track.segments)}")

# Show coordinate conversion
print("\n  Position to Coordinate mapping (every 100m):")
print(f"  {'Distance (m)':<15} {'X (m)':<15} {'Y (m)':<15} {'Z (m)':<15}")
print("  " + "-" * 60)
for dist in range(0, int(custom_track.length) + 1, max(1, int(custom_track.length / 5))):
    coords = custom_track.get_coordinates_at_position(dist)
    if coords:
        print(
            f"  {dist:<15.1f} {coords.x:<15.2f} {coords.y:<15.2f} {coords.z:<15.2f}"
        )

print("\n" + "=" * 100)
print("GEOJSON IMPORT COMPLETE!")
print("=" * 100)
print("\nYou can now:")
print("1. Place real F1 circuit GeoJSON files in data/circuits/")
print("2. Use GeoJSONTrackParser.from_geojson_file() to load them")
print("3. Run realistic simulations on actual track layouts")
print("4. Export track data with track.get_track_profile()")
print("=" * 100)
