import { SpatialHashGrid3 } from '../../collections/hash-map'
import {
  fromSurfacePointDeclaration,
  OptimizedSurfaceWalker,
  OptimizedWalkResult,
  SurfacePoint,
  SurfacePointDeclaration,
  WalkStatus,
} from '../surface-walker'

function sampleAnnulusRadius(
  r1: number,
  r2: number,
  random = Math.random,
): number {
  const radius = Math.sqrt(
    r1 * r1 + random() * (r2 * r2 - r1 * r1)
  )
  return radius
}

const defaultParams = {
  /**
   * The minimum distance between samples.
   * @default 1
   */
  radius: 1,

  /**
   * The maximum number of samples to generate.
   * @default 1000
   */
  maxCount: 1000,

  /**
   * The maximum number of attempts to find a valid sample.
   * @default 23
   */
  maxAttempts: 23,

  /**
   * The random function to use. By default, Math.random is used.
   * @default Math.random
   */
  random: Math.random,
}

export class PoissonDiscSurfaceSampler {
  params!: typeof defaultParams

  surfaceWalker: OptimizedSurfaceWalker

  #grid: SpatialHashGrid3<SurfacePoint[]> | null = null

  state = {
    samples: [] as SurfacePoint[],
    openSet: [] as SurfacePoint[],
    walkResult: null as OptimizedWalkResult | null,
    direction: { x: 0, y: 0 },
    candidatePosition: { x: 0, y: 0, z: 0 },
    neighborPosition: { x: 0, y: 0, z: 0 },
    samplePosition: { x: 0, y: 0, z: 0 },
  }

  constructor(surfaceWalker: OptimizedSurfaceWalker, params?: Partial<typeof defaultParams>) {
    this.surfaceWalker = surfaceWalker
    this.setParams({ ...defaultParams, ...params })
  }

  get samples(): SurfacePoint[] {
    return this.state.samples
  }

  setParams(params: Partial<typeof defaultParams>): this {
    this.params = { ...this.params, ...params }
    return this
  }

  start(originArg: SurfacePointDeclaration): this {
    const origin = { ...fromSurfacePointDeclaration(originArg) }
    this.state.samples = [origin]
    this.state.openSet = [origin]
    this.state.walkResult = null
    this.#grid = null
    return this
  }

  sampleAll(): this {
    const { samples, openSet } = this.state
    this.#rebuildGrid()

    while (samples.length < this.params.maxCount && openSet.length > 0) {
      const randomIndex = Math.floor(this.params.random() * openSet.length)
      const randomPoint = openSet[randomIndex]
      const sample = this.#nextSample(randomPoint)
      if (sample) {
        samples.push(sample)
        openSet.push(sample)
        this.#addToGrid(sample)
      } else {
        openSet.splice(randomIndex, 1)
      }
    }
    return this
  }

  #nextSample(point: SurfacePoint): SurfacePoint | null {
    const { maxAttempts, radius, random } = this.params
    const { metrics } = this.surfaceWalker.state
    const metricOffset = point.triangleIndex * 3
    const uLength = Math.sqrt(metrics[metricOffset])
    const rectifiedVx = metrics[metricOffset + 1] / uLength
    const rectifiedVy = Math.sqrt(Math.max(
      0,
      metrics[metricOffset + 2] - rectifiedVx * rectifiedVx,
    ))
    const { direction } = this.state

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const angle = random() * Math.PI * 2
      const rectifiedX = Math.cos(angle)
      const rectifiedY = Math.sin(angle)
      direction.x = rectifiedX / uLength
        - rectifiedVx * rectifiedY / (uLength * rectifiedVy)
      direction.y = rectifiedY / rectifiedVy

      // Sampling uniformly by area in the annulus [radius, 2 * radius].
      const distance = radius * sampleAnnulusRadius(1, 2, random)
      const result = this.state.walkResult
        ? this.surfaceWalker.walk(point, direction, distance, undefined, this.state.walkResult)
        : this.surfaceWalker.walk(point, direction, distance)
      this.state.walkResult = result

      if (result.status !== WalkStatus.MaxDistance) {
        continue
      }

      const candidate = {
        triangleIndex: result.point.triangleIndex,
        x: result.point.x,
        y: result.point.y,
      }
      if (this.#isValid(candidate)) {
        return candidate
      }
    }

    return null
  }

  #rebuildGrid(): void {
    this.#grid = new SpatialHashGrid3<SurfacePoint[]>(this.params.radius)
    for (const sample of this.state.samples) {
      this.#addToGrid(sample)
    }
  }

  #addToGrid(sample: SurfacePoint): void {
    const position = this.surfaceWalker.surfacePointToPosition(
      sample,
      this.state.candidatePosition,
    )
    const bucket = this.#grid!.get(position)
    if (bucket) {
      bucket.push(sample)
    } else {
      this.#grid!.set(position, [sample])
    }
  }

  #isValid(candidate: SurfacePoint): boolean {
    const { radius } = this.params
    const radiusSq = radius * radius
    const {
      candidatePosition,
      neighborPosition,
      samplePosition,
    } = this.state
    this.surfaceWalker.surfacePointToPosition(candidate, candidatePosition)
    const cellX = Math.floor(candidatePosition.x / radius)
    const cellY = Math.floor(candidatePosition.y / radius)
    const cellZ = Math.floor(candidatePosition.z / radius)

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          neighborPosition.x = (cellX + x + 0.5) * radius
          neighborPosition.y = (cellY + y + 0.5) * radius
          neighborPosition.z = (cellZ + z + 0.5) * radius
          const bucket = this.#grid!.get(neighborPosition)
          if (!bucket) {
            continue
          }
          for (const sample of bucket) {
            this.surfaceWalker.surfacePointToPosition(sample, samplePosition)
            const dx = candidatePosition.x - samplePosition.x
            const dy = candidatePosition.y - samplePosition.y
            const dz = candidatePosition.z - samplePosition.z
            if (dx * dx + dy * dy + dz * dz < radiusSq) {
              return false
            }
          }
        }
      }
    }

    return true
  }
}
