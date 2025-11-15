/**
 * F1 Track System
 * Port of Python track.py with GeoJSON support
 */

export interface Point3D {
  x: number
  y: number
  z: number
}

export interface TrackSegment {
  startPoint: Point3D
  endPoint: Point3D
  length: number
  curvature: number
  segmentType: 'straight' | 'corner' | 'chicane'
}

export interface Checkpoint {
  id: string
  position: number
  name: string
}

export interface TrackInfo {
  name: string
  length: number
  numLaps: number
  trackType: 'circuit' | 'point_to_point'
  totalDistance: number
  checkpoints: number
  hasGeometry: boolean
  numSegments: number
  coordinates?: Point3D[]
}

export class Track {
  name: string
  length: number
  numLaps: number
  trackType: 'circuit' | 'point_to_point'
  segments: TrackSegment[] = []
  checkpoints: Checkpoint[] = []

  constructor(
    name: string,
    length: number,
    numLaps: number,
    trackType: 'circuit' | 'point_to_point' = 'circuit'
  ) {
    this.name = name
    this.length = length
    this.numLaps = numLaps
    this.trackType = trackType
  }

  /**
   * Add a checkpoint to the track
   */
  addCheckpoint(id: string, position: number, name: string): void {
    this.checkpoints.push({ id, position, name })
  }

  /**
   * Get curvature at a specific position
   */
  getCurvature(position: number): number {
    if (this.segments.length === 0) {
      // No geometry, assume straight
      return 0
    }

    // Find segment at position
    let accumulatedLength = 0
    for (const segment of this.segments) {
      if (position >= accumulatedLength && position < accumulatedLength + segment.length) {
        return segment.curvature
      }
      accumulatedLength += segment.length
    }

    return 0
  }

  /**
   * Check if position has completed a lap
   */
  hasCompletedLap(position: number): boolean {
    if (this.trackType === 'circuit') {
      return position >= this.length
    }
    return false
  }

  /**
   * Normalize position for circuit tracks
   */
  normalizePosition(position: number): number {
    if (this.trackType === 'circuit' && position >= this.length) {
      return position % this.length
    }
    return position
  }

  /**
   * Get progress percentage
   */
  getProgressPercentage(position: number, lap: number): number {
    const totalDistance = this.length * this.numLaps
    const currentDistance = (lap * this.length) + position
    return (currentDistance / totalDistance) * 100
  }

  /**
   * Get track info for visualization
   */
  getInfo(): TrackInfo {
    const info: TrackInfo = {
      name: this.name,
      length: this.length,
      numLaps: this.numLaps,
      trackType: this.trackType,
      totalDistance: this.length * this.numLaps,
      checkpoints: this.checkpoints.length,
      hasGeometry: this.segments.length > 0,
      numSegments: this.segments.length
    }

    if (this.segments.length > 0) {
      info.coordinates = this.segments.map(seg => seg.startPoint)
    }

    return info
  }

  /**
   * Create track from GeoJSON coordinates
   */
  static fromGeoJSON(
    name: string,
    coordinates: number[][],
    numLaps: number
  ): Track {
    if (coordinates.length < 2) {
      throw new Error('Need at least 2 coordinates to create a track')
    }

    // Convert coordinates to local XY
    const points: Point3D[] = []
    const minLon = Math.min(...coordinates.map(c => c[0]))
    const minLat = Math.min(...coordinates.map(c => c[1]))

    for (const coord of coordinates) {
      const lon = coord[0]
      const lat = coord[1]

      // Simple equirectangular projection
      const x = (lon - minLon) * 111320 * Math.cos(lat * Math.PI / 180)
      const y = (lat - minLat) * 110540

      points.push({ x, y, z: 0 })
    }

    // Calculate total length
    let totalLength = 0
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x
      const dy = points[i + 1].y - points[i].y
      totalLength += Math.sqrt(dx * dx + dy * dy)
    }

    // Close the loop for circuits
    const closeDx = points[0].x - points[points.length - 1].x
    const closeDy = points[0].y - points[points.length - 1].y
    totalLength += Math.sqrt(closeDx * closeDx + closeDy * closeDy)

    const track = new Track(name, totalLength, numLaps, 'circuit')

    // Create segments
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i]
      const end = points[i + 1]

      const dx = end.x - start.x
      const dy = end.y - start.y
      const length = Math.sqrt(dx * dx + dy * dy)

      // Calculate curvature using Menger curvature (1/R formula using three points)
      let curvature = 0
      if (i > 0 && i < points.length - 1) {
        const p1 = points[i - 1]
        const p2 = points[i]
        const p3 = points[i + 1]

        // Menger curvature: k = 4 * Area(triangle) / (a * b * c)
        // where a, b, c are the side lengths of the triangle

        // Calculate side lengths
        const a = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
        const b = Math.sqrt((p3.x - p2.x) ** 2 + (p3.y - p2.y) ** 2)
        const c = Math.sqrt((p3.x - p1.x) ** 2 + (p3.y - p1.y) ** 2)

        // Calculate area using cross product
        const area = Math.abs(
          (p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)
        ) / 2

        // Avoid division by zero
        if (a > 0 && b > 0 && c > 0) {
          curvature = (4 * area) / (a * b * c)
        }
      }

      // Determine segment type based on Menger curvature
      // Menger curvature k = 1/R where R is the radius of curvature
      // For track segments:
      //   - Straight: R > 1000m → k < 0.001
      //   - Corner: 50m < R < 1000m → 0.001 < k < 0.02
      //   - Chicane: R < 50m → k > 0.02
      let segmentType: 'straight' | 'corner' | 'chicane' = 'straight'
      if (curvature > 0.001) {
        segmentType = curvature > 0.02 ? 'chicane' : 'corner'
      }

      track.segments.push({
        startPoint: start,
        endPoint: end,
        length,
        curvature,
        segmentType
      })
    }

    // Close the loop
    const loopStart = points[points.length - 1]
    const loopEnd = points[0]
    const loopDx = loopEnd.x - loopStart.x
    const loopDy = loopEnd.y - loopStart.y
    const loopLength = Math.sqrt(loopDx * loopDx + loopDy * loopDy)

    // Calculate curvature for closing segment
    let loopCurvature = 0
    if (points.length > 2) {
      const p1 = points[points.length - 2]
      const p2 = loopStart
      const p3 = loopEnd

      const a = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
      const b = Math.sqrt((p3.x - p2.x) ** 2 + (p3.y - p2.y) ** 2)
      const c = Math.sqrt((p3.x - p1.x) ** 2 + (p3.y - p1.y) ** 2)

      const area = Math.abs(
        (p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)
      ) / 2

      if (a > 0 && b > 0 && c > 0) {
        loopCurvature = (4 * area) / (a * b * c)
      }
    }

    let loopSegmentType: 'straight' | 'corner' | 'chicane' = 'straight'
    if (loopCurvature > 0.001) {
      loopSegmentType = loopCurvature > 0.02 ? 'chicane' : 'corner'
    }

    track.segments.push({
      startPoint: loopStart,
      endPoint: loopEnd,
      length: loopLength,
      curvature: loopCurvature,
      segmentType: loopSegmentType
    })

    return track
  }
}
