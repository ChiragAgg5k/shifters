"""Leaderboard system for tracking and ranking agents."""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
import bisect


@dataclass
class AgentRanking:
    """Represents an agent's current ranking and stats."""

    agent_id: str
    name: str
    rank: int = 0
    lap: int = 0
    position_on_track: float = 0.0
    progress: float = 0.0  # Overall progress percentage
    finished: bool = False
    finish_position: Optional[int] = None
    total_time: float = 0.0
    last_updated: datetime = field(default_factory=datetime.now)

    def get_sort_key(self) -> tuple:
        """
        Get sorting key for ranking.

        Returns:
            Tuple for sorting (finished first, then by progress descending)
        """
        # Finished agents come first, sorted by finish position
        # Then active agents sorted by progress (lap + position)
        if self.finished and self.finish_position is not None:
            return (0, self.finish_position, 0)
        else:
            # Not finished: sort by lap (desc) then position (desc)
            return (1, -self.lap, -self.position_on_track)


class Leaderboard:
    """
    Live leaderboard for tracking agent rankings.

    Uses efficient data structures for real-time updates.
    """

    def __init__(self):
        """Initialize the leaderboard."""
        self.agents: Dict[str, AgentRanking] = {}
        self._sorted_rankings: List[AgentRanking] = []
        self.total_updates = 0
        self.last_update_time = datetime.now()

    def register_agent(self, agent_id: str, name: str):
        """
        Register a new agent in the leaderboard.

        Args:
            agent_id: Unique identifier for the agent
            name: Display name for the agent
        """
        if agent_id not in self.agents:
            ranking = AgentRanking(agent_id=agent_id, name=name)
            self.agents[agent_id] = ranking
            self._sorted_rankings.append(ranking)
            self._update_rankings()

    def update_agent(
        self,
        agent_id: str,
        lap: Optional[int] = None,
        position_on_track: Optional[float] = None,
        progress: Optional[float] = None,
        finished: bool = False,
        time: Optional[float] = None,
    ):
        """
        Update an agent's status.

        Args:
            agent_id: Agent to update
            lap: Current lap number
            position_on_track: Current position on track
            progress: Overall progress percentage
            finished: Whether agent has finished
            time: Total elapsed time
        """
        if agent_id not in self.agents:
            raise ValueError(f"Agent {agent_id} not registered")

        ranking = self.agents[agent_id]

        if lap is not None:
            ranking.lap = lap
        if position_on_track is not None:
            ranking.position_on_track = position_on_track
        if progress is not None:
            ranking.progress = progress
        if time is not None:
            ranking.total_time = time

        # Handle finish
        if finished and not ranking.finished:
            ranking.finished = True
            # Calculate finish position
            finished_count = len([r for r in self.agents.values() if r.finished])
            ranking.finish_position = finished_count

        ranking.last_updated = datetime.now()
        self.total_updates += 1
        self.last_update_time = datetime.now()

        # Re-sort rankings
        self._update_rankings()

    def _update_rankings(self):
        """Update the sorted rankings and assign rank numbers."""
        # Sort all agents
        self._sorted_rankings = sorted(
            self.agents.values(), key=lambda r: r.get_sort_key()
        )

        # Assign ranks
        for idx, ranking in enumerate(self._sorted_rankings, start=1):
            ranking.rank = idx

    def get_rankings(self) -> List[Dict[str, Any]]:
        """
        Get current rankings as a list.

        Returns:
            List of agent rankings, sorted by position
        """
        return [
            {
                "rank": r.rank,
                "id": r.agent_id,
                "name": r.name,
                "lap": r.lap,
                "position": round(r.position_on_track, 2),
                "progress": round(r.progress, 2),
                "finished": r.finished,
                "finish_position": r.finish_position,
                "time": round(r.total_time, 2),
            }
            for r in self._sorted_rankings
        ]

    def get_top_n(self, n: int = 10) -> List[Dict[str, Any]]:
        """
        Get top N agents.

        Args:
            n: Number of top agents to return

        Returns:
            List of top N agent rankings
        """
        return self.get_rankings()[:n]

    def get_agent_rank(self, agent_id: str) -> Optional[int]:
        """
        Get an agent's current rank.

        Args:
            agent_id: Agent ID to look up

        Returns:
            Current rank, or None if not found
        """
        if agent_id in self.agents:
            return self.agents[agent_id].rank
        return None

    def get_finished_agents(self) -> List[Dict[str, Any]]:
        """Get all finished agents, sorted by finish position."""
        finished = [r for r in self._sorted_rankings if r.finished]
        return [
            {
                "finish_position": r.finish_position,
                "id": r.agent_id,
                "name": r.name,
                "total_time": round(r.total_time, 2),
            }
            for r in finished
        ]

    def print_leaderboard(self, top_n: Optional[int] = None, show_all: bool = False):
        """
        Print formatted leaderboard to console.

        Args:
            top_n: Number of top agents to show (None for all)
            show_all: Show all details
        """
        rankings = self.get_rankings()
        if top_n:
            rankings = rankings[:top_n]

        print("\n" + "=" * 80)
        print("🏁 LIVE LEADERBOARD 🏁".center(80))
        print("=" * 80)
        print(
            f"{'Rank':<6} {'Name':<20} {'Lap':<5} {'Pos':<8} {'Progress':<10} {'Status':<10}"
        )
        print("-" * 80)

        for r in rankings:
            status = "FINISHED ✓" if r["finished"] else "Racing"
            progress_str = f"{r['progress']:.1f}%"

            print(
                f"{r['rank']:<6} "
                f"{r['name']:<20} "
                f"{r['lap']:<5} "
                f"{r['position']:<8.1f} "
                f"{progress_str:<10} "
                f"{status:<10}"
            )

        print("=" * 80 + "\n")

    def get_stats(self) -> Dict[str, Any]:
        """Get leaderboard statistics."""
        return {
            "total_agents": len(self.agents),
            "finished_agents": len([r for r in self.agents.values() if r.finished]),
            "active_agents": len([r for r in self.agents.values() if not r.finished]),
            "total_updates": self.total_updates,
            "last_update": self.last_update_time.isoformat(),
        }
