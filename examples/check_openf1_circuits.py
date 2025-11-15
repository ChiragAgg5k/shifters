"""Check what circuits are available in OpenF1 API for 2024."""

import sys
from pathlib import Path
import httpx

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))


def main():
    # Use httpx directly to query all 2024 sessions
    BASE_URL = "https://api.openf1.org/v1"
    
    print("=" * 80)
    print("OpenF1 Circuit Names - 2024 Season")
    print("=" * 80)
    
    try:
        with httpx.Client(timeout=10.0) as client:
            # Get all 2024 sessions
            response = client.get(f"{BASE_URL}/sessions", params={"year": 2024})
            response.raise_for_status()
            sessions = response.json()
    except Exception as e:
        print(f"❌ Error fetching sessions: {e}")
        return
    
    if not sessions:
        print("❌ No sessions found for 2024")
        return
    
    print(f"\n✅ Found {len(sessions)} sessions in 2024\n")
    
    # Extract unique circuits with race sessions
    circuits = {}
    for session in sessions:
        circuit = session.get("circuit_short_name")
        session_type = session.get("session_type")
        session_name = session.get("session_name")
        location = session.get("location")
        country = session.get("country_name")
        date = session.get("date_start", "")[:10]  # Just the date part
        
        if circuit and session_type == "Race":
            if circuit not in circuits:
                circuits[circuit] = {
                    "location": location,
                    "country": country,
                    "date": date,
                    "session_name": session_name,
                    "session_key": session.get("session_key")
                }
    
    # Print table of circuits
    print(f"{'Circuit Name':<30} {'Location':<25} {'Country':<20} {'Date':<12}")
    print("-" * 87)
    
    for circuit, data in sorted(circuits.items()):
        print(f"{circuit:<30} {data['location']:<25} {data['country']:<20} {data['date']:<12}")
    
    print(f"\n{'=' * 87}")
    print(f"Total circuits with race data: {len(circuits)}")
    print("=" * 87)
    
    # Test stint data for a few circuits
    print("\n" + "=" * 80)
    print("Testing Stint Data Availability")
    print("=" * 80 + "\n")
    
    test_circuits = list(circuits.keys())[:3]  # Test first 3 circuits
    
    with httpx.Client(timeout=10.0) as client:
        for circuit_name in test_circuits:
            session_key = circuits[circuit_name]["session_key"]
            print(f"\n📍 {circuit_name} (session_key: {session_key})")
            
            try:
                stint_resp = client.get(f"{BASE_URL}/stints", params={"session_key": session_key})
                stint_resp.raise_for_status()
                stints = stint_resp.json()
                
                pit_resp = client.get(f"{BASE_URL}/pit", params={"session_key": session_key})
                pit_resp.raise_for_status()
                pit_stops = pit_resp.json()
            except Exception as e:
                print(f"   └─ Error: {e}")
                continue
            
            print(f"   └─ Stints: {len(stints) if stints else 0}")
            print(f"   └─ Pit stops: {len(pit_stops) if pit_stops else 0}")
            
            if stints:
                # Show some sample compounds
                compounds = set(s.get("compound") for s in stints if s.get("compound"))
                print(f"   └─ Compounds used: {', '.join(sorted(compounds))}")


if __name__ == "__main__":
    main()
