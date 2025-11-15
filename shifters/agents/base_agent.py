"""Base Agent class for mobility simulation."""

from typing import Optional, Dict, Any
from mesa import Agent
import uuid


class MobilityAgent(Agent):
    """
    Base class for all moving agents in the simulation.

    Represents entities like vehicles, drones, or any mobile unit.
    """

    def __init__(
        self,
        model,
        unique_id: str,
        name: Optional[str] = None,
        max_speed: float = 100.0,
        acceleration: float = 10.0,
        **kwargs,
    ):
        """
        Initialize a mobility agent.

        Args:
            model: The model instance this agent belongs to
            unique_id: Unique identifier for the agent
            name: Display name for the agent
            max_speed: Maximum speed the agent can reach (units/second)
            acceleration: Acceleration rate (units/second²)
            **kwargs: Additional custom properties
        """
        super().__init__(model)
        self.unique_id = unique_id
        self.name = name or f"Agent-{unique_id}"
        self.max_speed = max_speed
        self.acceleration = acceleration

        # Movement state
        self.position = 0.0  # Current position on track
        self.speed = 0.0  # Current speed
        self.lap = 0  # Current lap number
        self.finished = False

        # Performance tracking
        self.distance_traveled = 0.0
        self.checkpoints_passed = []
        self.lap_times = []
        self.total_time = 0.0

        # Store additional properties
        self.properties = kwargs

    def step(self):
        """
        Execute one step of the agent's behavior.
        Override this in subclasses for custom behavior.
        """
        if not self.finished:
            self._accelerate()
            self._move()

    def _accelerate(self):
        """Simple acceleration logic."""
        if self.speed < self.max_speed:
            self.speed = min(self.speed + self.acceleration * 0.1, self.max_speed)

    def _move(self):
        """Update position based on current speed."""
        movement = self.speed * 0.1  # Assuming 0.1s time step
        self.position += movement
        self.distance_traveled += movement

    def pass_checkpoint(self, checkpoint_id: str):
        """Record passing a checkpoint."""
        self.checkpoints_passed.append(
            {"checkpoint_id": checkpoint_id, "time": self.total_time}
        )

    def complete_lap(self, lap_time: float):
        """Record lap completion."""
        self.lap += 1
        self.lap_times.append(lap_time)
        self.position = 0.0  # Reset position for new lap

    def finish_race(self):
        """Mark agent as finished."""
        self.finished = True

    def get_state(self) -> Dict[str, Any]:
        """Get current agent state for display/logging."""
        return {
            "id": self.unique_id,
            "name": self.name,
            "position": round(self.position, 2),
            "speed": round(self.speed, 2),
            "lap": self.lap,
            "finished": self.finished,
            "distance_traveled": round(self.distance_traveled, 2),
            "total_time": round(self.total_time, 2),
            "checkpoints": len(self.checkpoints_passed),
        }


class RacingVehicle(MobilityAgent):
    """Specialized agent for racing scenarios (Formula E, MotoGP, etc.)."""

    def __init__(
        self,
        model,
        unique_id: str,
        name: Optional[str] = None,
        max_speed: float = 200.0,
        acceleration: float = 15.0,
        **kwargs,
    ):
        super().__init__(model, unique_id, name, max_speed, acceleration, **kwargs)
        self.energy = 100.0  # Battery/fuel level
        self.pit_stops = 0

    def _move(self):
        """Move and consume energy."""
        super()._move()
        # Energy consumption based on speed
        self.energy = max(0, self.energy - (self.speed / self.max_speed) * 0.01)

    def pit_stop(self):
        """Perform pit stop to recharge/refuel."""
        self.energy = 100.0
        self.pit_stops += 1
        self.speed = 0.0  # Stop during pit

    def get_state(self) -> Dict[str, Any]:
        """Get state including racing-specific data."""
        state = super().get_state()
        state.update({"energy": round(self.energy, 2), "pit_stops": self.pit_stops})
        return state
