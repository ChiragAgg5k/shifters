"""Test loading F1 circuits from the FeatureCollection file."""

from shifters import GeoJSONTrackParser

# Path to the F1 circuits file
circuits_file = "data/circuits/f1-circuits.geojson"

# List all available circuits
print("=" * 80)
print("AVAILABLE F1 CIRCUITS")
print("=" * 80)

with open(circuits_file, "r") as f:
    import json

    geojson_data = json.load(f)

circuits = GeoJSONTrackParser.list_circuits_in_collection(geojson_data)

for i, circuit in enumerate(circuits, 1):
    print(f"\n{i}. {circuit['name']}")
    print(f"   ID: {circuit['id']}")
    print(f"   Location: {circuit['location']}")
    print(f"   Length: {circuit['length']}m")
    print(f"   Altitude: {circuit['altitude']}m")
    print(f"   Opened: {circuit['opened']}")
    print(f"   First GP: {circuit['firstgp']}")

print("\n" + "=" * 80)
print("LOADING SPECIFIC CIRCUITS")
print("=" * 80)

# Test loading a few specific circuits
test_circuits = [
    ("mc-1929", "Circuit de Monaco"),
    ("gb-1948", "Silverstone Circuit"),
    ("it-1922", "Autodromo Nazionale Monza"),
]

for circuit_id, expected_name in test_circuits:
    print(f"\nLoading: {expected_name} ({circuit_id})")
    try:
        track = GeoJSONTrackParser.from_feature_collection_file(
            circuits_file, circuit_id=circuit_id, num_laps=10
        )

        print(f"  ✓ Successfully loaded!")
        print(f"  ✓ Track name: {track.name}")
        print(f"  ✓ Length: {track.length:.2f}m ({track.length/1000:.2f}km)")
        print(f"  ✓ Segments: {len(track.segments)}")

        # Count corners
        corners = sum(
            1
            for seg in track.segments
            if seg.segment_type in ["left_turn", "right_turn"]
        )
        print(f"  ✓ Corners: {corners}")

    except Exception as e:
        print(f"  ✗ Failed: {e}")

print("\n" + "=" * 80)
print("LOADING ALL CIRCUITS")
print("=" * 80)

print("\nAttempting to load all circuits...")
all_tracks = GeoJSONTrackParser.load_all_circuits(circuits_file, num_laps=10)

print(f"\n✓ Successfully loaded {len(all_tracks)}/{len(circuits)} circuits")

# Display summary statistics
print("\n" + "=" * 80)
print("CIRCUIT STATISTICS")
print("=" * 80)

for circuit_id, track in sorted(all_tracks.items()):
    corners = sum(
        1 for seg in track.segments if seg.segment_type in ["left_turn", "right_turn"]
    )
    print(f"\n{track.name}:")
    print(f"  Length: {track.length/1000:.3f}km")
    print(f"  Segments: {len(track.segments)}")
    print(f"  Corners: {corners}")

print("\n" + "=" * 80)
print("TEST COMPLETE")
print("=" * 80)
