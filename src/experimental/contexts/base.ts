import { Camera, Object3D, Scene, Vector2, Vector3 } from 'three'

import { allDescendantsOf } from 'some-utils-ts/iteration/tree'
import { Tick, Ticker } from 'some-utils-ts/ticker'
import { Destroyable } from 'some-utils-ts/types'

import { Pointer } from './pointer'
import { ThreeContextType } from './types'
import { RollingSum } from './utils/rolling-sum'

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

const renderFrameOptions = {
  /**
   * Should the frame be rendered even if the context is not enabled?
   *
   * Useful for manual control over rendering, such as when implementing
   * a custom rendering loop.
   */
  force: false,
}

export type RenderFrameOptions = Partial<typeof renderFrameOptions>

export class ThreeBaseContext {
  static shared = {
    vector2: new Vector2(),
    vector3: new Vector3(),
  }

  type: ThreeContextType

  protected _enabled = true

  // NOTE: The ticker is not explicitly created, but rather is require through a
  // name ("three"). This is to allow the user to use the same ticker, even before
  // it is eventually created here.
  ticker = Ticker.get('three').set({ minActiveDuration: 8 })

  size = new Vector2()
  fullSize = new Vector2()
  pixelRatio = 1
  pointer = new Pointer()
  /**
   * The main scene for rendering.
   */
  scene = new Scene()
  /**
   * The camera used for rendering.
   */
  camera!: Camera

  skipRender = false
  /**
   * Whether to skip the tick update.
   *
   * Note:
   * - Indispensable for certain effects that requires double rendering
   *   (eg: "foreground" overlay) and avoid double ticking
   */
  skipTickUpdate = false

  initialized = false

  domElement!: HTMLElement
  domContainer!: HTMLElement

  #internal = {
    now: 0,
    deltaTimes: new RollingSum(30),
  }

  get enabled() { return this._enabled }
  set enabled(value) { this._enabled = value }

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

    this._onSetSize()

    return this
  }

  protected _onSetSize() { }

  setScene(scene: Scene): this {
    if (this.scene !== scene) {
      this.scene = scene
      this._onSetScene()
    }
    return this
  }

  protected _onSetScene() { }

  /**
   * Convenience method to set the fullscreen mode.
   */
  setFullscreen(element: 'document' | 'canvas' | HTMLElement | null): this {
    if (typeof element === 'string') {
      switch (element) {
        case 'canvas': {
          element = this.domElement
          break
        }
        case 'document': {
          element = document.documentElement
          break
        }
        default: {
          throw new Error(`Invalid fullscreen element: ${element}`)
        }
      }
    }

    if (document.fullscreenElement === element)
      return this

    if (element === null) {
      document.exitFullscreen()
      return this
    }

    element.requestFullscreen()
    return this
  }

  initialize(domContainer: HTMLElement, pointerScope: HTMLElement): Destroyable {
    throw new Error('Not implemented')
  }

  /**
   * Base render function that is called on every tick.
   * 
   * It updates the pointer, traverses the scene and calls `onTick` on each
   * child that has it.
   */
  renderFrame(tick: Tick, options?: RenderFrameOptions): void {
    if (this._enabled === false && options?.force !== true)
      return

    const now = performance.now()

    this.#internal.deltaTimes.add((now - this.#internal.now) / 1e3)
    this.#internal.now = now

    const { scene, pointer } = this

    pointer.updateStart(scene)

    if (this.skipTickUpdate === false) {
      scene.traverse(child => {
        if ('onTick' in child) {
          // call onTick on every child that has it
          (child as any).onTick(tick, this)
        }
      })
    }

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
