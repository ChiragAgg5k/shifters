"""Track and environment representation for mobility simulation."""

from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import math


@dataclass
class Point3D:
    """Represents a 3D coordinate point."""

    x: float
    y: float
    z: float = 0.0  # Elevation

    def distance_to(self, other: "Point3D") -> float:
        """Calculate 3D Euclidean distance to another point."""
        return math.sqrt(
            (self.x - other.x) ** 2 + (self.y - other.y) ** 2 + (self.z - other.z) ** 2
        )

    def distance_2d(self, other: "Point3D") -> float:
        """Calculate 2D distance (ignoring elevation)."""
        return math.sqrt((self.x - other.x) ** 2 + (self.y - other.y) ** 2)

    def to_dict(self) -> Dict[str, float]:
        """Convert to dictionary."""
        return {"x": self.x, "y": self.y, "z": self.z}


@dataclass
class TrackSegment:
    """
    Represents a segment of the track with geometric and physical properties.

    A segment can be a straight, a corner, or any other track section.
    """

    id: str
    start_point: Point3D
    end_point: Point3D
    segment_type: str  # "straight", "left_turn", "right_turn", "chicane"
    length: float  # Actual distance along the segment
    curvature: float = 0.0  # Radius of curvature (0 = straight, >0 = curved)
    banking: float = 0.0  # Banking angle in degrees (positive = banked inward)
    elevation_change: float = 0.0  # Height change from start to end
    speed_limit: Optional[float] = None  # Suggested/maximum speed for this segment
    surface_type: str = "asphalt"  # Surface material
    width: float = 12.0  # Track width in meters
    name: Optional[str] = None

    def __post_init__(self):
        """Calculate derived properties."""
        if self.length == 0:
            self.length = self.start_point.distance_to(self.end_point)
        if self.elevation_change == 0:
            self.elevation_change = self.end_point.z - self.start_point.z

    def get_gradient(self) -> float:
        """Calculate gradient as percentage (rise/run * 100)."""
        horizontal_dist = self.start_point.distance_2d(self.end_point)
        if horizontal_dist == 0:
            return 0.0
        return (self.elevation_change / horizontal_dist) * 100

    def is_corner(self) -> bool:
        """Check if this segment is a corner."""
        return self.segment_type in ["left_turn", "right_turn", "chicane"]

    def get_recommended_speed(self, base_speed: float) -> float:
        """
        Calculate recommended speed based on segment properties.

        Args:
            base_speed: Agent's maximum speed capability

        Returns:
            Recommended speed for this segment
        """
        if self.speed_limit:
            return min(base_speed, self.speed_limit)

        # Simple physics-based speed calculation for corners
        if self.curvature > 0:
            # v = sqrt(μ * g * r) where μ is friction coefficient
            # Simplified: tighter corners (smaller radius) = lower speed
            friction = 1.2 if self.surface_type == "asphalt" else 0.8
            gravity = 9.81
            # Adjust for banking (banking helps maintain speed in corners)
            banking_factor = 1.0 + abs(self.banking) / 90.0
            corner_speed = math.sqrt(
                friction * gravity * self.curvature * banking_factor
            )
            return min(base_speed, corner_speed)

        return base_speed

    def to_dict(self) -> Dict[str, Any]:
        """Convert segment to dictionary."""
        return {
            "id": self.id,
            "type": self.segment_type,
            "length": round(self.length, 2),
            "curvature": round(self.curvature, 2),
            "banking": round(self.banking, 2),
            "elevation_change": round(self.elevation_change, 2),
            "gradient": round(self.get_gradient(), 2),
            "width": self.width,
            "surface": self.surface_type,
            "speed_limit": self.speed_limit,
            "name": self.name,
        }


@dataclass
class Checkpoint:
    """Represents a checkpoint on the track."""

    id: str
    position: float  # Position on track (distance from start)
    name: Optional[str] = None
    coordinates: Optional[Point3D] = None  # Optional 3D location


class Track:
    """
    Represents a racing track or path for agents to follow.

    Can be linear, circular, or have custom 3D geometry with segments.
    """

    def __init__(
        self,
        length: float,
        num_laps: int = 3,
        track_type: str = "circuit",  # "circuit" or "linear"
        name: str = "Default Track",
        segments: Optional[List[TrackSegment]] = None,
    ):
        """
        Initialize a track.

        Args:
            length: Total length of the track (in distance units)
            num_laps: Number of laps to complete
            track_type: Type of track - "circuit" (loop) or "linear" (point-to-point)
            name: Name of the track
            segments: Optional list of TrackSegment objects for geometric track definition
        """
        self.length = length
        self.num_laps = num_laps
        self.track_type = track_type
        self.name = name
        self.checkpoints: List[Checkpoint] = []
        self.segments: List[TrackSegment] = segments or []

        # If segments are provided, validate and calculate total length
        if self.segments:
            self._validate_segments()
            calculated_length = sum(seg.length for seg in self.segments)
            if abs(calculated_length - length) > 0.1:
                print(
                    f"Warning: Provided length ({length}m) differs from calculated "
                    f"segment length ({calculated_length:.2f}m). Using calculated length."
                )
                self.length = calculated_length

        # Create default start/finish checkpoint
        start_coords = self.segments[0].start_point if self.segments else None
        self.add_checkpoint("start_finish", 0.0, "Start/Finish", start_coords)

    def _validate_segments(self):
        """Validate that segments are properly connected."""
        if not self.segments:
            return

        for i in range(len(self.segments) - 1):
            current = self.segments[i]
            next_seg = self.segments[i + 1]
            distance = current.end_point.distance_to(next_seg.start_point)
            if distance > 0.1:  # Allow small tolerance
                print(
                    f"Warning: Gap detected between segment {current.id} and {next_seg.id} "
                    f"(distance: {distance:.2f}m)"
                )

        # For circuit tracks, check if last segment connects to first
        if self.track_type == "circuit":
            first = self.segments[0]
            last = self.segments[-1]
            distance = last.end_point.distance_to(first.start_point)
            if distance > 0.1:
                print(
                    f"Warning: Circuit track not properly closed "
                    f"(gap: {distance:.2f}m between last and first segment)"
                )

    def add_segment(self, segment: TrackSegment):
        """
        Add a segment to the track.

        Args:
            segment: TrackSegment to add
        """
        self.segments.append(segment)
        self.length = sum(seg.length for seg in self.segments)

    def get_segment_at_position(self, position: float) -> Optional[TrackSegment]:
        """
        Get the track segment at a given position.

        Args:
            position: Distance from start of track

        Returns:
            TrackSegment or None if no segments defined
        """
        if not self.segments:
            return None

        accumulated = 0.0
        for segment in self.segments:
            if accumulated <= position < accumulated + segment.length:
                return segment
            accumulated += segment.length

        # Handle edge case: position at or past end of track
        return self.segments[-1] if position >= accumulated else None

    def get_coordinates_at_position(self, position: float) -> Optional[Point3D]:
        """
        Get 3D coordinates at a given position along the track.

        Args:
            position: Distance from start of track

        Returns:
            Point3D coordinates or None if track has no geometry
        """
        if not self.segments:
            return None

        # Normalize position for circuit tracks
        if self.track_type == "circuit":
            position = position % self.length

        accumulated = 0.0
        for segment in self.segments:
            segment_end = accumulated + segment.length
            if accumulated <= position < segment_end:
                # Interpolate within the segment
                segment_progress = (position - accumulated) / segment.length
                return self._interpolate_point(
                    segment.start_point, segment.end_point, segment_progress
                )
            accumulated += segment.length

        # Return end point if we're at the very end
        return self.segments[-1].end_point if self.segments else None

    def _interpolate_point(
        self, start: Point3D, end: Point3D, progress: float
    ) -> Point3D:
        """
        Linear interpolation between two points.

        Args:
            start: Starting point
            end: Ending point
            progress: Progress from 0.0 to 1.0

        Returns:
            Interpolated Point3D
        """
        return Point3D(
            x=start.x + (end.x - start.x) * progress,
            y=start.y + (end.y - start.y) * progress,
            z=start.z + (end.z - start.z) * progress,
        )

    def get_elevation_at_position(self, position: float) -> float:
        """
        Get elevation (z-coordinate) at a given position.

        Args:
            position: Distance from start of track

        Returns:
            Elevation in meters (0.0 if no geometry)
        """
        coords = self.get_coordinates_at_position(position)
        return coords.z if coords else 0.0

    def get_banking_at_position(self, position: float) -> float:
        """
        Get banking angle at a given position.

        Args:
            position: Distance from start of track

        Returns:
            Banking angle in degrees (0.0 if no segment data)
        """
        segment = self.get_segment_at_position(position)
        return segment.banking if segment else 0.0

    def get_curvature_at_position(self, position: float) -> float:
        """
        Get curvature radius at a given position.

        Args:
            position: Distance from start of track

        Returns:
            Curvature radius in meters (0.0 = straight)
        """
        segment = self.get_segment_at_position(position)
        return segment.curvature if segment else 0.0

    def get_recommended_speed_at_position(
        self, position: float, agent_max_speed: float
    ) -> float:
        """
        Get recommended speed at a position based on track geometry.

        Args:
            position: Distance from start of track
            agent_max_speed: Agent's maximum speed capability

        Returns:
            Recommended speed in m/s
        """
        segment = self.get_segment_at_position(position)
        if segment:
            return segment.get_recommended_speed(agent_max_speed)
        return agent_max_speed

    def add_checkpoint(
        self,
        checkpoint_id: str,
        position: float,
        name: Optional[str] = None,
        coordinates: Optional[Point3D] = None,
    ):
        """
        Add a checkpoint to the track.

        Args:
            checkpoint_id: Unique identifier for the checkpoint
            position: Position on track (0 to track length)
            name: Display name for the checkpoint
            coordinates: Optional 3D coordinates (auto-calculated if segments exist)
        """
        if position < 0 or position > self.length:
            raise ValueError(f"Checkpoint position must be between 0 and {self.length}")

        # Auto-calculate coordinates if segments exist and coordinates not provided
        if coordinates is None and self.segments:
            coordinates = self.get_coordinates_at_position(position)

        checkpoint = Checkpoint(
            id=checkpoint_id, position=position, name=name, coordinates=coordinates
        )
        self.checkpoints.append(checkpoint)
        # Sort checkpoints by position
        self.checkpoints.sort(key=lambda c: c.position)

    def get_next_checkpoint(self, current_position: float) -> Optional[Checkpoint]:
        """
        Get the next checkpoint from the current position.

        Args:
            current_position: Current position on track

        Returns:
            The next checkpoint, or None if no more checkpoints
        """
        for checkpoint in self.checkpoints:
            if checkpoint.position > current_position:
                return checkpoint
        return None

    def is_lap_complete(self, position: float) -> bool:
        """
        Check if a lap is complete based on position.

        Args:
            position: Current position on track

        Returns:
            True if position exceeds track length (for circuit tracks)
        """
        if self.track_type == "circuit":
            return position >= self.length
        return False

    def normalize_position(self, position: float) -> float:
        """
        Normalize position for circuit tracks (wrap around).

        Args:
            position: Current position

        Returns:
            Normalized position (0 to track length)
        """
        if self.track_type == "circuit" and position >= self.length:
            return position % self.length
        return position

    def get_progress_percentage(self, position: float, lap: int) -> float:
        """
        Calculate overall progress percentage.

        Args:
            position: Current position on track
            lap: Current lap number

        Returns:
            Progress as percentage (0-100)
        """
        total_distance = self.length * self.num_laps
        current_distance = (lap * self.length) + position
        return min(100.0, (current_distance / total_distance) * 100)

    def is_race_complete(self, lap: int) -> bool:
        """
        Check if race is complete.

        Args:
            lap: Current lap number

        Returns:
            True if all laps are complete
        """
        return lap >= self.num_laps

    def get_info(self) -> Dict[str, Any]:
        """Get track information."""
        info = {
            "name": self.name,
            "length": self.length,
            "num_laps": self.num_laps,
            "track_type": self.track_type,
            "total_distance": self.length * self.num_laps,
            "checkpoints": len(self.checkpoints),
            "has_geometry": len(self.segments) > 0,
            "num_segments": len(self.segments),
        }

        # Add geometry statistics if available
        if self.segments:
            corners = sum(1 for s in self.segments if s.is_corner())
            straights = len(self.segments) - corners
            total_elevation_gain = sum(
                max(0, s.elevation_change) for s in self.segments
            )
            total_elevation_loss = sum(
                abs(min(0, s.elevation_change)) for s in self.segments
            )
            max_banking = max((s.banking for s in self.segments), default=0.0)

            info.update(
                {
                    "corners": corners,
                    "straights": straights,
                    "elevation_gain": round(total_elevation_gain, 2),
                    "elevation_loss": round(total_elevation_loss, 2),
                    "max_banking": round(max_banking, 2),
                    "coordinates": [
                        {
                            "x": seg.start_point.x,
                            "y": seg.start_point.y,
                            "z": seg.start_point.z,
                        }
                        for seg in self.segments
                    ],
                }
            )

        return info

    def get_track_profile(self) -> Dict[str, Any]:
        """
        Get detailed track profile including all segments.

        Returns:
            Dictionary with complete track geometry data
        """
        return {
            "name": self.name,
            "length": self.length,
            "type": self.track_type,
            "segments": [seg.to_dict() for seg in self.segments],
            "checkpoints": [
                {
                    "id": cp.id,
                    "position": cp.position,
                    "name": cp.name,
                    "coordinates": cp.coordinates.to_dict() if cp.coordinates else None,
                }
                for cp in self.checkpoints
            ],
        }


class Environment:
    """
    Environment manager that handles track and conditions.
    """

    def __init__(self, track: Track):
        """
        Initialize environment.

        Args:
            track: The track to use for this environment
        """
        self.track = track
        self.current_time = 0.0
        self.weather = "clear"  # Weather conditions
        self.temperature = 25.0  # Temperature in Celsius

    def update(self, delta_time: float):
        """
        Update environment state.

        Args:
            delta_time: Time elapsed since last update
        """
        self.current_time += delta_time

    def get_state(self) -> Dict[str, Any]:
        """Get current environment state."""
        return {
            "time": round(self.current_time, 2),
            "weather": self.weather,
            "temperature": self.temperature,
            "track": self.track.get_info(),
        }
