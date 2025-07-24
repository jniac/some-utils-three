import { Camera, Object3D, Scene, Vector2, Vector3 } from 'three'

import { Tick, Ticker } from 'some-utils-ts/ticker'
import { Destroyable } from 'some-utils-ts/types'

import { allDescendantsOf } from 'some-utils-ts/iteration/tree'
import { Pointer } from './pointer'

export enum ThreeContextType {
  WebGL = 'webgl',
  WebGPU = 'webgpu',
}

export type QuerySelector<T> =
  | string
  | RegExp
  | ((object: any) => boolean)
  | (new (...args: any) => T)

function solveQuerySelector<T>(selector?: QuerySelector<T>): (object: any) => boolean {
  if (selector === undefined)
    return () => true

  if (selector === null)
    return () => false

  if (typeof selector === 'string')
    return (object: any) => object?.uuid === selector || object?.name === selector || object?.constructor?.name === selector

  if (selector instanceof RegExp)
    return (object: any) => selector.test(object?.name) || selector.test(object?.constructor?.name)

  if (typeof selector === 'function') {
    if (Object3D.prototype.isPrototypeOf(selector.prototype))
      return (object: any) => object instanceof selector

    return (object: any) => (selector as (object: any) => boolean)(object)
  }

  throw new Error('Invalid query selector')
}

const defaultQueryOptions = {
  includeSelf: true,
  visibleOnly: false,
}

type QuerySelectorOptions = Partial<typeof defaultQueryOptions>

class RollingSum {
  #size: number
  #buffer: Float32Array
  #index = 0
  #sum = 0

  constructor(size: number) {
    this.#size = size
    this.#buffer = new Float32Array(size)
  }

  add(value: number): number {
    const oldValue = this.#buffer[this.#index]
    this.#sum += value - oldValue
    this.#buffer[this.#index] = value
    this.#index = (this.#index + 1) % this.#size
    return this.#sum
  }

  get current(): number {
    return this.#buffer[this.#index]
  }

  get sum(): number {
    return this.#sum
  }

  get size(): number {
    return this.#size
  }

  get average(): number {
    return this.#sum / this.#size
  }
}

export class ThreeBaseContext {
  static shared = {
    vector2: new Vector2(),
    vector3: new Vector3(),
  }

  type: ThreeContextType

  // NOTE: The ticker is not explicitly created, but rather is require through a
  // name ("three"). This is to allow the user to use the same ticker, even before
  // it is eventually created here.
  ticker = Ticker.get('three').set({ minActiveDuration: 8 })

  size = new Vector2()
  fullSize = new Vector2()
  pixelRatio = 1
  pointer = new Pointer()
  scene = new Scene()
  camera!: Camera

  skipRender = false
  initialized = false

  domElement!: HTMLElement
  domContainer!: HTMLElement

  #internal = {
    now: 0,
    deltaTimes: new RollingSum(30),
  }

  get aspect() {
    return this.size.x / this.size.y
  }

  get width() {
    return this.size.x
  }

  get height() {
    return this.size.y
  }

  get fullWidth() {
    return this.fullSize.x
  }

  get fullHeight() {
    return this.fullSize.y
  }

  get averageFps() {
    return 1 / this.#internal.deltaTimes.average
  }

  constructor(type: ThreeContextType) {
    this.type = type
    this.#internal.now = performance.now()
  }

  setSize(newSize: Partial<{
    width: number,
    height: number,
    pixelRatio: number
  }>): this {
    const {
      width: newWidth = this.width,
      height: newHeight = this.height,
      pixelRatio: newPixelRatio = this.pixelRatio,
    } = newSize

    if (newWidth === this.width && newHeight === this.height && newPixelRatio === this.pixelRatio)
      return this

    this.size.set(newWidth, newHeight)
    this.fullSize.set(newWidth * newPixelRatio, newHeight * newPixelRatio)
    this.pixelRatio = newPixelRatio

    this.onSetSize()

    return this
  }

  protected onSetSize() { }

  initialize(domContainer: HTMLElement, pointerScope: HTMLElement): Destroyable {
    throw new Error('Not implemented')
  }

  /**
   * Base render function that is called on every tick.
   * 
   * It updates the pointer, traverses the scene and calls `onTick` on each
   * child that has it.
   */
  renderFrame(tick: Tick): void {
    const now = performance.now()

    this.#internal.deltaTimes.add((now - this.#internal.now) / 1e3)
    this.#internal.now = now

    const { scene, pointer } = this

    pointer.updateStart(scene)

    scene.traverse(child => {
      if ('onTick' in child) {
        // call onTick on every child that has it
        (child as any).onTick(tick, this)
      }
    })

    pointer.updateEnd()
  }

  /**
   * `selector` can be a string, a RegExp, a function or a class:
   * - `string` - matches the name, the constructor name or the uuid of the object
   * - `RegExp` - matches the name or constructor name of the object
   * - `function` - a predicate function that takes an object and returns true if it matches
   * - `class` - matches the object if it is an instance of the class
   */
  *queryAll<T extends Object3D>(selector?: QuerySelector<T>, options?: QuerySelectorOptions): Generator<T> {
    const filter = solveQuerySelector(selector)

    const {
      includeSelf,
      visibleOnly,
    } = { ...defaultQueryOptions, ...options }

    const generator = allDescendantsOf(<Object3D>this.scene, {
      includeFirstNode: includeSelf,
      getChildren: (object: Object3D) => object.children,
      skip: (object: Object3D) => !!filter(object) === false || (visibleOnly && object.visible === false),
    })

    for (const { node } of generator) {
      yield node as T
    }
  }

  /**
   * `selector` can be a string, a RegExp, a function or a class:
   * - `string` - matches the name, the constructor name or the uuid of the object
   * - `RegExp` - matches the name or constructor name of the object
   * - `function` - a predicate function that takes an object and returns true if it matches
   * - `class` - matches the object if it is an instance of the class
   */
  queryFirst<T extends Object3D>(selector?: QuerySelector<T>, options?: QuerySelectorOptions): T | null {
    for (const object of this.queryAll<T>(selector, options))
      return object

    return null
  }
}
