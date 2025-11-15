"""Track builder utilities for creating realistic racing circuits."""

from typing import List, Tuple, Optional
import math
from shifters.environment.track import Track, TrackSegment, Point3D, Checkpoint


class TrackBuilder:
    """
    Utility class for building complex track geometries.

    Provides methods to create tracks from waypoints, segments, or real-world data.
    """

    def __init__(self):
        """Initialize track builder."""
        self.segments: List[TrackSegment] = []
        self.current_position = Point3D(0.0, 0.0, 0.0)
        self.current_heading = 0.0  # Radians
        self.segment_counter = 0

    def reset(self):
        """Reset builder state."""
        self.segments = []
        self.current_position = Point3D(0.0, 0.0, 0.0)
        self.current_heading = 0.0
        self.segment_counter = 0

    def add_straight(
        self,
        length: float,
        elevation_change: float = 0.0,
        banking: float = 0.0,
        width: float = 12.0,
        name: Optional[str] = None,
    ) -> "TrackBuilder":
        """
        Add a straight section.

        Args:
            length: Length of the straight in meters
            elevation_change: Height change over the straight
            banking: Banking angle in degrees
            width: Track width in meters
            name: Optional name for this segment

        Returns:
            Self for chaining
        """
        # Calculate end point based on current heading
        dx = length * math.cos(self.current_heading)
        dy = length * math.sin(self.current_heading)

        end_point = Point3D(
            self.current_position.x + dx,
            self.current_position.y + dy,
            self.current_position.z + elevation_change,
        )

        segment = TrackSegment(
            id=f"seg_{self.segment_counter}",
            start_point=self.current_position,
            end_point=end_point,
            segment_type="straight",
            length=length,
            curvature=0.0,
            banking=banking,
            elevation_change=elevation_change,
            width=width,
            name=name,
        )

        self.segments.append(segment)
        self.current_position = end_point
        self.segment_counter += 1

        return self

    def add_corner(
        self,
        radius: float,
        angle_degrees: float,
        direction: str = "left",
        elevation_change: float = 0.0,
        banking: float = 0.0,
        width: float = 12.0,
        name: Optional[str] = None,
    ) -> "TrackBuilder":
        """
        Add a corner section.

        Args:
            radius: Radius of the corner in meters
            angle_degrees: Angle to turn in degrees
            direction: "left" or "right"
            elevation_change: Height change through the corner
            banking: Banking angle in degrees
            width: Track width in meters
            name: Optional name for this corner

        Returns:
            Self for chaining
        """
        angle_rad = math.radians(angle_degrees)
        arc_length = radius * angle_rad

        # Determine turn direction
        turn_multiplier = 1 if direction == "left" else -1

        # Calculate the center of the turn circle
        center_offset_x = radius * math.cos(self.current_heading + turn_multiplier * math.pi / 2)
        center_offset_y = radius * math.sin(self.current_heading + turn_multiplier * math.pi / 2)

        # Calculate end point
        new_heading = self.current_heading + turn_multiplier * angle_rad
        end_offset_x = radius * math.cos(new_heading - turn_multiplier * math.pi / 2)
        end_offset_y = radius * math.sin(new_heading - turn_multiplier * math.pi / 2)

        center_x = self.current_position.x + center_offset_x
        center_y = self.current_position.y + center_offset_y

        end_point = Point3D(
            center_x + end_offset_x,
            center_y + end_offset_y,
            self.current_position.z + elevation_change,
        )

        segment_type = "left_turn" if direction == "left" else "right_turn"

        segment = TrackSegment(
            id=f"seg_{self.segment_counter}",
            start_point=self.current_position,
            end_point=end_point,
            segment_type=segment_type,
            length=arc_length,
            curvature=radius,
            banking=banking,
            elevation_change=elevation_change,
            width=width,
            name=name,
        )

        self.segments.append(segment)
        self.current_position = end_point
        self.current_heading = new_heading
        self.segment_counter += 1

        return self

    def add_chicane(
        self,
        length: float,
        severity: float = 30.0,
        elevation_change: float = 0.0,
        width: float = 12.0,
        name: Optional[str] = None,
    ) -> "TrackBuilder":
        """
        Add a chicane (quick left-right or right-left combination).

        Args:
            length: Total length of the chicane
            severity: How sharp the chicane is (degrees)
            elevation_change: Height change through chicane
            width: Track width
            name: Optional name

        Returns:
            Self for chaining
        """
        # Simplified chicane as two quick corners
        half_length = length / 2

        # First turn
        self.add_corner(
            radius=half_length / math.radians(severity),
            angle_degrees=severity,
            direction="left",
            elevation_change=elevation_change / 2,
            width=width,
            name=f"{name}_entry" if name else None,
        )

        # Second turn (opposite direction)
        self.add_corner(
            radius=half_length / math.radians(severity),
            angle_degrees=severity,
            direction="right",
            elevation_change=elevation_change / 2,
            width=width,
            name=f"{name}_exit" if name else None,
        )

        # Mark the last two segments as chicane
        if len(self.segments) >= 2:
            self.segments[-2].segment_type = "chicane"
            self.segments[-1].segment_type = "chicane"

        return self

    def build(
        self,
        name: str = "Custom Track",
        num_laps: int = 3,
        track_type: str = "circuit",
    ) -> Track:
        """
        Build the final Track object.

        Args:
            name: Track name
            num_laps: Number of laps for races
            track_type: "circuit" or "linear"

        Returns:
            Complete Track object
        """
        total_length = sum(seg.length for seg in self.segments)

        track = Track(
            length=total_length,
            num_laps=num_laps,
            track_type=track_type,
            name=name,
            segments=self.segments,
        )

        return track


class F1TrackLibrary:
    """Pre-built F1 and racing circuits based on real-world data."""

    @staticmethod
    def monaco() -> Track:
        """
        Circuit de Monaco (Monaco Grand Prix).

        Based on the real street circuit layout.
        Total length: ~3.337 km
        """
        builder = TrackBuilder()

        # Start/Finish straight and Sainte Devote
        builder.add_straight(170, name="Start/Finish Straight")
        builder.add_corner(25, 60, "right", banking=-2, name="Sainte Devote")

        # Beau Rivage and Massenet
        builder.add_straight(120, elevation_change=12, name="Beau Rivage")
        builder.add_corner(30, 75, "right", name="Massenet")

        # Casino Square and Mirabeau
        builder.add_corner(28, 90, "left", name="Casino Square")
        builder.add_straight(80, name="Casino to Mirabeau")
        builder.add_corner(20, 110, "right", banking=-5, name="Mirabeau Haute")

        # Loews Hairpin (tightest corner in F1)
        builder.add_corner(12, 180, "right", elevation_change=-8, name="Grand Hotel Hairpin")

        # Portier and Tunnel
        builder.add_corner(25, 85, "left", name="Portier")
        builder.add_straight(320, elevation_change=-15, name="Tunnel")

        # Nouvelle Chicane
        builder.add_chicane(90, severity=45, name="Nouvelle Chicane")

        # Tabac and Swimming Pool
        builder.add_corner(35, 70, "left", name="Tabac")
        builder.add_chicane(120, severity=40, name="Swimming Pool Complex")

        # Rascasse and Anthony Noghes
        builder.add_corner(18, 95, "left", name="La Rascasse")
        builder.add_corner(22, 80, "right", name="Anthony Noghes")

        # Final straight back to start
        builder.add_straight(150, name="Pit Straight")

        track = builder.build(name="Circuit de Monaco", num_laps=78)

        # Add sector checkpoints
        track.add_checkpoint("sector1", track.length * 0.33, "Sector 1")
        track.add_checkpoint("sector2", track.length * 0.66, "Sector 2")

        return track

    @staticmethod
    def spa_francorchamps() -> Track:
        """
        Circuit de Spa-Francorchamps (Belgian Grand Prix).

        Famous for Eau Rouge and high-speed sections.
        Total length: ~7.004 km
        """
        builder = TrackBuilder()

        # Start straight and La Source hairpin
        builder.add_straight(200, name="Start Straight")
        builder.add_corner(15, 180, "right", name="La Source")

        # Eau Rouge - Raidillon complex (iconic uphill section)
        builder.add_straight(180, name="Kemmel Straight Approach")
        builder.add_corner(200, 45, "left", elevation_change=35, banking=8, name="Eau Rouge")
        builder.add_corner(220, 35, "right", elevation_change=15, banking=5, name="Raidillon")

        # Kemmel Straight (longest straight in F1)
        builder.add_straight(750, name="Kemmel Straight")

        # Les Combes chicane
        builder.add_chicane(150, severity=50, elevation_change=-10, name="Les Combes")

        # Malmedy and Rivage
        builder.add_corner(40, 60, "left", name="Malmedy")
        builder.add_straight(200, elevation_change=-8, name="Malmedy Exit")
        builder.add_corner(35, 85, "left", elevation_change=-5, name="Rivage")

        # Pouhon (double left)
        builder.add_corner(110, 120, "left", name="Pouhon")
        builder.add_straight(180, name="Pouhon Exit")

        # Campus and Stavelot
        builder.add_chicane(100, severity=40, name="Campus")
        builder.add_corner(45, 70, "left", name="Stavelot")

        # Blanchimont (high-speed kink)
        builder.add_straight(400, name="Blanchimont Approach")
        builder.add_corner(300, 25, "left", name="Blanchimont")

        # Bus Stop Chicane
        builder.add_chicane(110, severity=55, name="Bus Stop Chicane")

        # Final straight
        builder.add_straight(350, name="Pit Straight")

        track = builder.build(name="Circuit de Spa-Francorchamps", num_laps=44)

        # Add sector checkpoints
        track.add_checkpoint("sector1", track.length * 0.33, "Sector 1 - Eau Rouge")
        track.add_checkpoint("sector2", track.length * 0.66, "Sector 2 - Pouhon")

        return track

    @staticmethod
    def silverstone() -> Track:
        """
        Silverstone Circuit (British Grand Prix).

        High-speed track with fast corners.
        Total length: ~5.891 km
        """
        builder = TrackBuilder()

        # Start/Finish and Abbey
        builder.add_straight(280, name="Start/Finish Straight")
        builder.add_corner(80, 60, "right", name="Abbey")

        # Farm Curve
        builder.add_corner(120, 45, "left", name="Farm Curve")

        # Village and The Loop
        builder.add_straight(150, name="National Straight")
        builder.add_corner(30, 95, "left", name="Village")
        builder.add_corner(25, 110, "right", name="The Loop")

        # Aintree and Wellington
        builder.add_corner(70, 55, "left", name="Aintree")
        builder.add_straight(180, name="Wellington Straight")

        # Brooklands and Luffield
        builder.add_corner(35, 100, "left", name="Brooklands")
        builder.add_corner(28, 105, "right", name="Luffield")

        # Woodcote and Copse
        builder.add_straight(450, name="National Straight")
        builder.add_corner(110, 70, "right", banking=3, name="Copse")

        # Maggotts-Becketts complex (high-speed)
        builder.add_corner(160, 55, "left", banking=2, name="Maggotts")
        builder.add_corner(140, 60, "right", banking=2, name="Becketts")
        builder.add_corner(120, 45, "left", name="Chapel")

        # Hangar Straight and Stowe
        builder.add_straight(650, name="Hangar Straight")
        builder.add_corner(40, 90, "right", name="Stowe")

        # Vale and Club
        builder.add_straight(200, name="Vale Approach")
        builder.add_corner(45, 75, "left", name="Vale")
        builder.add_corner(38, 85, "right", name="Club")

        # Abbey to finish
        builder.add_straight(280, name="Pit Straight")

        track = builder.build(name="Silverstone Circuit", num_laps=52)

        # Add sector checkpoints
        track.add_checkpoint("sector1", track.length * 0.33, "Sector 1")
        track.add_checkpoint("sector2", track.length * 0.66, "Sector 2")

        return track

    @staticmethod
    def suzuka() -> Track:
        """
        Suzuka International Racing Course (Japanese Grand Prix).

        Famous figure-8 layout with challenging corners.
        Total length: ~5.807 km
        """
        builder = TrackBuilder()

        # Start straight and Turn 1
        builder.add_straight(280, name="Start Straight")
        builder.add_corner(35, 105, "right", name="Turn 1")

        # S-Curves
        builder.add_corner(65, 70, "left", name="Turn 2")
        builder.add_corner(70, 65, "right", name="Turn 3")
        builder.add_corner(80, 55, "left", name="Turn 4")

        # Dunlop Curve
        builder.add_straight(200, name="Approach to Dunlop")
        builder.add_corner(90, 85, "left", name="Dunlop Curve")

        # Degner curves
        builder.add_corner(55, 90, "right", elevation_change=-5, name="Degner 1")
        builder.add_corner(50, 80, "right", elevation_change=-5, name="Degner 2")

        # Hairpin
        builder.add_straight(180, name="Back Straight Approach")
        builder.add_corner(15, 175, "left", name="Hairpin")

        # Spoon Curve
        builder.add_straight(220, name="Spoon Approach")
        builder.add_corner(100, 110, "left", banking=4, name="Spoon Curve")

        # 130R (high-speed corner)
        builder.add_straight(400, name="Back Straight")
        builder.add_corner(200, 75, "left", name="130R")

        # Casio Triangle chicane
        builder.add_chicane(140, severity=50, name="Casio Triangle")

        # Final corner
        builder.add_straight(250, name="Main Straight")

        track = builder.build(name="Suzuka International Racing Course", num_laps=53)

        # Add sector checkpoints
        track.add_checkpoint("sector1", track.length * 0.33, "Sector 1")
        track.add_checkpoint("sector2", track.length * 0.66, "Sector 2")

        return track

    @staticmethod
    def create_simple_oval(
        length: float = 2000.0, width: float = 15.0, banking: float = 15.0
    ) -> Track:
        """
        Create a simple oval track (NASCAR/IndyCar style).

        Args:
            length: Total track length in meters
            width: Track width in meters
            banking: Banking angle in corners (degrees)

        Returns:
            Oval track
        """
        builder = TrackBuilder()

        # Calculate dimensions
        straight_length = length * 0.3  # 30% straights
        corner_length = length * 0.2  # 20% per corner (4 corners)
        corner_radius = corner_length / (math.pi / 2)

        # Front straight
        builder.add_straight(straight_length, width=width, name="Front Straight")

        # Turn 1-2
        builder.add_corner(
            corner_radius, 90, "left", banking=banking, width=width, name="Turn 1"
        )
        builder.add_corner(
            corner_radius, 90, "left", banking=banking, width=width, name="Turn 2"
        )

        # Back straight
        builder.add_straight(straight_length, width=width, name="Back Straight")

        # Turn 3-4
        builder.add_corner(
            corner_radius, 90, "left", banking=banking, width=width, name="Turn 3"
        )
        builder.add_corner(
            corner_radius, 90, "left", banking=banking, width=width, name="Turn 4"
        )

        return builder.build(name="Oval Circuit", num_laps=200)
