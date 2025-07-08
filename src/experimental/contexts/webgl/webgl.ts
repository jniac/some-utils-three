import { Object3D, OrthographicCamera, PerspectiveCamera, Scene, Vector2, WebGLRenderer } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import { handleAnyUserInteraction } from 'some-utils-dom/handle/any-user-interaction'
import { destroy } from 'some-utils-ts/misc/destroy'
import { Tick } from 'some-utils-ts/ticker'
import { Destroyable } from 'some-utils-ts/types'

import { fromVector3Declaration, Vector3Declaration } from '../../../declaration'
import { UnifiedLoader } from '../../../loaders/unified-loader'
import { queryDescendantsOf } from '../../../utils/tree'
import { ThreeBaseContext, ThreeContextType } from '../types'
import { BasicPipeline } from './pipelines/BasicPipeline'

/**
 * A context that provides a WebGLRenderer, a Scene, a Camera, and a Ticker.
 */
export class ThreeWebGLContext extends ThreeBaseContext {
  private static instances: ThreeWebGLContext[] = []
  static current() {
    return this.instances[this.instances.length - 1]
  }

  renderer = new WebGLRenderer()
  perspectiveCamera = new PerspectiveCamera()
  orthographicCamera = new OrthographicCamera()
  camera = this.perspectiveCamera

  gizmoScene = new Scene()

  pipeline = new BasicPipeline(this.renderer, this.scene, this.gizmoScene, this.perspectiveCamera)

  private internal = {
    size: new Vector2(),
    fullSize: new Vector2(),
    destroyables: [] as Destroyable[],
    orbitControls: null as null | OrbitControls,
  }

  // Accessors:

  onTick = this.ticker.onTick.bind(this.ticker)

  onDestroy = this.internal.destroyables.push.bind(this.internal.destroyables)

  // NOTE: Same as the ticker, the loader is not explicitly created, but rather is
  // required through a name ("three"). This is to allow the user to use the same
  // loader, even before it is eventually created here.
  loader = UnifiedLoader.get('three')

  constructor() {
    super(ThreeContextType.WebGL)
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
    if (typeof element === 'string') {
      element = document.querySelector(element) as HTMLElement | null
    }
    this.internal.orbitControls ??= new OrbitControls(this.camera, element)
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
      console.warn('ThreeWebGLContext is already initialized.')
      return this
    }
    Object.defineProperty(this, 'initialized', { value: true, writable: false, configurable: false, enumerable: false })

    const { onDestroy } = this
    const { domElement } = this.renderer
    domContainer.appendChild(domElement)

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
    onDestroy(this.pointer.initialize(domElement, pointerScope, this.camera, this.ticker))

    // Tick
    onDestroy(
      handleAnyUserInteraction(this.ticker.requestActivation),
      this.ticker.onTick(tick => this.renderFrame(tick)),
    )

    // Orbit controls
    onDestroy(() => {
      this.internal.orbitControls?.dispose()
    })

    this.domContainer = domContainer
    this.domElement = domElement

    return this
  }

  destroyed = false
  destroy = () => {
    if (this.destroyed) {
      console.warn('ThreeWebGLContext is already destroyed.')
      return
    }
    Object.defineProperty(this, 'destroyed', { value: true, writable: false, configurable: false, enumerable: false })

    destroy(this.internal.destroyables)
    this.internal.destroyables = []
    this.renderer.dispose()
  }

  /**
   * Called from the parent class when the size of the context changes.
   */
  override onSetSize(): void {
    const {
      size: { x: newWidth, y: newHeight },
      pixelRatio: newPixelRatio,
    } = this
    const { renderer, perspectiveCamera, pipeline } = this
    renderer.setSize(newWidth, newHeight)
    renderer.setPixelRatio(newPixelRatio)

    pipeline.setSize(newWidth, newHeight, newPixelRatio)

    const aspect = newWidth / newHeight
    perspectiveCamera.aspect = aspect
    perspectiveCamera.updateProjectionMatrix()
  }

  override renderFrame(tick: Tick): void {
    this.internal.orbitControls?.update(tick.deltaTime)

    super.renderFrame(tick)

    if (this.skipRender === false) {
      this.pipeline.render(tick)
    }
  };

  *findAll(query: string | RegExp | ((object: any) => boolean), options?: Parameters<typeof queryDescendantsOf>[2]) {
    const findDelegate =
      typeof query === 'string' ? (object: any) => object.name === query :
        query instanceof RegExp ? (object: any) => query.test(object.name) :
          query

    yield* queryDescendantsOf(this.scene, findDelegate, options)
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
