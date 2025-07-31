import { BackSide, BoxGeometry, CubeCamera, FloatType, Mesh, RGBAFormat, Scene, ShaderMaterial, UnsignedByteType, WebGLCubeRenderTarget, WebGLRenderer } from 'three'

import { create } from './create'
import { capabilities } from './utils'

export class EnvironmentStudioState {
  time = 0
  deltaTime = 0
  onRender = new Set<() => void>()
  onUpdate = new Set<() => void>()
}

export class EnvironmentStudio {
  static displayName = 'Environment Studio'

  /**
   * Create a render target for the environment studio based on the given texture
   * size AND the current WebGL capabilities (FloatType or not).
   */
  static createRenderTarget(textureSize: number) {
    const cap = capabilities()
    const type = cap.isFloatTextureSupported ? FloatType : UnsignedByteType
    const format = RGBAFormat
    return new WebGLCubeRenderTarget(textureSize, {
      generateMipmaps: true,
      type,
      format,
    })
  }

  static createParts(textureSize: number) {
    const scene = new Scene()
    const altScene = new Scene()

    const rt = EnvironmentStudio.createRenderTarget(textureSize)
    const rt0 = EnvironmentStudio.createRenderTarget(textureSize)
    const rt1 = EnvironmentStudio.createRenderTarget(textureSize)

    rt.texture.name = 'environment-studio'
    rt0.texture.name = 'environment-studio-0'
    rt1.texture.name = 'environment-studio-1'

    const cubeCamera = new CubeCamera(.1, 100, rt)

    const mixScene = new Scene()
    const mixMaterial = new ShaderMaterial({
      uniforms: {
        uAlpha: { value: 0 },
        uEnv0: { value: rt0.texture },
        uEnv1: { value: rt1.texture },
      },
      vertexShader: /* glsl */`
        varying vec3 vWorldDirection;
        void main() {
          vWorldDirection = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        varying vec3 vWorldDirection;
        uniform float uAlpha;
        uniform samplerCube uEnv0;
        uniform samplerCube uEnv1;
        void main() {
          vec4 color0 = texture(uEnv0, vWorldDirection);
          vec4 color1 = texture(uEnv1, vWorldDirection);
          gl_FragColor = mix(color0, color1, uAlpha);
        }
      `,
      side: BackSide,
    })
    const mixCube = new Mesh(new BoxGeometry(2, 2, 2), mixMaterial)
    mixScene.add(mixCube)

    return {
      cubeCamera,
      scene,
      altScene,
      mixScene,
      mixMaterial,
      mixCube,
      rt,
      rt0,
      rt1,
    }
  }

  parts: ReturnType<typeof EnvironmentStudio.createParts>

  #state = new EnvironmentStudioState()

  create = create(this, this.#state)

  get texture() { return this.parts.rt.texture }
  get scene() { return this.parts.scene }

  constructor({ textureSize = 512 } = {}) {
    this.parts = EnvironmentStudio.createParts(textureSize)
  }

  /**
   * Swap the main scene with the alternate scene.
   * 
   * This is useful for rendering two different environments and mixing them:
   * ```
   * studio.create.environmentSphere({ map: texture1 })
   * studio.swapScenes()
   * studio.create.environmentCube({ map: texture2 })
   * studio.renderMix(renderer, 0.5)
   * ```
   */
  swapScenes() {
    const { scene, altScene } = this.parts
    this.parts.scene = altScene
    this.parts.altScene = scene
    return this
  }

  update(deltaTime: number) {
    this.#state.deltaTime = deltaTime

    for (const callback of this.#state.onUpdate)
      callback()

    this.#state.time += deltaTime

    return this
  }

  static renderDefaultOptions = {
    /**
     * Alternative render target to use instead of the main target. Useful for 
     * saving different environments (internal render targets may be updated later).
     */
    altRenderTarget: null as WebGLCubeRenderTarget | null,
  }

  /**
   * Render the main scene.
   * 
   * For mixing environments, use `renderMix` instead.
   */
  render(renderer: WebGLRenderer, options?: Partial<typeof EnvironmentStudio.renderDefaultOptions>) {
    const { altRenderTarget } = { ...EnvironmentStudio.renderDefaultOptions, ...options }

    for (const callback of this.#state.onRender)
      callback()

    const { cubeCamera, scene, rt } = this.parts
    cubeCamera.renderTarget = altRenderTarget ?? rt
    cubeCamera.update(renderer, scene)
    cubeCamera.renderTarget = rt

    return this
  }

  /**
   * Render the 2 scenes (`scene` and `altScene`) and mix them based on the `alpha` value.
   * 
   * Note:
   * - If `alpha` is close to 0, it will render the `scene` directly.
   * - If `alpha` is close to 1, it will render the `altScene` directly.
   * - Otherwise, it will render both scenes and mix them based on the `alpha` value.
   */
  renderMix(renderer: WebGLRenderer, alpha: number, {
    /**
     * Alternative render target to use instead of the main target. Useful for 
     * saving different environments (internal render targets may be updated later).
     */
    altRenderTarget = null as WebGLCubeRenderTarget | null,
  } = {}) {
    // If alpha is close to 0, skip the mix and render the scene directly
    if (alpha < 1e-5) {
      this.render(renderer)
      return this
    }

    // If alpha is close to 1, render the mix scene and swap back
    if (alpha > 1 - 1e-5) {
      this.swapScenes()
      this.render(renderer)
      this.swapScenes()
      return this
    }

    for (const callback of this.#state.onRender)
      callback()

    const { cubeCamera, scene, altScene, mixScene, mixMaterial, rt, rt0, rt1 } = this.parts
    cubeCamera.renderTarget = rt0
    cubeCamera.update(renderer, scene)
    cubeCamera.renderTarget = rt1
    cubeCamera.update(renderer, altScene)

    mixMaterial.uniforms.uEnv0.value = rt0.texture
    mixMaterial.uniforms.uEnv1.value = rt1.texture
    mixMaterial.uniforms.uAlpha.value = alpha
    cubeCamera.renderTarget = altRenderTarget ?? rt
    cubeCamera.update(renderer, mixScene)

    return this
  }

  /**
   * Clear the state of the environment studio, including:
   * - Resetting the time and deltaTime.
   * - Clearing the onRender callbacks.
   * - Clearing the main and alternate scenes (disposing geometries and materials).
   */
  clear() {
    this.#state.onRender.clear()
    this.#state.time = 0
    this.#state.deltaTime = 0

    const clear = (scene: Scene) => {
      scene.traverse(object => {
        if (object instanceof Mesh) {
          object.geometry.dispose()
          object.material.dispose()
        }
      })
      scene.clear()
      scene.background = null
    }

    clear(this.parts.scene)
    clear(this.parts.altScene)

    return this
  }
}