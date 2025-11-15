# GeoJSON Circuit Data Format

This directory contains GeoJSON files representing real F1 racing circuits.

## Format

Each circuit is represented as a GeoJSON `Feature` with:

- **Type**: `Feature`
- **Properties**: Track metadata (name, country, length, etc.)
- **Geometry**: `LineString` or `MultiLineString` with coordinates

### Coordinate Format

Coordinates are in `[longitude, latitude, elevation]` format:

```json
{
  "type": "Feature",
  "properties": {
    "name": "Circuit Name",
    "country": "Country",
    "length_km": 5.891
  },
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [longitude1, latitude1, elevation1],
      [longitude2, latitude2, elevation2],
      ...
    ]
  }
}
```

### Elevation (Optional)

- If available, include elevation as the third coordinate
- Elevation should be in meters above sea level
- If not available, use 0 or omit (defaults to 0)

## Obtaining Real Circuit Data

### Sources

1. **OpenStreetMap (OSM)**
   - Search for the circuit on openstreetmap.org
   - Export as GeoJSON using tools like:
     - Overpass Turbo (overpass-turbo.eu)
     - JOSM editor
     - osm2geojson Python library

2. **Official Track Data**
   - Some racing organizations publish track data
   - Check FIA, Formula 1, or circuit official websites

3. **GPS Traces**
   - Import GPS traces from races or track days
   - Convert to GeoJSON format

### Example OSM Query (Overpass Turbo)

```
[out:json];
(
  way["sport"="motor"]["name"="Monaco Grand Prix"];
  relation["sport"="motor"]["name"="Monaco Grand Prix"];
);
out geom;
```

## Converting to GeoJSON

### From GPX (GPS)

```python
import gpxpy
import json

with open('track.gpx', 'r') as gpx_file:
    gpx = gpxpy.parse(gpx_file)
    
    coordinates = []
    for track in gpx.tracks:
        for segment in track.segments:
            for point in segment.points:
                coordinates.append([
                    point.longitude,
                    point.latitude,
                    point.elevation or 0
                ])
    
    geojson = {
        "type": "Feature",
        "properties": {"name": "Track Name"},
        "geometry": {
            "type": "LineString",
            "coordinates": coordinates
        }
    }
    
    with open('track.geojson', 'w') as f:
        json.dump(geojson, f, indent=2)
```

### From KML

```python
from fastkml import kml
import json

with open('track.kml', 'r') as kml_file:
    k = kml.KML()
    k.from_string(kml_file.read())
    
    # Extract coordinates from KML
    # Convert to GeoJSON format
    # (implementation depends on KML structure)
```

## Using Circuit Data

### Load a Circuit

```python
from shifters import GeoJSONTrackParser

# Load from file
track = GeoJSONTrackParser.from_geojson_file(
    'data/circuits/monaco.geojson',
    track_name='Circuit de Monaco',
    num_laps=78,
    track_width=12.0
)

# Or from GeoJSON dict
import json
with open('monaco.geojson') as f:
    geojson_data = json.load(f)

track = GeoJSONTrackParser.from_geojson(
    geojson_data,
    track_name='Monaco',
    num_laps=78
)
```

### Add Checkpoints

```python
# By percentage
GeoJSONTrackParser.add_checkpoints_by_percentage(track, [
    (33.3, "Sector 1"),
    (66.6, "Sector 2"),
])

# By distance
GeoJSONTrackParser.add_checkpoints_by_distance(track, [
    (1000, "Turn 1"),
    (2500, "Hairpin"),
])
```

## Available Circuits

- `monaco.geojson` - Circuit de Monaco (Monte Carlo)
- `silverstone.geojson` - Silverstone Circuit (UK)

## Contributing Circuits

To add a new circuit:

1. Obtain accurate GeoJSON data
2. Ensure coordinates follow the format above
3. Name the file `{circuit_name}.geojson`
4. Include relevant metadata in properties
5. Test with the parser before submitting

### Quality Guidelines

- **Accuracy**: Coordinates should represent the actual racing line
- **Detail**: Include enough points to capture corners accurately
  - Recommended: 100-500 points per kilometer
  - More points for technical sections
  - Fewer for long straights
- **Closure**: For circuits, ensure the last coordinate matches the first
- **Direction**: Follow the race direction (clockwise or counter-clockwise)

## Track Properties

The parser automatically calculates:

- Total track length
- Number of segments
- Corner detection (left/right turns)
- Curvature radius for each corner
- Elevation changes
- Segment types (straight, turn, chicane)

## Notes

- Elevation data significantly improves simulation accuracy
- Without elevation, tracks are assumed to be flat (z=0)
- The parser uses Haversine formula for accurate distance calculations
- Local coordinates are calculated using equirectangular projection
- Suitable for tracks up to ~20km length with good accuracy
