"""GeoJSON parser for importing real racing circuit data."""

from typing import List, Dict, Any, Optional, Tuple
import json
import math
from shifters.environment.track import Track, TrackSegment, Point3D, Checkpoint


class GeoJSONTrackParser:
    """
    Parse GeoJSON data to create Track objects with real geographic coordinates.

    Supports:
    - Single Feature with LineString/MultiLineString geometry
    - FeatureCollection with multiple circuit features
    """

    # Earth radius in meters (for coordinate conversions)
    EARTH_RADIUS = 6371000.0

    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate distance between two geographic coordinates using Haversine formula.

        Args:
            lat1, lon1: First point (latitude, longitude in degrees)
            lat2, lon2: Second point (latitude, longitude in degrees)

        Returns:
            Distance in meters
        """
        # Convert to radians
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)

        # Haversine formula
        a = (
            math.sin(delta_lat / 2) ** 2
            + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
        )
        c = 2 * math.asin(math.sqrt(a))

        return GeoJSONTrackParser.EARTH_RADIUS * c

    @staticmethod
    def lat_lon_to_xy(
        lat: float, lon: float, origin_lat: float, origin_lon: float
    ) -> Tuple[float, float]:
        """
        Convert latitude/longitude to local x/y coordinates (meters from origin).

        Uses equirectangular projection for small areas (suitable for race tracks).

        Args:
            lat, lon: Point to convert
            origin_lat, origin_lon: Origin point (typically track start)

        Returns:
            (x, y) in meters from origin
        """
        # Convert to radians
        lat_rad = math.radians(lat)
        origin_lat_rad = math.radians(origin_lat)
        delta_lon = math.radians(lon - origin_lon)
        delta_lat = math.radians(lat - origin_lat)

        # Equirectangular projection
        x = (
            delta_lon
            * math.cos((origin_lat_rad + lat_rad) / 2)
            * GeoJSONTrackParser.EARTH_RADIUS
        )
        y = delta_lat * GeoJSONTrackParser.EARTH_RADIUS

        return x, y

    @staticmethod
    def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate bearing between two points.

        Args:
            lat1, lon1: First point
            lat2, lon2: Second point

        Returns:
            Bearing in degrees (0-360)
        """
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lon = math.radians(lon2 - lon1)

        x = math.sin(delta_lon) * math.cos(lat2_rad)
        y = math.cos(lat1_rad) * math.sin(lat2_rad) - math.sin(lat1_rad) * math.cos(
            lat2_rad
        ) * math.cos(delta_lon)

        bearing = math.atan2(x, y)
        return (math.degrees(bearing) + 360) % 360

    @staticmethod
    def detect_segment_type(
        prev_bearing: Optional[float],
        curr_bearing: float,
        next_bearing: Optional[float],
    ) -> str:
        """
        Detect if segment is straight or a turn based on bearing changes.

        Args:
            prev_bearing: Bearing from previous segment
            curr_bearing: Current bearing
            next_bearing: Bearing to next segment

        Returns:
            Segment type: "straight", "left_turn", or "right_turn"
        """
        if prev_bearing is None or next_bearing is None:
            return "straight"

        # Calculate bearing changes
        angle_change = next_bearing - curr_bearing
        # Normalize to -180 to 180
        if angle_change > 180:
            angle_change -= 360
        elif angle_change < -180:
            angle_change += 360

        # Threshold for detecting turns (degrees)
        turn_threshold = 5.0

        if abs(angle_change) < turn_threshold:
            return "straight"
        elif angle_change > 0:
            return "left_turn"
        else:
            return "right_turn"

    @staticmethod
    def calculate_curvature(p1: Point3D, p2: Point3D, p3: Point3D) -> float:
        """
        Estimate radius of curvature from three consecutive points.

        Args:
            p1, p2, p3: Three consecutive points

        Returns:
            Radius of curvature in meters (0 for straight)
        """
        # Calculate distances
        a = p1.distance_2d(p2)
        b = p2.distance_2d(p3)
        c = p1.distance_2d(p3)

        # Avoid division by zero
        if a < 0.1 or b < 0.1 or c < 0.1:
            return 0.0

        # Use Menger curvature formula
        # Area of triangle using Heron's formula
        s = (a + b + c) / 2
        area_squared = s * (s - a) * (s - b) * (s - c)

        if area_squared <= 0:
            return 0.0

        area = math.sqrt(area_squared)

        # Radius of curvature
        if area < 0.001:
            return 0.0

        radius = (a * b * c) / (4 * area)
        return radius

    @classmethod
    def from_geojson(
        cls,
        geojson_data: Dict[str, Any],
        track_name: str = "Custom Track",
        num_laps: int = 1,
        track_width: float = 12.0,
        smoothing_window: int = 3,
    ) -> Track:
        """
        Create a Track from GeoJSON data.

        Args:
            geojson_data: GeoJSON dict with geometry (LineString or MultiLineString)
            track_name: Name for the track
            num_laps: Number of laps for racing
            track_width: Track width in meters
            smoothing_window: Number of points for smoothing calculations

        Returns:
            Track object with segments based on GeoJSON coordinates
        """
        # Extract coordinates from GeoJSON
        coordinates = cls._extract_coordinates(geojson_data)

        if not coordinates:
            raise ValueError("No valid coordinates found in GeoJSON data")

        # Use first coordinate as origin for local coordinate system
        origin_lon, origin_lat = coordinates[0][:2]

        # Convert all coordinates to local x,y system
        points = []
        for coord in coordinates:
            lon, lat = coord[0], coord[1]
            elevation = coord[2] if len(coord) > 2 else 0.0

            x, y = cls.lat_lon_to_xy(lat, lon, origin_lat, origin_lon)
            points.append(Point3D(x, y, elevation))

        # Create segments from points
        segments = cls._create_segments_from_points(
            points, track_width, smoothing_window
        )

        # Calculate total length
        total_length = sum(seg.length for seg in segments)

        # Create track
        track = Track(
            length=total_length,
            num_laps=num_laps,
            track_type="circuit",
            name=track_name,
            segments=segments,
        )

        return track

    @classmethod
    def from_geojson_file(
        cls,
        filepath: str,
        track_name: Optional[str] = None,
        num_laps: int = 1,
        track_width: float = 12.0,
    ) -> Track:
        """
        Load track from a GeoJSON file.

        Args:
            filepath: Path to GeoJSON file
            track_name: Optional track name (uses filename if not provided)
            num_laps: Number of laps
            track_width: Track width in meters

        Returns:
            Track object
        """
        with open(filepath, "r", encoding="utf-8") as f:
            geojson_data = json.load(f)

        if track_name is None:
            import os

            track_name = os.path.splitext(os.path.basename(filepath))[0]

        return cls.from_geojson(geojson_data, track_name, num_laps, track_width)

    @classmethod
    def _extract_coordinates(cls, geojson_data: Dict[str, Any]) -> List[List[float]]:
        """Extract coordinate array from GeoJSON structure."""
        # Handle Feature
        if geojson_data.get("type") == "Feature":
            geometry = geojson_data.get("geometry", {})
        # Handle FeatureCollection
        elif geojson_data.get("type") == "FeatureCollection":
            features = geojson_data.get("features", [])
            if not features:
                return []
            geometry = features[0].get("geometry", {})
        # Handle direct Geometry
        else:
            geometry = geojson_data

        geom_type = geometry.get("type")
        coords = geometry.get("coordinates", [])

        if geom_type == "LineString":
            return coords
        elif geom_type == "MultiLineString":
            # Concatenate all line strings
            all_coords = []
            for line in coords:
                all_coords.extend(line)
            return all_coords
        elif geom_type == "Polygon":
            # Use outer ring
            return coords[0] if coords else []
        else:
            return []

    @classmethod
    def _create_segments_from_points(
        cls,
        points: List[Point3D],
        track_width: float,
        smoothing_window: int,
    ) -> List[TrackSegment]:
        """
        Create track segments from a list of points.

        Args:
            points: List of Point3D coordinates
            track_width: Track width in meters
            smoothing_window: Window size for smoothing calculations

        Returns:
            List of TrackSegment objects
        """
        if len(points) < 2:
            raise ValueError("Need at least 2 points to create segments")

        segments = []

        for i in range(len(points) - 1):
            start_point = points[i]
            end_point = points[i + 1]

            # Calculate segment length
            segment_length = start_point.distance_2d(end_point)

            if segment_length < 0.1:  # Skip very short segments
                continue

            # Determine segment type and curvature
            segment_type = "straight"
            curvature = 0.0

            # Use surrounding points for better curvature estimation
            if i > 0 and i < len(points) - 2:
                prev_point = points[max(0, i - smoothing_window)]
                next_point = points[min(len(points) - 1, i + 1 + smoothing_window)]

                curvature = cls.calculate_curvature(prev_point, start_point, next_point)

                # Determine turn direction using cross product
                v1 = (end_point.x - start_point.x, end_point.y - start_point.y)
                v2 = (next_point.x - end_point.x, next_point.y - end_point.y)
                cross = v1[0] * v2[1] - v1[1] * v2[0]

                if curvature > 20:  # Minimum radius for a corner
                    segment_type = "left_turn" if cross > 0 else "right_turn"

            # Calculate elevation change
            elevation_change = end_point.z - start_point.z

            # Create segment
            segment = TrackSegment(
                id=f"seg_{i:04d}",
                start_point=start_point,
                end_point=end_point,
                segment_type=segment_type,
                length=segment_length,
                curvature=curvature,
                banking=0.0,  # Banking not available from GeoJSON
                elevation_change=elevation_change,
                width=track_width,
                name=f"Segment {i+1}",
            )

            segments.append(segment)

        return segments

    @staticmethod
    def add_checkpoints_by_distance(
        track: Track, checkpoint_distances: List[Tuple[float, str]]
    ):
        """
        Add checkpoints to a track at specific distances.

        Args:
            track: Track object to add checkpoints to
            checkpoint_distances: List of (distance, name) tuples
        """
        for distance, name in checkpoint_distances:
            if 0 <= distance <= track.length:
                coords = track.get_coordinates_at_position(distance)
                track.add_checkpoint(
                    checkpoint_id=f"cp_{len(track.checkpoints)}",
                    position=distance,
                    name=name,
                    coordinates=coords,
                )

    @staticmethod
    def add_checkpoints_by_percentage(
        track: Track, checkpoint_percentages: List[Tuple[float, str]]
    ):
        """
        Add checkpoints at percentage positions along the track.

        Args:
            track: Track object
            checkpoint_percentages: List of (percentage, name) tuples (0-100)
        """
        for percentage, name in checkpoint_percentages:
            distance = (percentage / 100.0) * track.length
            coords = track.get_coordinates_at_position(distance)
            track.add_checkpoint(
                checkpoint_id=f"cp_{len(track.checkpoints)}",
                position=distance,
                name=name,
                coordinates=coords,
            )

    @classmethod
    def list_circuits_in_collection(
        cls, geojson_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        List all circuits in a FeatureCollection.

        Args:
            geojson_data: GeoJSON data (FeatureCollection)

        Returns:
            List of circuit info dicts with 'id', 'name', 'location', 'length', etc.
        """
        if geojson_data.get("type") != "FeatureCollection":
            raise ValueError(
                "Expected FeatureCollection, got {}".format(geojson_data.get("type"))
            )

        circuits = []
        for feature in geojson_data.get("features", []):
            props = feature.get("properties", {})
            circuits.append(
                {
                    "id": props.get("id"),
                    "name": props.get("Name"),
                    "location": props.get("Location"),
                    "length": props.get("length"),
                    "altitude": props.get("altitude"),
                    "opened": props.get("opened"),
                    "firstgp": props.get("firstgp"),
                }
            )

        return circuits

    @classmethod
    def from_feature_collection(
        cls,
        geojson_data: Dict[str, Any],
        circuit_id: Optional[str] = None,
        circuit_name: Optional[str] = None,
        num_laps: int = 1,
        track_width: float = 12.0,
    ) -> Track:
        """
        Load a specific circuit from a FeatureCollection.

        Args:
            geojson_data: GeoJSON FeatureCollection data
            circuit_id: Circuit ID to load (e.g., "mc-1929" for Monaco)
            circuit_name: Circuit name to load (e.g., "Circuit de Monaco")
            num_laps: Number of laps
            track_width: Track width in meters

        Returns:
            Track object

        Raises:
            ValueError: If circuit not found or neither ID nor name provided
        """
        if geojson_data.get("type") != "FeatureCollection":
            # If it's a single Feature, use the regular from_geojson method
            return cls.from_geojson(geojson_data, circuit_name, num_laps, track_width)

        if circuit_id is None and circuit_name is None:
            raise ValueError("Must provide either circuit_id or circuit_name")

        # Find the matching feature
        feature = None
        for f in geojson_data.get("features", []):
            props = f.get("properties", {})

            if circuit_id and props.get("id") == circuit_id:
                feature = f
                break
            elif circuit_name and props.get("Name") == circuit_name:
                feature = f
                break

        if feature is None:
            available = cls.list_circuits_in_collection(geojson_data)
            raise ValueError(
                f"Circuit not found. Available circuits: {[c['name'] for c in available]}"
            )

        # Extract track name from properties
        props = feature.get("properties", {})
        track_name = props.get("Name", circuit_id or circuit_name)

        # Create a temporary GeoJSON with just this feature
        single_feature_geojson = {
            "type": "Feature",
            "properties": props,
            "geometry": feature.get("geometry"),
        }

        return cls.from_geojson(
            single_feature_geojson, track_name, num_laps, track_width
        )

    @classmethod
    def from_feature_collection_file(
        cls,
        filepath: str,
        circuit_id: Optional[str] = None,
        circuit_name: Optional[str] = None,
        num_laps: int = 1,
        track_width: float = 12.0,
    ) -> Track:
        """
        Load a specific circuit from a FeatureCollection GeoJSON file.

        Args:
            filepath: Path to GeoJSON file containing FeatureCollection
            circuit_id: Circuit ID to load (e.g., "mc-1929" for Monaco)
            circuit_name: Circuit name to load (e.g., "Circuit de Monaco")
            num_laps: Number of laps
            track_width: Track width in meters

        Returns:
            Track object
        """
        with open(filepath, "r", encoding="utf-8") as f:
            geojson_data = json.load(f)

        return cls.from_feature_collection(
            geojson_data, circuit_id, circuit_name, num_laps, track_width
        )

    @classmethod
    def load_all_circuits(
        cls,
        filepath: str,
        num_laps: int = 1,
        track_width: float = 12.0,
    ) -> Dict[str, Track]:
        """
        Load all circuits from a FeatureCollection file.

        Args:
            filepath: Path to GeoJSON file containing FeatureCollection
            num_laps: Number of laps for each track
            track_width: Track width in meters

        Returns:
            Dictionary mapping circuit IDs to Track objects
        """
        with open(filepath, "r", encoding="utf-8") as f:
            geojson_data = json.load(f)

        if geojson_data.get("type") != "FeatureCollection":
            raise ValueError("Expected FeatureCollection")

        tracks = {}
        for feature in geojson_data.get("features", []):
            props = feature.get("properties", {})
            circuit_id = props.get("id")
            circuit_name = props.get("Name", circuit_id)

            try:
                track = cls.from_feature_collection(
                    geojson_data,
                    circuit_id=circuit_id,
                    num_laps=num_laps,
                    track_width=track_width,
                )
                tracks[circuit_id] = track
                print(f"Loaded: {circuit_name} ({circuit_id})")
            except Exception as e:
                print(f"Failed to load {circuit_name} ({circuit_id}): {e}")

        return tracks
