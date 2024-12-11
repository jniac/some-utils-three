import { Camera, OrthographicCamera, PerspectiveCamera, Scene, WebGPURenderer } from 'three/webgpu'

import { Ticker } from 'some-utils-ts/ticker'

export class ThreeWebGPUContext {
  width = 300
  height = 150
  pixelRatio = 1

  renderer = new WebGPURenderer({})
  ticker = Ticker.get('three').set({ minActiveDuration: 8 })
  perspectiveCamera = new PerspectiveCamera()
  orhtographicCamera = new OrthographicCamera()
  scene = new Scene()

  camera: Camera = this.perspectiveCamera

  internal = (() => {
    const observer = new ResizeObserver(entries => {
      const { domElement } = this.renderer
      this.setSize({
        width: domElement.clientWidth,
        height: domElement.clientHeight,
        pixelRatio: window.devicePixelRatio,
      })
    })
    observer.observe(this.renderer.domElement)
    return {
      observer,
      cancelTick: null as (() => void) | null,
    }
  })()

  get aspect() { return this.width / this.height }

  constructor() {
    this.camera.position.set(0, 1, 10)
    this.camera.lookAt(0, 0, 0)
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

    console.log('ThreeWebglContext.setSize', { newWidth, newHeight, newPixelRatio })

    return this
  }

  initialized = false
  initialize(domContainer: HTMLElement): this {
    if (this.initialized) {
      console.warn('ThreeWebglContext is already initialized.')
      return this
    }
    Object.defineProperty(this, 'initialized', { value: true, writable: false, configurable: false, enumerable: false })

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
      const { renderer, scene, camera } = this
      renderer.renderAsync(scene, camera)
    }).destroy
    return this
  }

  destroy = () => {
    this.renderer.dispose()
    this.internal.observer.disconnect()
    this.internal.cancelTick?.()
  }
}