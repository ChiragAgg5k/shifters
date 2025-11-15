"""Pre-configured scenarios for different mobility events."""

from typing import Dict, Any, List
from dataclasses import dataclass


@dataclass
class ScenarioConfig:
    """Configuration for a simulation scenario."""

    name: str
    description: str
    track_length: float
    num_laps: int
    track_type: str
    num_agents: int
    agent_type: str
    agent_params: Dict[str, Any]
    time_step: float = 0.1


# Formula E Scenario
FORMULA_E = ScenarioConfig(
    name="Formula E Race",
    description="Electric street racing with energy management",
    track_length=2400.0,  # 2.4km typical Formula E track
    num_laps=20,
    track_type="circuit",
    num_agents=22,  # Typical Formula E grid
    agent_type="RacingVehicle",
    agent_params={
        "max_speed": 225.0,  # ~280 km/h in m/s
        "acceleration": 18.0,
    },
    time_step=0.1,
)

# MotoGP Scenario
MOTOGP = ScenarioConfig(
    name="MotoGP Race",
    description="High-speed motorcycle racing",
    track_length=4800.0,  # ~4.8km typical MotoGP track
    num_laps=25,
    track_type="circuit",
    num_agents=24,  # Typical MotoGP grid
    agent_type="RacingVehicle",
    agent_params={
        "max_speed": 95.0,  # ~340 km/h in m/s
        "acceleration": 22.0,
    },
    time_step=0.1,
)

# Drone Racing Scenario
DRONE_RACING = ScenarioConfig(
    name="Drone Racing League",
    description="High-speed FPV drone racing",
    track_length=800.0,  # Short technical course
    num_laps=5,
    track_type="circuit",
    num_agents=8,
    agent_type="RacingVehicle",
    agent_params={
        "max_speed": 55.0,  # ~200 km/h in m/s
        "acceleration": 30.0,  # Very high acceleration
    },
    time_step=0.05,  # Higher frequency for faster dynamics
)

# Supply Chain Race Scenario
SUPPLY_CHAIN = ScenarioConfig(
    name="Supply Chain Delivery Race",
    description="Competitive last-mile delivery simulation",
    track_length=15000.0,  # 15km urban route
    num_laps=1,  # Point-to-point
    track_type="linear",
    num_agents=50,  # Many delivery vehicles
    agent_type="RacingVehicle",
    agent_params={
        "max_speed": 16.0,  # ~60 km/h in m/s
        "acceleration": 3.0,
    },
    time_step=0.5,  # Coarser time step for efficiency
)

# Urban Traffic Scenario
TRAFFIC_FLOW = ScenarioConfig(
    name="Urban Traffic Flow",
    description="Traffic management and flow optimization",
    track_length=5000.0,  # 5km urban corridor
    num_laps=1,
    track_type="linear",
    num_agents=100,  # High density traffic
    agent_type="RacingVehicle",
    agent_params={
        "max_speed": 13.9,  # 50 km/h speed limit
        "acceleration": 2.5,
    },
    time_step=1.0,  # 1 second time steps
)


# Scenario registry
SCENARIOS: Dict[str, ScenarioConfig] = {
    "formula_e": FORMULA_E,
    "motogp": MOTOGP,
    "drone_racing": DRONE_RACING,
    "supply_chain": SUPPLY_CHAIN,
    "traffic_flow": TRAFFIC_FLOW,
}


def get_scenario(scenario_name: str) -> ScenarioConfig:
    """
    Get a scenario configuration by name.

    Args:
        scenario_name: Name of the scenario

    Returns:
        ScenarioConfig instance

    Raises:
        KeyError: If scenario not found
    """
    if scenario_name not in SCENARIOS:
        available = ", ".join(SCENARIOS.keys())
        raise KeyError(f"Scenario '{scenario_name}' not found. Available: {available}")

    return SCENARIOS[scenario_name]


def list_scenarios() -> List[Dict[str, str]]:
    """
    List all available scenarios.

    Returns:
        List of scenario info dictionaries
    """
    return [
        {
            "id": key,
            "name": config.name,
            "description": config.description,
            "agents": str(config.num_agents),
            "track": f"{config.track_length}m x {config.num_laps} laps",
        }
        for key, config in SCENARIOS.items()
    ]
