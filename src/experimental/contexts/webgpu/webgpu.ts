import { pass } from 'three/tsl'
import { Camera, OrthographicCamera, PerspectiveCamera, PostProcessing, Scene, WebGPURenderer } from 'three/webgpu'

import { handleAnyUserInteraction } from 'some-utils-dom/handle/any-user-interaction'
import { Ticker } from 'some-utils-ts/ticker'

import { Pointer } from '../pointer'
import { ThreeBaseContext, ThreeContextType } from '../types'

export class ThreeWebGPUContext implements ThreeBaseContext {
  type = ThreeContextType.WebGPU

  width = 300
  height = 150
  pixelRatio = 1

  ticker = Ticker.get('three').set({ minActiveDuration: 8 })

  pointer = new Pointer()

  renderer = new WebGPURenderer({
    antialias: true,
  })
  perspectiveCamera = new PerspectiveCamera()
  orhtographicCamera = new OrthographicCamera()
  scene = new Scene()

  postProcessing = new PostProcessing(this.renderer)
  scenePass = pass(this.scene, this.perspectiveCamera)

  camera: Camera = this.perspectiveCamera

  domContainer!: HTMLElement
  domElement!: HTMLElement

  skipRender = false

  private internal = {
    observer: null as ResizeObserver | null,
    cancelRequestActivation: null as (() => void) | null,
    cancelTick: null as (() => void) | null,
    cancelPointer: null as (() => void) | null,
  }

  get aspect() { return this.width / this.height }

  constructor() {
    this.camera.position.set(0, 1, 10)
    this.camera.lookAt(0, 0, 0)
    this.pointer.updatePosition(this.camera, { x: 0, y: 0 }, this.renderer.domElement.getBoundingClientRect())
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

    const { renderer, perspectiveCamera, orhtographicCamera } = this
    renderer.setSize(newWidth, newHeight)
    renderer.setPixelRatio(newPixelRatio)

    // pipeline.setSize(newWidth, newHeight, newPixelRatio)

    const aspect = newWidth / newHeight

    perspectiveCamera.aspect = aspect
    perspectiveCamera.updateProjectionMatrix()

    orhtographicCamera.left = -aspect
    orhtographicCamera.right = aspect
    orhtographicCamera.top = 1
    orhtographicCamera.bottom = -1
    orhtographicCamera.updateProjectionMatrix()

    return this
  }

  initialized = false
  /**
   * Initialize the ThreeWebglContext.
   * @param domContainer The container element for the renderer
   * @param pointerScope The element to listen for pointer events on, defaults to the domContainer but sometimes you might want to listen for pointer events on a different element (eg: document.body).
   * @returns 
   */
  initialize(domContainer: HTMLElement, pointerScope: HTMLElement = domContainer): this {
    if (this.initialized) {
      console.warn('ThreeWebglContext is already initialized.')
      return this
    }
    Object.defineProperty(this, 'initialized', { value: true, writable: false, configurable: false, enumerable: false })

    const scenePassColor = this.scenePass.getTextureNode('output')
    this.postProcessing.outputNode = scenePassColor

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

    this.internal.cancelTick = this.ticker.onTick(() => {
      this.renderFrame()
    }).destroy

    this.internal.cancelRequestActivation = handleAnyUserInteraction(document.body, this.ticker.requestActivation).destroy

    this.internal.cancelPointer = this.pointer.initialize(this.renderer.domElement, pointerScope, this.camera, this.ticker)

    this.domContainer = domContainer
    this.domElement = domElement

    return this
  }

  renderFrame() {
    const { scene, postProcessing, pointer } = this

    pointer.update(scene)

    scene.traverse(child => {
      if ('onTick' in child) {
        // call onTick on every child that has it
        (child as any).onTick(this.ticker, this)
      }
    })

    if (this.skipRender === false) {
      // renderer.renderAsync(scene, camera)
      postProcessing.renderAsync()
    }

    pointer.updateEnd()
  }

  destroyed = false
  destroy = () => {
    if (this.destroyed) {
      console.warn('ThreeWebglContext is already destroyed.')
      return
    }
    Object.defineProperty(this, 'destroyed', { value: true, writable: false, configurable: false, enumerable: false })

    this.renderer.dispose()
    this.internal.observer?.disconnect()
    this.internal.cancelTick?.()
    this.internal.cancelRequestActivation?.()
    this.internal.cancelPointer?.()
  }
}