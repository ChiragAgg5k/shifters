"""Core simulation engine for mobility events."""

from typing import List, Dict, Any, Optional, Callable
from mesa import Model, DataCollector
from mesa.agent import AgentSet
import time

from shifters.agents.base_agent import MobilityAgent
from shifters.environment.track import Track, Environment
from shifters.environment.safety_car import SafetyCar, DNFManager
from shifters.leaderboard.leaderboard import Leaderboard


class MobilitySimulation(Model):
    """
    Main simulation model for mobility events.

    Coordinates agents, environment, events, and leaderboard updates.
    """

    def __init__(
        self, track: Track, time_step: float = 0.1, enable_live_updates: bool = True
    ):
        """
        Initialize the simulation.

        Args:
            track: Track instance for the simulation
            time_step: Time step for simulation (in seconds)
            enable_live_updates: Whether to enable live leaderboard updates
        """
        super().__init__()

        # Core components
        self.agent_set = AgentSet([], random=self.random)
        self.environment = Environment(track)
        self.leaderboard = Leaderboard()
        self.safety_car = SafetyCar(track_name=track.name)
        self.dnf_manager = DNFManager()

        # Simulation settings
        self.time_step = time_step
        self.enable_live_updates = enable_live_updates
        self.current_step = 0
        self.current_lap = 0
        self.simulation_time = 0.0
        self.running = True
        self.race_started = False
        self.race_finished = False

        # Agent tracking
        self.agents_list: List[MobilityAgent] = []
        self.finished_agents: List[MobilityAgent] = []

        # Event callbacks
        self.event_callbacks: Dict[str, List[Callable]] = {
            "lap_complete": [],
            "checkpoint_passed": [],
            "race_finish": [],
            "agent_finish": [],
        }

        # Data collection
        self.datacollector = DataCollector(
            model_reporters={
                "Time": lambda m: m.simulation_time,
                "Active_Agents": lambda m: len(
                    [a for a in m.agents_list if not a.finished]
                ),
                "Finished_Agents": lambda m: len(m.finished_agents),
            },
            agent_reporters={"Position": "position", "Speed": "speed", "Lap": "lap"},
        )

    def add_agent(self, agent: MobilityAgent):
        """
        Add an agent to the simulation.

        Args:
            agent: Agent instance to add
        """
        self.agent_set.add(agent)
        self.agents_list.append(agent)
        self.leaderboard.register_agent(agent.unique_id, agent.name)

    def register_event_callback(self, event_type: str, callback: Callable):
        """
        Register a callback for a specific event type.

        Args:
            event_type: Type of event ('lap_complete', 'checkpoint_passed', etc.)
            callback: Function to call when event occurs
        """
        if event_type in self.event_callbacks:
            self.event_callbacks[event_type].append(callback)

    def trigger_event(self, event_type: str, **kwargs):
        """
        Trigger an event and execute callbacks.

        Args:
            event_type: Type of event to trigger
            **kwargs: Event-specific data
        """
        if event_type in self.event_callbacks:
            for callback in self.event_callbacks[event_type]:
                callback(**kwargs)

    def step(self):
        """Execute one step of the simulation."""
        if not self.running:
            return

        # Update environment
        self.environment.update(self.time_step)

        # Check slipstream and DRS for racing vehicles
        from shifters.agents.base_agent import RacingVehicle
        racing_agents = [a for a in self.agents_list if isinstance(a, RacingVehicle)]
        
        for agent in racing_agents:
            if not agent.finished:
                # Check slipstream effect
                agent.check_slipstream(racing_agents)
                
                # Auto-manage DRS (activate on straights, deactivate in corners)
                if agent.current_curvature == 0 and agent.speed > agent.max_speed * 0.7:
                    agent.activate_drs()
                else:
                    agent.deactivate_drs()

        # Update all agents
        self.agent_set.do("step")

        # Update simulation time
        self.simulation_time += self.time_step
        self.current_step += 1

        # Process agent states and check for DNFs
        from shifters.agents.base_agent import RacingVehicle
        dnf_occurred = False
        
        # Update current lap to the leading car's lap
        if self.agents_list:
            self.current_lap = max(agent.lap for agent in self.agents_list if not agent.finished) if any(not agent.finished for agent in self.agents_list) else 0
        
        for agent in self.agents_list:
            if not agent.finished:
                agent.total_time = self.simulation_time
                
                # Check for DNF (only for RacingVehicles, once per lap, after lap 1)
                if isinstance(agent, RacingVehicle) and agent.lap > 0:
                    # Only check once per lap
                    if agent.last_dnf_check_lap < agent.lap:
                        agent.last_dnf_check_lap = agent.lap
                        dnf, reason = self.dnf_manager.check_dnf(
                            agent.dnf_probability,
                            0.02,  # 2% mechanical failure rate
                            agent.lap,  # Use agent's current lap, not global
                            self.environment.track.num_laps
                        )
                        if dnf:
                            agent.finish_race()
                            self.finished_agents.append(agent)
                            self.dnf_manager.record_dnf(agent.unique_id, agent.lap, reason)
                            dnf_occurred = True
                            continue
                
                self._check_agent_progress(agent)
        
        # Check for safety car deployment
        if dnf_occurred:
            self.safety_car.check_deployment(dnf_occurred=True)
        
        # Update safety car state
        self.safety_car.update(self.current_lap)

        # Update leaderboard
        if self.enable_live_updates:
            self._update_leaderboard()

        # Collect data
        self.datacollector.collect(self)

        # Check if race is complete
        if len(self.finished_agents) == len(self.agents_list):
            self.finish_race()

    def _check_agent_progress(self, agent: MobilityAgent):
        """
        Check and update agent progress (laps, checkpoints, finish).

        Args:
            agent: Agent to check
        """
        track = self.environment.track

        # Check for lap completion
        if track.is_lap_complete(agent.position):
            lap_time = self.simulation_time
            if agent.lap_times:
                lap_time = self.simulation_time - sum(agent.lap_times)

            agent.complete_lap(lap_time)
            agent.position = track.normalize_position(agent.position)

            self.trigger_event(
                "lap_complete", agent=agent, lap=agent.lap, lap_time=lap_time
            )

            # Check if race is finished for this agent
            if track.is_race_complete(agent.lap):
                agent.finish_race()
                self.finished_agents.append(agent)
                self.trigger_event(
                    "agent_finish", agent=agent, position=len(self.finished_agents)
                )

    def _update_leaderboard(self):
        """Update leaderboard with current agent states."""
        for agent in self.agents_list:
            progress = self.environment.track.get_progress_percentage(
                agent.position, agent.lap
            )
            self.leaderboard.update_agent(
                agent_id=agent.unique_id,
                lap=agent.lap,
                position_on_track=agent.position,
                progress=progress,
                finished=agent.finished,
                time=agent.total_time,
            )

    def start_race(self):
        """Start the race."""
        self.race_started = True
        self.running = True
        print(
            f"🏁 Race started with {len(self.agents_list)} agents on {self.environment.track.name}"
        )

    def finish_race(self):
        """Finish the race."""
        self.race_finished = True
        self.running = False
        self.trigger_event("race_finish")
        print(f"🏆 Race finished! Total time: {self.simulation_time:.2f}s")

    def run(self, max_steps: Optional[int] = None, verbose: bool = True):
        """
        Run the simulation.

        Args:
            max_steps: Maximum number of steps to run (None for unlimited)
            verbose: Whether to print progress updates
        """
        self.start_race()

        step_count = 0
        last_update = time.time()
        update_interval = 1.0  # Print update every second

        while self.running:
            self.step()
            step_count += 1

            # Print progress
            if verbose and (time.time() - last_update) >= update_interval:
                active = len([a for a in self.agents_list if not a.finished])
                print(
                    f"Step {self.current_step} | Time: {self.simulation_time:.1f}s | Active: {active}/{len(self.agents_list)}"
                )
                last_update = time.time()

            # Check max steps
            if max_steps and step_count >= max_steps:
                self.running = False
                print("Maximum steps reached")
                break

    def get_current_standings(self) -> List[Dict[str, Any]]:
        """Get current race standings."""
        return self.leaderboard.get_rankings()

    def get_simulation_state(self) -> Dict[str, Any]:
        """Get complete simulation state."""
        return {
            "time": round(self.simulation_time, 2),
            "step": self.current_step,
            "lap": self.current_lap,
            "running": self.running,
            "race_started": self.race_started,
            "race_finished": self.race_finished,
            "environment": self.environment.get_state(),
            "agents": [agent.get_state() for agent in self.agents_list],
            "standings": self.get_current_standings(),
            "safety_car": self.safety_car.get_state(),
            "dnfs": self.dnf_manager.get_state(),
        }
