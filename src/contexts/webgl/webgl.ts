import { Object3D, PerspectiveCamera, Scene, Vector2, WebGLRenderer } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import { handleAnyUserInteraction } from 'some-utils-dom/handle/anyUserInteraction'
import { destroy } from 'some-utils-ts/misc/destroy'
import { Tick, Ticker } from 'some-utils-ts/ticker'
import { Destroyable } from 'some-utils-ts/types'

import { fromVector3Declaration, Vector3Declaration } from '../../declaration'
import { ThreeContextBase } from '../types'
import { Pointer, PointerButton } from '../utils/pointer'
import { UnifiedLoader } from '../utils/unified-loader'
import { BasicPipeline } from './pipelines/BasicPipeline'

/**
 * A context that provides a WebGLRenderer, a Scene, a Camera, and a Ticker.
 */
export class ThreeWebglContext implements ThreeContextBase {
  width = 300
  height = 150
  pixelRatio = 1

  renderer = new WebGLRenderer()
  perspectiveCamera = new PerspectiveCamera()
  orhtographicCamera = new PerspectiveCamera()
  scene = new Scene()
  gizmoScene = new Scene()
  pointer = new Pointer()

  // NOTE: The ticker is not explicitly created, but rather is require through a
  // name ("three"). This is to allow the user to use the same ticker, even before
  // it is eventually created here.
  ticker = Ticker.get('three').set({ activeDuration: 8 })

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

  loader = new UnifiedLoader()

  constructor() {
    this.camera.position.set(0, 1, 10)
    this.camera.lookAt(0, 0, 0)
  }

  setScene(scene: Scene): void {
    this.scene = scene
    // this.pipeline.setScene(scene)
  }

  useOrbitControls({
    position = null as null | Vector3Declaration,
    target = null as null | Vector3Declaration,
  } = {}): OrbitControls {
    this.internal.orbitControls ??= new OrbitControls(this.camera, this.renderer.domElement)
    if (position) {
      fromVector3Declaration(position, this.internal.orbitControls.object.position)
    }
    if (target) {
      fromVector3Declaration(target, this.internal.orbitControls.target)
    }
    this.internal.orbitControls.update()
    return this.internal.orbitControls
  }

  init(domContainer: HTMLElement): this {
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
    this.internal.destroyables.push(() => {
      observer.disconnect()
    })
    resize()

    // Pointer
    const onPointerMove = (event: PointerEvent) => {
      const rect = this.renderer.domElement.getBoundingClientRect()
      this.pointer.update(this.camera, { x: event.clientX, y: event.clientY }, rect)
    }
    const onPointerDown = (event: PointerEvent) => {
      this.pointer.status.button |= PointerButton.LeftDown
    }
    const onPointerUp = (event: PointerEvent) => {
      this.pointer.status.button &= ~PointerButton.LeftDown
    }
    domContainer.addEventListener('pointermove', onPointerMove)
    domContainer.addEventListener('pointerdown', onPointerDown)
    domContainer.addEventListener('pointerup', onPointerUp)
    this.internal.destroyables.push(() => {
      domContainer.removeEventListener('pointermove', onPointerMove)
      domContainer.removeEventListener('pointerdown', onPointerDown)
      domContainer.removeEventListener('pointerup', onPointerUp)
    })

    // Tick
    this.internal.destroyables.push(
      handleAnyUserInteraction(this.ticker.requestActivation),
      this.ticker.onTick(this.update),
    )

    return this
  }

  destroy = () => {
    destroy(this.internal.destroyables)
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

  update = (tick: Tick) => {
    this.internal.orbitControls?.update(tick.deltaTime)
    this.pipeline.render(tick.deltaTime)
  };

  * findAll(query: string | RegExp | ((object: any) => boolean)) {
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
