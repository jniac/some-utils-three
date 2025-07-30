import { lazy } from 'some-utils-ts/lazy'
import { CubeTexture } from 'three'

export function array<T>(length: number, value: (i: number) => T) {
  return Array.from({ length }, (_, i) => value(i))
}

export function isCubeTexture(texture: any): texture is CubeTexture {
  return !!(texture && texture.isTexture && texture.isCubeTexture)
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0 // hash * 31 + char
  }
  return hash
}

/**
 * Encapsulated inner class for generating random numbers (facilitates reproducibility).
 *
 * Uses a linear congruential generator algorithm.
 * @see https://en.wikipedia.org/wiki/Linear_congruential_generator
 */
export class Random {
  static #max = 0x7fffffff;

  state = 123456;

  get value() {
    return (this.state - 1) / (Random.#max - 1)
  }

  seed(seedArg: string | number = 123456) {
    if (typeof seedArg === 'string')
      seedArg = hashString(seedArg)

    if (Number.isNaN(seedArg))
      throw new Error(`NaN is not a valid seed.`)

    let seed = Number(seedArg)

    if (Math.abs(seed) < 10)
      seed *= 1000000

    seed %= Random.#max
    seed = seed < 0
      ? seed + Random.#max
      : seed

    if (seed > 1)
      this.state = seed

    if (seed === 0)
      this.state = 123456

    return this

  }

  next() {
    this.state = Math.imul(this.state, 48271) & Random.#max
    return this
  }

  random() {
    return this.next().value
  }

  int(min: number, max: number) {
    return Math.floor(this.random() * (max - min + 1)) + min
  }

  float(min: number, max: number) {
    return this.random() * (max - min) + min
  }
}
export const capabilities = lazy(() => {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')

  if (!gl)
    return {}

  const isWebGL2 = gl instanceof WebGL2RenderingContext
  const isFloatTextureSupported = gl.getExtension('OES_texture_float_linear')

  return {
    isWebGL2,
    isFloatTextureSupported,
  }
})

