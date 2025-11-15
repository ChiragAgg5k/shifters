"""Example: Spa-Francorchamps circuit demonstration with geometry analysis."""

from shifters import F1TrackLibrary, TrackBuilder, Point3D, TrackSegment

# Load Spa-Francorchamps circuit
spa = F1TrackLibrary.spa_francorchamps()

print("=" * 80)
print("CIRCUIT ANALYSIS: SPA-FRANCORCHAMPS")
print("=" * 80)

# Basic info
info = spa.get_info()
print(f"\nCircuit: {info['name']}")
print(f"Length: {info['length']/1000:.3f} km")
print(f"Segments: {info['num_segments']}")
print(f"Corners: {info['corners']}")
print(f"Straights: {info['straights']}")
print(f"Total Elevation Gain: {info['elevation_gain']:.1f}m")
print(f"Total Elevation Loss: {info['elevation_loss']:.1f}m")
print(f"Maximum Banking: {info['max_banking']:.1f}°")

# Analyze each segment
print("\n" + "=" * 80)
print("SEGMENT DETAILS")
print("=" * 80)
print(
    f"\n{'Segment':<30} {'Type':<12} {'Length':<10} {'Curve':<10} {'Banking':<10} {'Elevation':<12}"
)
print("-" * 80)

for segment in spa.segments:
    seg_info = segment.to_dict()
    print(
        f"{seg_info['name'] or seg_info['id']:<30} "
        f"{seg_info['type']:<12} "
        f"{seg_info['length']:<10.0f} "
        f"{seg_info['curvature']:<10.0f} "
        f"{seg_info['banking']:<10.1f} "
        f"{seg_info['elevation_change']:<12.1f}"
    )

# Famous corners analysis
print("\n" + "=" * 80)
print("FAMOUS CORNERS")
print("=" * 80)

famous_corners = [
    ("Eau Rouge", "Legendary uphill left-hander"),
    ("Raidillon", "Steep uphill right after Eau Rouge"),
    ("Pouhon", "Fast double-left corner"),
    ("Blanchimont", "High-speed left kink"),
]

for corner_name, description in famous_corners:
    corner_segment = next(
        (s for s in spa.segments if s.name and corner_name.lower() in s.name.lower()),
        None,
    )
    if corner_segment:
        print(f"\n{corner_name}:")
        print(f"  {description}")
        print(f"  Type: {corner_segment.segment_type}")
        print(f"  Length: {corner_segment.length:.0f}m")
        print(f"  Curvature radius: {corner_segment.curvature:.0f}m")
        print(f"  Elevation change: {corner_segment.elevation_change:+.1f}m")
        print(f"  Banking: {corner_segment.banking:+.1f}°")
        print(f"  Gradient: {corner_segment.get_gradient():+.1f}%")
        # Recommended speed for a car with max speed of 100 m/s
        rec_speed = corner_segment.get_recommended_speed(100.0)
        print(f"  Recommended speed: {rec_speed:.1f} m/s ({rec_speed*3.6:.0f} km/h)")

# Track profile at various points
print("\n" + "=" * 80)
print("TRACK PROFILE (Every 1000m)")
print("=" * 80)
print(f"\n{'Distance':<12} {'Elevation':<12} {'Banking':<12} {'Curvature':<12}")
print("-" * 80)

for distance in range(0, int(spa.length) + 1, 1000):
    elevation = spa.get_elevation_at_position(distance)
    banking = spa.get_banking_at_position(distance)
    curvature = spa.get_curvature_at_position(distance)
    coords = spa.get_coordinates_at_position(distance)

    print(
        f"{distance:<12.0f} "
        f"{elevation:<12.1f} "
        f"{banking:<12.1f} "
        f"{curvature:<12.0f}"
    )

# Checkpoints
print("\n" + "=" * 80)
print("CHECKPOINTS")
print("=" * 80)

for checkpoint in spa.checkpoints:
    print(f"\n{checkpoint.name or checkpoint.id}:")
    print(f"  Position: {checkpoint.position:.0f}m")
    if checkpoint.coordinates:
        print(
            f"  Coordinates: ({checkpoint.coordinates.x:.1f}, {checkpoint.coordinates.y:.1f}, {checkpoint.coordinates.z:.1f})"
        )

# Create custom track example
print("\n" + "=" * 80)
print("CUSTOM TRACK BUILDER EXAMPLE")
print("=" * 80)

builder = TrackBuilder()
custom_track = (
    builder.add_straight(500, name="Main Straight")
    .add_corner(80, 90, "right", banking=10, name="Turn 1")
    .add_straight(300, elevation_change=20, name="Uphill Section")
    .add_corner(60, 120, "left", banking=5, name="Hairpin")
    .add_straight(400, elevation_change=-20, name="Downhill")
    .add_corner(100, 90, "left", name="Final Corner")
    .build(name="Custom Test Track", num_laps=10)
)

print(f"\nCreated: {custom_track.name}")
print(f"Length: {custom_track.length:.0f}m")
print(f"Segments: {len(custom_track.segments)}")

# Show how to build an oval track
print("\n" + "=" * 80)
print("OVAL TRACK EXAMPLE (NASCAR-style)")
print("=" * 80)

oval = F1TrackLibrary.create_simple_oval(
    length=2500.0, width=18.0, banking=18.0  # 2.5km  # Wide track  # Heavy banking
)

oval_info = oval.get_info()
print(f"\nOval Circuit:")
print(f"  Length: {oval_info['length']:.0f}m")
print(f"  Banking in corners: {oval_info['max_banking']:.1f}°")
print(f"  Laps: {oval_info['num_laps']}")

print("\n" + "=" * 80)
print("Analysis complete!")
print("=" * 80)
