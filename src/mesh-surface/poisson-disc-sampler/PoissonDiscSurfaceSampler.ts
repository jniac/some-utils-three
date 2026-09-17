import { Vector2, Vector3 } from 'three'

import { SpatialHashGrid3 } from '../../collections/hash-map'
import { Matrix2 } from '../../math/Matrix2'
import { fromSurfacePointDeclaration, SurfacePoint, SurfacePointDeclaration, SurfaceWalker } from '../surface-walker'

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

  surfaceWalker: SurfaceWalker

  #grid: SpatialHashGrid3<SurfacePoint[]> | null = null

  state = {
    samples: [] as SurfacePoint[],
    openSet: [] as SurfacePoint[],
  }

  constructor(surfaceWalker: SurfaceWalker, params?: Partial<typeof defaultParams>) {
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
    const triangle = this.surfaceWalker.triangle(point.triangleIndex)
    const uLength = triangle.AB.length()
    const vLength = triangle.AC.length()
    const cosAngle = Math.max(
      -1,
      Math.min(1, triangle.AB.dot(triangle.AC) / (uLength * vLength))
    )
    const rectifiedToBarycentric = new Matrix2()
      .set(
        uLength, vLength * cosAngle,
        0, vLength * Math.sqrt(1 - cosAngle * cosAngle)
      )
      .invert()
    const direction = new Vector2()

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const angle = random() * Math.PI * 2
      direction.set(Math.cos(angle), Math.sin(angle))
      rectifiedToBarycentric.applyTo(direction)

      // Sampling uniformly by area in the annulus [radius, 2 * radius].
      const distance = radius * sampleAnnulusRadius(1, 2, random)
      const result = this.surfaceWalker.walk(
        point.triangleIndex,
        [point.u, point.v],
        direction,
        { maxDistance: distance }
      )

      if (result.statusString !== 'MaxDistance') {
        continue
      }

      const candidate = {
        triangleIndex: result.finalTriangleIndex,
        u: result.finalUV.x,
        v: result.finalUV.y,
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
    const position = this.surfaceWalker.surfacePointToPosition(sample)
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
    const candidatePosition = this.surfaceWalker.surfacePointToPosition(candidate)
    const cellX = Math.floor(candidatePosition.x / radius)
    const cellY = Math.floor(candidatePosition.y / radius)
    const cellZ = Math.floor(candidatePosition.z / radius)
    const neighborPosition = new Vector3()
    const samplePosition = new Vector3()

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          neighborPosition.set(
            (cellX + x + 0.5) * radius,
            (cellY + y + 0.5) * radius,
            (cellZ + z + 0.5) * radius
          )
          const bucket = this.#grid!.get(neighborPosition)
          if (!bucket) {
            continue
          }
          for (const sample of bucket) {
            this.surfaceWalker.surfacePointToPosition(sample, samplePosition)
            if (candidatePosition.distanceToSquared(samplePosition) < radiusSq) {
              return false
            }
          }
        }
      }
    }

    return true
  }
}
