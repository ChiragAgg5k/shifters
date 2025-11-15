"""
Example: Using F1 Circuits from the FeatureCollection

Demonstrates:
1. Listing available circuits
2. Loading specific circuits by ID or name
3. Running simulations on different tracks
4. Comparing track characteristics
"""

from shifters import (
    GeoJSONTrackParser,
    RacingVehicle,
    MobilitySimulation,
)

# Path to the F1 circuits file
CIRCUITS_FILE = "data/circuits/f1-circuits.geojson"

print("=" * 80)
print("F1 CIRCUIT COLLECTION - USAGE EXAMPLES")
print("=" * 80)

# Example 1: List all available circuits
print("\n1. LISTING AVAILABLE CIRCUITS")
print("-" * 80)

with open(CIRCUITS_FILE, "r") as f:
    import json
    geojson_data = json.load(f)

circuits = GeoJSONTrackParser.list_circuits_in_collection(geojson_data)
print(f"\nFound {len(circuits)} F1 circuits:")
for circuit in circuits[:5]:  # Show first 5
    print(f"  • {circuit['name']} ({circuit['id']}) - {circuit['location']}")
print(f"  ... and {len(circuits) - 5} more")

# Example 2: Load specific circuit by ID
print("\n\n2. LOADING CIRCUIT BY ID")
print("-" * 80)

monaco = GeoJSONTrackParser.from_feature_collection_file(
    CIRCUITS_FILE,
    circuit_id="mc-1929",  # Monaco GP
    num_laps=78  # Actual Monaco GP lap count
)

print(f"\nLoaded: {monaco.name}")
print(f"  Length: {monaco.length/1000:.2f}km")
print(f"  Total distance: {monaco.length * monaco.num_laps / 1000:.2f}km ({monaco.num_laps} laps)")
print(f"  Segments: {len(monaco.segments)}")

# Example 3: Load circuit by name
print("\n\n3. LOADING CIRCUIT BY NAME")
print("-" * 80)

spa = GeoJSONTrackParser.from_feature_collection_file(
    CIRCUITS_FILE,
    circuit_name="Circuit de Spa-Francorchamps",
    num_laps=44  # Actual Spa GP lap count
)

print(f"\nLoaded: {spa.name}")
print(f"  Length: {spa.length/1000:.2f}km")
print(f"  Total distance: {spa.length * spa.num_laps / 1000:.2f}km ({spa.num_laps} laps)")
print(f"  Segments: {len(spa.segments)}")

# Example 4: Analyze Monaco GP track
print("\n\n4. TRACK ANALYSIS - MONACO GP")
print("-" * 80)

monaco_short = GeoJSONTrackParser.from_feature_collection_file(
    CIRCUITS_FILE, circuit_id="mc-1929", num_laps=1
)

# Count different segment types
left_turns = sum(1 for seg in monaco_short.segments if seg.segment_type == "left_turn")
right_turns = sum(1 for seg in monaco_short.segments if seg.segment_type == "right_turn")
straights = sum(1 for seg in monaco_short.segments if seg.segment_type == "straight")

print(f"\n{monaco_short.name} Track Breakdown:")
print(f"  Total segments: {len(monaco_short.segments)}")
print(f"  Left turns: {left_turns}")
print(f"  Right turns: {right_turns}")
print(f"  Straight sections: {straights}")

# Find tightest corners
tight_corners = sorted(
    [seg for seg in monaco_short.segments if seg.curvature > 0],
    key=lambda s: s.curvature
)[:3]

print(f"\n  Tightest 3 Corners:")
for i, seg in enumerate(tight_corners, 1):
    direction = "Left" if seg.segment_type == "left_turn" else "Right"
    max_speed = seg.get_recommended_speed(base_speed=100.0)  # 100 m/s base speed
    print(f"    {i}. {direction} - Radius: {seg.curvature:.1f}m, "
          f"Max speed: {max_speed:.1f} m/s ({max_speed * 3.6:.1f} km/h)")

# Calculate average lap time estimate
total_time = 0
base_speed = 100.0  # m/s
for seg in monaco_short.segments:
    max_speed = seg.get_recommended_speed(base_speed=base_speed)
    if max_speed > 0:
        time = seg.length / max_speed
        total_time += time

print(f"\n  Estimated lap time (at speed limits): {total_time:.1f}s ({total_time/60:.2f} minutes)")

# Example 5: Compare different circuits
print("\n\n5. CIRCUIT COMPARISON")
print("-" * 80)

comparison_circuits = [
    ("mc-1929", "Circuit de Monaco"),
    ("be-1925", "Circuit de Spa-Francorchamps"),
    ("it-1922", "Autodromo Nazionale Monza"),
    ("us-2012", "Circuit of the Americas"),
]

print(f"\n{'Circuit':<40} {'Length':<12} {'Segments':<10} {'Corners':<10}")
print("-" * 80)

for circuit_id, circuit_name in comparison_circuits:
    track = GeoJSONTrackParser.from_feature_collection_file(
        CIRCUITS_FILE,
        circuit_id=circuit_id,
        num_laps=1
    )
    
    corners = sum(1 for seg in track.segments if seg.segment_type in ["left_turn", "right_turn"])
    straights = sum(1 for seg in track.segments if seg.segment_type == "straight")
    
    print(f"{track.name:<40} "
          f"{track.length/1000:.2f}km{'':<5} "
          f"{len(track.segments):<10} "
          f"{corners:<10}")

# Example 6: Track profile analysis
print("\n\n6. DETAILED TRACK PROFILE - SPA-FRANCORCHAMPS")
print("-" * 80)

# Get detailed segment information
corner_segments = [seg for seg in spa.segments if seg.segment_type in ["left_turn", "right_turn"]]
straight_segments = [seg for seg in spa.segments if seg.segment_type == "straight"]

# Find tightest corners (smallest radius)
tight_corners = sorted(
    [seg for seg in corner_segments if seg.curvature > 0],
    key=lambda s: s.curvature
)[:5]

print(f"\nTop 5 Tightest Corners:")
for i, seg in enumerate(tight_corners, 1):
    direction = "Left" if seg.segment_type == "left_turn" else "Right"
    max_speed = seg.get_recommended_speed(base_speed=100.0)
    print(f"  {i}. {direction} turn - Radius: {seg.curvature:.1f}m, "
          f"Recommended speed: {max_speed:.1f} m/s")

# Find longest straights
long_straights = sorted(straight_segments, key=lambda s: s.length, reverse=True)[:3]

print(f"\nTop 3 Longest Straights:")
for i, seg in enumerate(long_straights, 1):
    print(f"  {i}. {seg.length:.1f}m")

# Calculate elevation changes
elevation_gain = sum(seg.elevation_change for seg in spa.segments if seg.elevation_change > 0)
elevation_loss = sum(abs(seg.elevation_change) for seg in spa.segments if seg.elevation_change < 0)

print(f"\nElevation Profile:")
print(f"  Total climb: {elevation_gain:.1f}m")
print(f"  Total descent: {elevation_loss:.1f}m")

print("\n" + "=" * 80)
print("USAGE GUIDE")
print("=" * 80)
print("""
To use any F1 circuit in your simulations:

1. Load by ID:
   track = GeoJSONTrackParser.from_feature_collection_file(
       "data/circuits/f1-circuits.geojson",
       circuit_id="mc-1929"  # See list_circuits_in_collection for IDs
   )

2. Load by name:
   track = GeoJSONTrackParser.from_feature_collection_file(
       "data/circuits/f1-circuits.geojson",
       circuit_name="Circuit de Monaco"
   )

3. Load all circuits:
   all_tracks = GeoJSONTrackParser.load_all_circuits(
       "data/circuits/f1-circuits.geojson"
   )
   monaco = all_tracks["mc-1929"]

Available circuits include:
  - All current F1 calendar circuits (2024)
  - Historic circuits (Indianapolis, Imola, etc.)
  - Future circuits (Las Vegas 2023, Madrid 2026)
  - Total: 40 real F1 circuits
""")

print("\n" + "=" * 80)
