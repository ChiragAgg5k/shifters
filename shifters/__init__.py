"""
Shifters - Competitive Mobility Systems Simulator

A lightweight mobility event simulator for racing, drones, and traffic management.
"""

__version__ = "0.1.0"

from shifters.agents.base_agent import MobilityAgent, RacingVehicle
from shifters.environment.track import (
    Track,
    Environment,
    Checkpoint,
    Point3D,
    TrackSegment,
)
from shifters.environment.track_builder import TrackBuilder, F1TrackLibrary
from shifters.environment.geojson_parser import GeoJSONTrackParser
from shifters.simcore.simulator import MobilitySimulation
from shifters.leaderboard.leaderboard import Leaderboard, AgentRanking

__all__ = [
    "MobilityAgent",
    "RacingVehicle",
    "Track",
    "Environment",
    "Checkpoint",
    "Point3D",
    "TrackSegment",
    "TrackBuilder",
    "F1TrackLibrary",
    "GeoJSONTrackParser",
    "MobilitySimulation",
    "Leaderboard",
    "AgentRanking",
]
