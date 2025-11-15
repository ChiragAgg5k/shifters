"""Track and environment representation for mobility simulation."""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class Checkpoint:
    """Represents a checkpoint on the track."""

    id: str
    position: float  # Position on track (distance from start)
    name: Optional[str] = None


class Track:
    """
    Represents a racing track or path for agents to follow.

    Can be linear, circular, or have custom topology.
    """

    def __init__(
        self,
        length: float,
        num_laps: int = 3,
        track_type: str = "circuit",  # "circuit" or "linear"
        name: str = "Default Track",
    ):
        """
        Initialize a track.

        Args:
            length: Total length of the track (in distance units)
            num_laps: Number of laps to complete
            track_type: Type of track - "circuit" (loop) or "linear" (point-to-point)
            name: Name of the track
        """
        self.length = length
        self.num_laps = num_laps
        self.track_type = track_type
        self.name = name
        self.checkpoints: List[Checkpoint] = []

        # Create default start/finish checkpoint
        self.add_checkpoint("start_finish", 0.0, "Start/Finish")

    def add_checkpoint(
        self, checkpoint_id: str, position: float, name: Optional[str] = None
    ):
        """
        Add a checkpoint to the track.

        Args:
            checkpoint_id: Unique identifier for the checkpoint
            position: Position on track (0 to track length)
            name: Display name for the checkpoint
        """
        if position < 0 or position > self.length:
            raise ValueError(f"Checkpoint position must be between 0 and {self.length}")

        checkpoint = Checkpoint(id=checkpoint_id, position=position, name=name)
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
        return {
            "name": self.name,
            "length": self.length,
            "num_laps": self.num_laps,
            "track_type": self.track_type,
            "total_distance": self.length * self.num_laps,
            "checkpoints": len(self.checkpoints),
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
