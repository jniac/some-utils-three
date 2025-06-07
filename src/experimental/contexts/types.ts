import { Camera, Object3D, Scene, Vector2, Vector3 } from 'three'

import { Ticker } from 'some-utils-ts/ticker'
import { Destroyable } from 'some-utils-ts/types'

import { allDescendantsOf } from 'some-utils-ts/iteration/tree'
import { Pointer } from './pointer'

export enum ThreeContextType {
  WebGL = 'webgl',
  WebGPU = 'webgpu',
}

export type QuerySelector = string | RegExp | ((object: any) => boolean)

function solveQuerySelector(selector?: QuerySelector): (object: any) => boolean {
  if (selector === undefined)
    return () => true

  if (selector === null)
    return () => false

  if (typeof selector === 'string')
    return (object: any) => object?.name === selector || object?.uuid === selector

  if (selector instanceof RegExp)
    return (object: any) => selector.test(object?.name) || selector.test(object?.constructor?.name)

  if (typeof selector === 'function')
    return selector

  throw new Error('Invalid query selector')
}

const defaultQueryOptions = {
  includeSelf: true,
  visibleOnly: false,
}

type QuerySelectorOptions = Partial<typeof defaultQueryOptions>

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

  constructor(type: ThreeContextType) {
    this.type = type
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

  *queryAll<T extends Object3D>(selector?: QuerySelector, options?: QuerySelectorOptions): Generator<T> {
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

  queryFirst<T extends Object3D>(selector?: QuerySelector, options?: QuerySelectorOptions): T | null {
    for (const object of this.queryAll<T>(selector, options))
      return object

    return null
  }
}
