"""Debug the Monaco OpenF1 issue."""

import sys
from pathlib import Path
import httpx

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

BASE_URL = "https://api.openf1.org/v1"

# Test Monaco
circuit_name = "Monte Carlo"
year = 2024

print(f"Testing circuit: {circuit_name}, year: {year}")
print("=" * 80)

with httpx.Client(timeout=10.0) as client:
    # Get session
    response = client.get(
        f"{BASE_URL}/sessions",
        params={
            "circuit_short_name": circuit_name,
            "year": year,
            "session_type": "Race",
        },
    )
    response.raise_for_status()
    sessions = response.json()
    
    if not sessions:
        print("❌ No sessions found")
        sys.exit(1)
    
    session = sessions[0]
    session_key = session.get("session_key")
    
    print(f"✅ Session found: {session.get('session_name')}")
    print(f"   Session key: {session_key}")
    print(f"   Date: {session.get('date_start')}")
    
    # Get stints
    print("\nFetching stints...")
    stint_resp = client.get(f"{BASE_URL}/stints", params={"session_key": session_key})
    stint_resp.raise_for_status()
    stints = stint_resp.json()
    
    print(f"✅ Found {len(stints)} stints")
    
    # Show first few stints
    print("\nFirst 3 stints:")
    for i, stint in enumerate(stints[:3]):
        print(f"\nStint {i+1}:")
        for key, value in stint.items():
            print(f"  {key}: {value}")
