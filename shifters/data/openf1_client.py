"""OpenF1 API client for fetching real F1 data."""

from typing import List, Dict, Any, Optional
import httpx
from datetime import datetime


class OpenF1Client:
    """Client for accessing OpenF1 API data."""

    BASE_URL = "https://api.openf1.org/v1"

    def __init__(self):
        """Initialize the OpenF1 client."""
        self.client = httpx.Client(timeout=10.0)

    def __del__(self):
        """Cleanup HTTP client."""
        if hasattr(self, "client"):
            self.client.close()

    def get_latest_session(self, session_type: str = "Race") -> Optional[Dict[str, Any]]:
        """
        Get the latest session of a given type.

        Args:
            session_type: Type of session (Practice, Qualifying, Race, Sprint)

        Returns:
            Session data or None
        """
        try:
            response = self.client.get(
                f"{self.BASE_URL}/sessions",
                params={"session_type": session_type},
            )
            response.raise_for_status()
            sessions = response.json()

            if sessions:
                # Return most recent session
                return max(sessions, key=lambda x: x.get("date_start", ""))

            return None
        except Exception as e:
            print(f"Error fetching latest session: {e}")
            return None

    def get_session_by_circuit(
        self, circuit_name: str, year: int = 2024, session_type: str = "Race"
    ) -> Optional[Dict[str, Any]]:
        """
        Get session data for a specific circuit.

        Args:
            circuit_name: Short name of circuit (e.g., "Monaco", "Spa-Francorchamps")
            year: Year of the session
            session_type: Type of session

        Returns:
            Session data or None
        """
        try:
            response = self.client.get(
                f"{self.BASE_URL}/sessions",
                params={
                    "circuit_short_name": circuit_name,
                    "year": year,
                    "session_type": session_type,
                },
            )
            response.raise_for_status()
            sessions = response.json()

            return sessions[0] if sessions else None
        except Exception as e:
            print(f"Error fetching session for {circuit_name}: {e}")
            return None

    def get_stints(self, session_key: int) -> List[Dict[str, Any]]:
        """
        Get tire stint data for a session.

        Args:
            session_key: Unique session identifier

        Returns:
            List of stint data
        """
        try:
            response = self.client.get(
                f"{self.BASE_URL}/stints", params={"session_key": session_key}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching stints: {e}")
            return []

    def get_driver_stints(
        self, session_key: int, driver_number: int
    ) -> List[Dict[str, Any]]:
        """
        Get tire stints for a specific driver.

        Args:
            session_key: Unique session identifier
            driver_number: Driver's race number

        Returns:
            List of stint data for the driver
        """
        try:
            response = self.client.get(
                f"{self.BASE_URL}/stints",
                params={"session_key": session_key, "driver_number": driver_number},
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching driver stints: {e}")
            return []

    def get_pit_stops(self, session_key: int) -> List[Dict[str, Any]]:
        """
        Get pit stop data for a session.

        Args:
            session_key: Unique session identifier

        Returns:
            List of pit stop data
        """
        try:
            response = self.client.get(
                f"{self.BASE_URL}/pit", params={"session_key": session_key}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching pit stops: {e}")
            return []

    def analyze_circuit_strategy(
        self, circuit_name: str, year: int = 2024
    ) -> Dict[str, Any]:
        """
        Analyze typical tire strategy for a circuit based on historical data.

        Args:
            circuit_name: Short name of circuit
            year: Year to analyze

        Returns:
            Strategy analysis including common compounds and stint lengths
        """
        session = self.get_session_by_circuit(circuit_name, year)
        if not session:
            return {"error": f"No session found for {circuit_name} {year}"}

        session_key = session["session_key"]
        stints = self.get_stints(session_key)

        if not stints:
            return {"error": "No stint data available"}

        # Analyze stint data
        compound_usage = {}
        stint_lengths = {}
        tire_ages = []

        for stint in stints:
            compound = stint.get("compound", "UNKNOWN")
            lap_start = stint.get("lap_start")
            lap_end = stint.get("lap_end")
            
            # Skip stints with missing lap data
            if lap_start is None or lap_end is None:
                continue
            
            stint_length = lap_end - lap_start + 1
            
            # Skip invalid stints (e.g., lap_end < lap_start or stint_length <= 0)
            if stint_length <= 0:
                continue
            
            tyre_age = stint.get("tyre_age_at_start", 0)

            # Count compound usage
            compound_usage[compound] = compound_usage.get(compound, 0) + 1

            # Track stint lengths by compound
            if compound not in stint_lengths:
                stint_lengths[compound] = []
            stint_lengths[compound].append(stint_length)

            tire_ages.append(tyre_age)

        # Calculate averages
        avg_stint_lengths = {
            compound: sum(lengths) / len(lengths)
            for compound, lengths in stint_lengths.items()
        }

        # Determine most common strategy (number of stops)
        drivers_stints = {}
        for stint in stints:
            driver = stint.get("driver_number")
            if driver not in drivers_stints:
                drivers_stints[driver] = []
            drivers_stints[driver].append(stint)

        stop_counts = {}
        for driver, driver_stints in drivers_stints.items():
            num_stops = len(driver_stints) - 1  # Number of pit stops
            stop_counts[num_stops] = stop_counts.get(num_stops, 0) + 1

        most_common_stops = max(stop_counts.items(), key=lambda x: x[1])[0]

        return {
            "circuit": circuit_name,
            "year": year,
            "session_key": session_key,
            "compound_usage": compound_usage,
            "average_stint_lengths": avg_stint_lengths,
            "most_common_stops": most_common_stops,
            "total_drivers": len(drivers_stints),
            "sample_size": len(stints),
        }

    def get_race_distance(self, circuit_name: str, year: int = 2025) -> Optional[int]:
        """
        Get the race distance (number of laps) for a circuit.

        Note: This is estimated from session data, actual race distance
        should be configured per circuit.

        Args:
            circuit_name: Short name of circuit
            year: Year

        Returns:
            Number of race laps or None
        """
        session = self.get_session_by_circuit(circuit_name, year)
        if not session:
            return None

        # Get session results to find race distance
        try:
            response = self.client.get(
                f"{self.BASE_URL}/session_result",
                params={"session_key": session["session_key"]},
            )
            response.raise_for_status()
            results = response.json()

            if results:
                # Get max laps from any finisher
                laps = [r.get("number_of_laps", 0) for r in results]
                return max(laps) if laps else None

            return None
        except Exception as e:
            print(f"Error fetching race distance: {e}")
            return None


# 2025 F1 Calendar Race Distances (regulation: ~305km except Monaco)
F1_2025_RACE_DISTANCES = {
    "albert-park": 58,  # Australia - 306.124 km
    "jeddah": 50,  # Saudi Arabia - 308.45 km
    "suzuka": 53,  # Japan - 307.471 km
    "shanghai": 56,  # China - 305.066 km
    "miami": 57,  # Miami - 308.326 km
    "imola": 63,  # Emilia Romagna - 309.049 km
    "monaco": 78,  # Monaco - 260.286 km (only street circuit <305km)
    "montreal": 70,  # Canada - 305.27 km
    "catalunya": 66,  # Spain - 307.104 km
    "red-bull-ring": 71,  # Austria - 306.452 km
    "silverstone": 52,  # Great Britain - 306.198 km
    "hungaroring": 70,  # Hungary - 306.63 km
    "spa-francorchamps": 44,  # Belgium - 308.052 km
    "zandvoort": 72,  # Netherlands - 306.587 km
    "monza": 53,  # Italy - 306.72 km
    "baku": 51,  # Azerbaijan - 306.049 km
    "singapore": 62,  # Singapore - 306.143 km
    "austin": 56,  # USA - 308.405 km
    "mexico-city": 71,  # Mexico - 305.354 km
    "interlagos": 71,  # Brazil - 305.879 km
    "las-vegas": 50,  # Las Vegas - 309.958 km
    "losail": 57,  # Qatar - 308.611 km
    "yas-marina": 58,  # Abu Dhabi - 306.183 km
}
