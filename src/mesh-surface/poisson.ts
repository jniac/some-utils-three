import { fromSurfacePointDeclaration, SurfacePoint, SurfacePointDeclaration, SurfaceWalker } from './surface-walker'

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

  state = {
    samples: [] as SurfacePoint[],
    openSet: [] as SurfacePoint[],
  }

  constructor(surfaceWalker: SurfaceWalker, params?: Partial<typeof defaultParams>) {
    this.surfaceWalker = surfaceWalker
    this.setParams({ ...defaultParams, ...params })
  }

  setParams(params: Partial<typeof defaultParams>): this {
    this.params = { ...this.params, ...params }
    return this
  }

  start(originArg: SurfacePointDeclaration): this {
    const origin = fromSurfacePointDeclaration(originArg)
    this.state.samples = [origin]
    this.state.openSet = [origin]
    return this
  }

  sampleAll(): this {
    const { samples, openSet } = this.state
    while (samples.length < this.params.maxCount && openSet.length > 0) {
      const randomIndex = Math.floor(this.params.random() * openSet.length)
      const randomPoint = openSet[randomIndex]
      const sample = this.#nextSample(randomPoint)
      if (sample) {
        samples.push(sample)
        openSet.push(sample)
      } else {
        openSet.splice(randomIndex, 1)
      }
    }
    return this
  }

  #nextSample(point: SurfacePoint): SurfacePoint | null {
    // Implement the logic to generate the next sample on the surface
    // Return a new SurfaceSample if successful, otherwise return null
    return null
  }
} 