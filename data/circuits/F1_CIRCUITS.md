# F1 Circuits Collection

This directory contains **40 real F1 racing circuits** in a single GeoJSON FeatureCollection.

## File

- **f1-circuits.geojson** - Complete collection of 40 F1 circuits with geographic coordinates

## Quick Start

### List All Circuits

```python
from shifters import GeoJSONTrackParser
import json

with open("data/circuits/f1-circuits.geojson") as f:
    data = json.load(f)

circuits = GeoJSONTrackParser.list_circuits_in_collection(data)
for c in circuits:
    print(f"{c['name']} - {c['location']} ({c['length']}m)")
```

### Load Single Circuit by ID

```python
monaco = GeoJSONTrackParser.from_feature_collection_file(
    "data/circuits/f1-circuits.geojson",
    circuit_id="mc-1929",  # Monaco
    num_laps=78
)
```

### Load by Name

```python
spa = GeoJSONTrackParser.from_feature_collection_file(
    "data/circuits/f1-circuits.geojson",
    circuit_name="Circuit de Spa-Francorchamps",
    num_laps=44
)
```

### Load All Circuits

```python
all_tracks = GeoJSONTrackParser.load_all_circuits(
    "data/circuits/f1-circuits.geojson"
)
monaco = all_tracks["mc-1929"]
```

## Available Circuits (40 Total)

### Current F1 Calendar (2024)
| Circuit                        | ID      | Location    | Length |
| ------------------------------ | ------- | ----------- | ------ |
| Albert Park Circuit            | au-1953 | Melbourne   | 5.28km |
| Bahrain International Circuit  | bh-2002 | Sakhir      | 5.41km |
| Jeddah Corniche Circuit        | sa-2021 | Jeddah      | 6.18km |
| Albert Park Circuit            | au-1953 | Melbourne   | 5.28km |
| Miami International Autodrome  | us-2022 | Miami       | 5.41km |
| Autodromo Enzo e Dino Ferrari  | it-1953 | Imola       | 4.91km |
| Circuit de Monaco              | mc-1929 | Monaco      | 3.34km |
| Circuit de Barcelona-Catalunya | es-1991 | Barcelona   | 4.66km |
| Circuit Gilles-Villeneuve      | ca-1978 | Montreal    | 4.36km |
| Red Bull Ring                  | at-1969 | Spielberg   | 4.32km |
| Silverstone Circuit            | gb-1948 | Silverstone | 5.89km |
| Hungaroring                    | hu-1986 | Budapest    | 4.38km |
| Circuit de Spa-Francorchamps   | be-1925 | Spa         | 7.00km |
| Circuit Zandvoort              | nl-1948 | Zandvoort   | 4.26km |
| Autodromo Nazionale Monza      | it-1922 | Monza       | 5.79km |
| Baku City Circuit              | az-2016 | Baku        | 6.00km |
| Marina Bay Street Circuit      | sg-2008 | Singapore   | 4.93km |
| Circuit of the Americas        | us-2012 | Austin      | 5.51km |
| Autódromo Hermanos Rodríguez   | mx-1962 | Mexico City | 4.30km |
| Autódromo José Carlos Pace     | br-1940 | São Paulo   | 4.31km |
| Las Vegas Street Circuit       | us-2023 | Las Vegas   | 6.20km |
| Losail International Circuit   | qa-2004 | Lusail      | 5.38km |
| Yas Marina Circuit             | ae-2009 | Yas Marina  | 5.28km |

### Historic Circuits
| Circuit                               | ID      | Location     | Length |
| ------------------------------------- | ------- | ------------ | ------ |
| Shanghai International Circuit        | cn-2004 | Shanghai     | 5.45km |
| Hockenheimring                        | de-1932 | Hockenheim   | 4.57km |
| Nürburgring                           | de-1927 | Nürburg      | 5.15km |
| Circuit Paul Ricard                   | fr-1969 | Le Castellet | 5.84km |
| Circuit de Nevers Magny-Cours         | fr-1960 | Magny-Cours  | 4.41km |
| Autódromo do Estoril                  | pt-1972 | Estoril      | 4.35km |
| Sepang International Circuit          | my-1999 | Sepang       | 5.54km |
| Sochi Autodrom                        | ru-2014 | Sochi        | 5.85km |
| Suzuka International Racing Course    | jp-1962 | Suzuka       | 5.81km |
| Intercity Istanbul Park               | tr-2005 | Istanbul     | 5.34km |
| Indianapolis Motor Speedway           | us-1909 | Indianapolis | 4.19km |
| Watkins Glen International            | us-1956 | Dix          | 5.43km |
| Autódromo Internacional Nelson Piquet | br-1977 | Jacarepaguá  | 5.03km |
| Autódromo Oscar y Juan Gálvez         | ar-1952 | Buenos Aires | 4.32km |
| Kyalami Grand Prix Circuit            | za-1961 | Johannesburg | 4.53km |

### Recent Additions
| Circuit                              | ID      | Location | Length |
| ------------------------------------ | ------- | -------- | ------ |
| Autódromo Internacional do Algarve   | pt-2008 | Portimão | 4.65km |
| Autodromo Internazionale del Mugello | it-1914 | Mugello  | 5.25km |
| Circuito de Madring                  | es-2026 | Madrid   | 5.47km |

## Circuit Properties

Each feature includes:

```json
{
  "id": "mc-1929",           // Unique identifier
  "Name": "Circuit de Monaco", // Official name
  "Location": "Monaco",      // City/Country
  "length": 3337,            // Length in meters
  "altitude": 47,            // Elevation (m above sea level)
  "opened": 1929,            // Year opened
  "firstgp": 1929            // First F1 Grand Prix
}
```

## Usage Examples

### Track Analysis

```python
track = GeoJSONTrackParser.from_feature_collection_file(
    "data/circuits/f1-circuits.geojson",
    circuit_id="mc-1929"
)

# Count corners
corners = sum(1 for s in track.segments if s.segment_type in ["left_turn", "right_turn"])

# Find tightest corners
tight = sorted(
    [s for s in track.segments if s.curvature > 0],
    key=lambda s: s.curvature
)[:5]

# Elevation analysis
climb = sum(s.elevation_change for s in track.segments if s.elevation_change > 0)
```

### Circuit Comparison

```python
circuits_to_compare = ["mc-1929", "be-1925", "it-1922", "us-2012"]

for circuit_id in circuits_to_compare:
    track = GeoJSONTrackParser.from_feature_collection_file(
        "data/circuits/f1-circuits.geojson",
        circuit_id=circuit_id
    )
    print(f"{track.name}: {track.length/1000:.2f}km, {len(track.segments)} segments")
```

## Data Format

The file is a GeoJSON FeatureCollection:

```json
{
  "type": "FeatureCollection",
  "bbox": [minLon, minLat, maxLon, maxLat],
  "features": [
    {
      "type": "Feature",
      "properties": {...},
      "geometry": {
        "type": "LineString",
        "coordinates": [[lon, lat, elev], ...]
      }
    }
  ]
}
```

Coordinates are in `[longitude, latitude, elevation]` format (WGS84).

## See Also

- `examples/test_f1_collection.py` - Test loading all circuits
- `examples/f1_circuit_collection_demo.py` - Comprehensive usage guide
- `shifters/environment/geojson_parser.py` - Parser implementation

## Notes

- Coordinates sourced from public GeoJSON racing circuit data
- Not all circuits include precise elevation data
- Track configurations may change over time
- Length values are approximate (official vs. measured)
