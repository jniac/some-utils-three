import { Object3D, PerspectiveCamera, Scene, Vector2, WebGLRenderer } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import { handleAnyUserInteraction } from 'some-utils-dom/handle/any-user-interaction'
import { destroy } from 'some-utils-ts/misc/destroy'
import { Tick, Ticker } from 'some-utils-ts/ticker'
import { Destroyable } from 'some-utils-ts/types'

import { fromVector3Declaration, Vector3Declaration } from '../../../declaration'
import { UnifiedLoader } from '../../../loaders/unified-loader'
import { Pointer } from '../pointer'
import { ThreeBaseContext, ThreeContextType } from '../types'
import { BasicPipeline } from './pipelines/BasicPipeline'

/**
 * A context that provides a WebGLRenderer, a Scene, a Camera, and a Ticker.
 */
export class ThreeWebGLContext implements ThreeBaseContext {
  private static instances: ThreeWebGLContext[] = []
  static current() {
    return this.instances[this.instances.length - 1]
  }

  type = ThreeContextType.WebGPU

  width = 300
  height = 150
  pixelRatio = 1

  renderer = new WebGLRenderer()
  perspectiveCamera = new PerspectiveCamera()
  orhtographicCamera = new PerspectiveCamera()
  scene = new Scene()
  gizmoScene = new Scene()
  pointer = new Pointer()

  skipRender = false

  // NOTE: The ticker is not explicitly created, but rather is require through a
  // name ("three"). This is to allow the user to use the same ticker, even before
  // it is eventually created here.
  ticker = Ticker.get('three').set({ minActiveDuration: 8 })

  pipeline = new BasicPipeline(this.renderer, this.scene, this.gizmoScene, this.perspectiveCamera)

  /** The current camera (perspective or ortho). */
  camera = this.perspectiveCamera

  private internal = {
    size: new Vector2(),
    fullSize: new Vector2(),
    destroyables: [] as Destroyable[],
    orbitControls: null as null | OrbitControls,
  }

  // Accessors:
  get aspect() {
    return this.width / this.height
  }
  get size() {
    return this.internal.size.set(this.width, this.height)
  }
  get fullSize() {
    return this.internal.fullSize.set(this.width * this.pixelRatio, this.height * this.pixelRatio)
  }

  onTick = this.ticker.onTick.bind(this.ticker)

  onDestroy = this.internal.destroyables.push.bind(this.internal.destroyables)

  // NOTE: Same as the ticker, the loader is not explicitly created, but rather is
  // required through a name ("three"). This is to allow the user to use the same
  // loader, even before it is eventually created here.
  loader = UnifiedLoader.get('three')

  constructor() {
    this.camera.position.set(0, 1, 10)
    this.camera.lookAt(0, 0, 0)
    ThreeWebGLContext.instances.push(this)
  }

  setScene(scene: Scene): void {
    this.scene = scene
    // this.pipeline.setScene(scene)
  }

  useOrbitControls({
    position = null as null | Vector3Declaration,
    target = null as null | Vector3Declaration,
    element = null as null | HTMLElement | string,
  } = {}): OrbitControls {
    this.internal.orbitControls ??= new OrbitControls(this.camera, this.renderer.domElement)
    if (typeof element === 'string') {
      element = document.querySelector(element) as HTMLElement | null
    }
    if (element && element !== this.internal.orbitControls.domElement) {
      this.internal.orbitControls.dispose()
      this.internal.orbitControls = new OrbitControls(this.camera, element)
    }
    if (position) {
      fromVector3Declaration(position, this.internal.orbitControls.object.position)
    }
    if (target) {
      fromVector3Declaration(target, this.internal.orbitControls.target)
    }
    this.internal.orbitControls.update()
    return this.internal.orbitControls
  }

  initialized = false
  initialize(domContainer: HTMLElement, pointerScope: HTMLElement = domContainer): this {
    if (this.initialized) {
      console.warn('ThreeWebglContext is already initialized.')
      return this
    }
    Object.defineProperty(this, 'initialized', { value: true, writable: false, configurable: false, enumerable: false })

    const { onDestroy } = this
    domContainer.appendChild(this.renderer.domElement)

    // Resize
    const resize = () => {
      this.setSize({
        width: domContainer.clientWidth,
        height: domContainer.clientHeight,
        pixelRatio: window.devicePixelRatio,
      })
    }
    const observer = new ResizeObserver(resize)
    observer.observe(domContainer)
    onDestroy(() => {
      observer.disconnect()
    })
    resize()

    // Pointer
    onDestroy(this.pointer.initialize(this.renderer.domElement, pointerScope, this.camera, this.ticker))

    // Tick
    onDestroy(
      handleAnyUserInteraction(this.ticker.requestActivation),
      this.ticker.onTick(this.renderFrame),
    )

    // Orbit controls
    onDestroy(() => {
      this.internal.orbitControls?.dispose()
    })

    return this
  }

  destroyed = false
  destroy = () => {
    if (this.destroyed) {
      console.warn('ThreeWebglContext is already destroyed.')
      return
    }
    Object.defineProperty(this, 'destroyed', { value: true, writable: false, configurable: false, enumerable: false })

    destroy(this.internal.destroyables)
    this.internal.destroyables = []
    this.renderer.dispose()
  }

  setSize(size: Partial<{
    width: number,
    height: number,
    pixelRatio: number
  }>): this {
    const { width: newWidth, height: newHeight, pixelRatio: newPixelRatio } = { ...this, ...size }

    if (newWidth === this.width && newHeight === this.height && newPixelRatio === this.pixelRatio) {
      return this
    }

    this.width = newWidth
    this.height = newHeight
    this.pixelRatio = newPixelRatio

    const { renderer, perspectiveCamera, pipeline } = this
    renderer.setSize(newWidth, newHeight)
    renderer.setPixelRatio(newPixelRatio)

    pipeline.setSize(newWidth, newHeight, newPixelRatio)

    const aspect = newWidth / newHeight
    perspectiveCamera.aspect = aspect
    perspectiveCamera.updateProjectionMatrix()

    return this
  }

  renderFrame = (tick: Tick) => {
    const { scene, pipeline, pointer } = this

    this.internal.orbitControls?.update(tick.deltaTime)

    pointer.update(scene)

    scene.traverse(child => {
      if ('onTick' in child) {
        // call onTick on every child that has it
        (child as any).onTick(this.ticker, this)
      }
    })

    if (this.skipRender === false) {
      pipeline.render(tick)
    }

    pointer.updateEnd()
  };

  *findAll(query: string | RegExp | ((object: any) => boolean)) {
    const findDelegate =
      typeof query === 'string' ? (object: any) => object.name === query :
        query instanceof RegExp ? (object: any) => query.test(object.name) :
          query

    const queue = [this.scene] as Object3D[]
    while (queue.length > 0) {
      const object = queue.shift()!
      if (findDelegate(object)) {
        yield object
      }
      queue.push(...object.children)
    }
  }

  find(query: string | RegExp | ((object: any) => boolean)) {
    for (const object of this.findAll(query)) {
      return object
    }
    return null
  }

  isPartOfScene(object: Object3D | null) {
    let current = object
    while (current) {
      if (current === this.scene) {
        return true
      }
      current = current.parent
    }
    return false
  }
}
