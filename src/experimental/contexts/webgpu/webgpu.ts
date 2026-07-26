import { pass } from 'three/tsl'
import { OrthographicCamera, PerspectiveCamera, RenderPipeline, WebGPURenderer } from 'three/webgpu'

import { handleAnyUserInteraction } from 'some-utils-dom/handle/any-user-interaction'
import { dumpDestroyables } from 'some-utils-ts/misc/destroy'
import { Tick } from 'some-utils-ts/ticker'
import { Destroyable } from 'some-utils-ts/types'

import { RenderFrameOptions, ThreeBaseContext } from '../base'
import { ThreeContextType, TickPhase } from '../types'

export class ThreeWebGPUContext extends ThreeBaseContext {
  renderer = new WebGPURenderer({
    antialias: true,
  })

  perspectiveCamera = new PerspectiveCamera()
  orthographicCamera = new OrthographicCamera()
  camera = this.perspectiveCamera

  pipeline = new RenderPipeline(this.renderer)
  scenePass = pass(this.scene, this.perspectiveCamera)

  private internal = {
    observer: null as ResizeObserver | null,
    destroyables: [] as Destroyable[],
  }

  constructor() {
    super(ThreeContextType.WebGPU)
    this.camera.position.set(0, 1, 10)
    this.camera.lookAt(0, 0, 0)
    this.pointer.updatePosition(this.camera, { x: 0, y: 0 }, this.renderer.domElement.getBoundingClientRect())
  }

  #collectDestroyables(...destroyables: Destroyable[]) {
    this.internal.destroyables.push(...destroyables)
  }

  override getRenderer(): WebGPURenderer {
    return this.renderer
  }

  /**
   * Called from the parent class when the size of the context changes.
   */
  override _onSetSize(): void {
    const {
      size: { x: newWidth, y: newHeight },
      pixelRatio: newPixelRatio,
    } = this

    const { renderer, perspectiveCamera, orthographicCamera } = this
    renderer.setSize(newWidth, newHeight)
    renderer.setPixelRatio(newPixelRatio)

    // pipeline.setSize(newWidth, newHeight, newPixelRatio)

    const aspect = newWidth / newHeight

    perspectiveCamera.aspect = aspect
    perspectiveCamera.updateProjectionMatrix()

    orthographicCamera.left = -aspect
    orthographicCamera.right = aspect
    orthographicCamera.top = 1
    orthographicCamera.bottom = -1
    orthographicCamera.updateProjectionMatrix()
  }

  initialized = false
  /**
   * Initialize the ThreeWebGLContext.
   * @param domContainer The container element for the renderer
   * @param pointerScope The element to listen for pointer events on, defaults to the domContainer but sometimes you might want to listen for pointer events on a different element (eg: document.body).
   * @returns 
   */
  initialize(domContainer: HTMLElement, pointerScope: HTMLElement = domContainer): this {
    if (this.initialized) {
      console.warn('ThreeWebGLContext is already initialized.')
      return this
    }
    Object.defineProperty(this, 'initialized', { value: true, writable: false, configurable: false, enumerable: false })

    const scenePassColor = this.scenePass.getTextureNode('output')
    this.pipeline.outputNode = scenePassColor

    const observer = new ResizeObserver(() => {
      this.setSize({
        width: domContainer.clientWidth,
        height: domContainer.clientHeight,
        pixelRatio: window.devicePixelRatio,
      })
    })
    observer.observe(domContainer)

    const { domElement } = this.renderer
    domElement.style.display = 'block'
    domElement.style.width = '100%'
    domElement.style.height = '100%'
    domContainer.appendChild(domElement)

    this.setSize({
      width: domElement.clientWidth,
      height: domElement.clientHeight,
      pixelRatio: window.devicePixelRatio,
    })

    this.domContainer = domContainer
    this.domElement = domElement

    this.#initializeEnd(pointerScope)

    return this
  }

  async #initializeEnd(pointerScope: HTMLElement) {
    await this.renderer.init()

    this.#collectDestroyables(
      // Request ticker activation:
      handleAnyUserInteraction(document.body, this.ticker.requestActivation),

      // Pointer:
      this.pointer.initialize(this.renderer.domElement, pointerScope, this.camera, this.ticker),

      // Triple tick listeners to ensure the order of operations is correct:
      this.ticker.onTick(
        {
          phase: TickPhase.BeforeUpdate,
          name: 'WebGPU:BeforeUpdate',
        },
        () => this.beforeUpdate(),
      ),
      this.ticker.onTick(
        {
          name: 'WebGPU:Render',
          phase: TickPhase.Render,
        },
        tick => this.renderFrame(tick),
      ),
      this.ticker.onTick(
        {
          name: 'WebGPU:AfterRender',
          phase: TickPhase.AfterRender,
        },
        () => this.afterRender(),
      ),
    )
  }

  renderFrame(tick: Tick, options?: RenderFrameOptions): void {
    if (this._enabled === false && options?.force !== true)
      return

    super.renderFrame(tick, options)

    if (this.skipRender === false) {
      this.pipeline.render()
    }
  }

  destroyed = false
  destroy = () => {
    if (this.destroyed) {
      console.warn('ThreeWebGLContext is already destroyed.')
      return
    }
    Object.defineProperty(this, 'destroyed', { value: true, writable: false, configurable: false, enumerable: false })

    this.renderer.dispose()
    this.internal.observer?.disconnect()
    dumpDestroyables(this.internal.destroyables)
  }
}