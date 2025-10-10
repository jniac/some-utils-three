import { Color, HalfFloatType, IUniform, Mesh, NearestFilter, OrthographicCamera, PlaneGeometry, RGBAFormat, ShaderMaterial, Texture, Vector2, Vector3, Vector4, WebGLRenderer, WebGLRenderTarget } from 'three'

import { fromVector2Declaration } from 'some-utils-three/declaration'
import { Vector2Declaration } from 'some-utils-ts/declaration'

import { glslLibrary } from './glsl'

function createGpuComputeMaterialUniforms() {
  return {
    uTexture: { value: <Texture | null>null },
    uTextureSize: { value: new Vector2() },
    uTime: { value: 0 },
    uDeltaTime: { value: 0 },
  }
}

function inferUniformType(value: any): string {
  if (Array.isArray(value)) {
    if (value.length === 0)
      throw new Error('GpuCompute: cannot infer uniform type for empty array')
    const firstType = inferUniformType(value[0])
    for (let i = 1; i < value.length; i++) {
      const itemType = inferUniformType(value[i])
      if (itemType !== firstType)
        throw new Error('GpuCompute: cannot infer uniform type for array with mixed types')
    }
    return `${firstType}[${value.length}]`
  }

  if (typeof value === 'number') return 'float'
  if (value instanceof Vector2) return 'vec2'
  if (value instanceof Vector3) return 'vec3'
  if (value instanceof Vector4) return 'vec4'
  if (value instanceof Color) return 'vec3'
  if (value instanceof Texture) return 'sampler2D'

  throw new Error(`GpuCompute: cannot infer uniform type for value: ${value}`)
}

function uniformDeclaration(uniforms: { [uniform: string]: IUniform<any> }) {
  return Object.entries(uniforms).map(([name, { value }]) => {
    const type = inferUniformType(value)
    return `uniform ${type} ${name};`
  }).join('\n')
}

const defaultGpuComputeMaterialParams = {
  /**
   * Fragment shader code injected at the top (for functions, etc.)
   */
  fragmentTop: '',
  /**
   * Fragment shader for computing the color (main logic here)
   */
  fragmentColor: /* glsl */`
    gl_FragColor = vec4(vUv, 1., 1.);
  `,
  texture: <Texture | null>null,
  /**
   * Additional uniforms to add to the shader
   */
  uniforms: <{ [uniform: string]: IUniform<any> }>{},
}

export type GpuComputeMaterialParams = Partial<typeof defaultGpuComputeMaterialParams>

/**
 * A ShaderMaterial specialized for GPU computations.
 * 
 * It includes default uniforms and allows custom fragment shader code.
 * 
 * Default uniforms:
 * - uTexture: sampler2D - the input texture
 * - uTextureSize: vec2 - the size of the texture
 * - uTime: float - elapsed time
 * - uDeltaTime: float - time since last frame
 * 
 * You can provide additional uniforms via the `uniforms` parameter.
 * 
 * There are also utility functions and blur functions included:
 * - glsl_utils: common GLSL utility functions
 * - blurGlsl: eg: `gaussianBlur7x7(uv)` function for 7x7 Gaussian blur
 */
export class GpuComputeMaterial extends ShaderMaterial {
  uniforms: { [uniform: string]: IUniform<any> }
  constructor(glslLibs: Iterable<keyof typeof glslLibrary>, userParams?: GpuComputeMaterialParams) {
    const params = { ...defaultGpuComputeMaterialParams, ...userParams }
    const uniforms = {
      ...createGpuComputeMaterialUniforms(),
      ...params.uniforms,
    }
    const glslLibsString = Array.from(glslLibs)
      .map(lib => glslLibrary[lib])
      .filter(v => !!v)
      .join('\n\n')
    uniforms.uTexture.value = params.texture
    super({
      uniforms,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform vec2 uTextureSize;
        uniform float uTime;
        uniform float uDeltaTime;

        ${glslLibsString}

        ${uniformDeclaration(params.uniforms)}

        ${params.fragmentTop}

        void main() {
          ${params.fragmentColor}
        }
      `,
    })
    this.uniforms = uniforms
  }
}

const defaultParams = {
  size: <Vector2Declaration>1024,
  type: HalfFloatType,
}

export type GpuComputeParams = Partial<typeof defaultParams>

/**
 * A class for performing GPU-based computations using fragment shaders.
 * 
 * It manages two render targets to store the current and next state of the simulation.
 * You can define custom shaders for initialization and updating the state.
 */
export class GpuCompute {
  parts = {
    orthoCamera: new OrthographicCamera(-1, 1, 1, -1, 0, 1),
    plane: new Mesh(new PlaneGeometry(2, 2), undefined),
  }

  params: typeof defaultParams

  state: {
    size: Vector2
    rtA: WebGLRenderTarget
    rtB: WebGLRenderTarget
    time: number
    frame: number
    initialMaterial?: GpuComputeMaterial
    updateMaterial?: GpuComputeMaterial
  }

  #innerState?: {
    renderer: WebGLRenderer
  }

  #glslLibs = new Set<keyof typeof glslLibrary>()

  get initialized() { return !!this.#innerState }
  get renderer() { return this.#innerState?.renderer }

  /**
   * Access the uniforms of the update shader (the instance must be initialized first).
   */
  get updateUniforms() {
    if (!this.state.updateMaterial)
      throw new Error('GpuCompute: shaders not set')
    return this.state.updateMaterial.uniforms
  }

  constructor(userParams?: Partial<typeof defaultParams>) {
    const params = { ...defaultParams, ...userParams }
    this.params = params

    const { type } = params
    const size = fromVector2Declaration(params.size)
    const rtA = new WebGLRenderTarget(size.width, size.height, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBAFormat,
      type,
    })
    const rtB = new WebGLRenderTarget(size.width, size.height, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBAFormat,
      type,
    })

    rtA.texture.name = 'GpuCompute.rtA'
    rtB.texture.name = 'GpuCompute.rtB'

    this.state = {
      size,
      rtA,
      rtB,
      time: 0,
      frame: 0,
    }
  }

  enableGlslLib(...libs: (keyof typeof glslLibrary)[]): this {
    for (const lib of libs) {
      if (glslLibrary[lib]) {
        this.#glslLibs.add(lib)
      } else {
        console.warn(`GpuCompute: unknown glsl lib: ${lib}`)
      }
    }
    return this
  }

  /**
   * Initialize the shaders used for the simulation.
   */
  shaders(params: { initial?: GpuComputeMaterialParams, update?: GpuComputeMaterialParams }): this {
    this.state.initialMaterial = new GpuComputeMaterial(this.#glslLibs, params.initial)
    this.state.updateMaterial = new GpuComputeMaterial(this.#glslLibs, params.update)
    return this
  }

  /**
   * Set the renderer and initialize the simulation (run the initial shader once).
   */
  initialize(renderer: WebGLRenderer): this {
    const { orthoCamera, plane } = this.parts
    const { rtA } = this.state

    this.#innerState = { renderer }

    const { initialMaterial } = this.state

    if (initialMaterial) {
      initialMaterial.uniforms.uTextureSize.value.copy(this.state.size)
      initialMaterial.uniforms.uTexture.value = null
      initialMaterial.uniforms.uTime.value = 0
      initialMaterial.uniforms.uDeltaTime.value = 0
      plane.material = initialMaterial
    }

    renderer.setRenderTarget(rtA)
    renderer.render(plane, orthoCamera)
    renderer.setRenderTarget(null)

    this.state.frame = 0

    return this
  }

  /**
   * Update the simulation by running the update shader.
   * 
   * Note:
   * - You must call `initialize()` before calling this method.
   * - You can pass the time since last frame as `deltaTime` (optional, this is used to update the `uTime` and `uDeltaTime` uniforms).
   */
  update(deltaTime = 0): this {
    if (!this.#innerState)
      throw new Error('GpuCompute: not initialized')

    const { renderer } = this.#innerState
    const { orthoCamera, plane } = this.parts
    const { rtA, rtB, time, frame, updateMaterial } = this.state

    this.state.time += deltaTime

    if (updateMaterial) {
      updateMaterial.uniforms.uTextureSize.value.copy(this.state.size)
      updateMaterial.uniforms.uTexture.value = frame % 2 === 0 ? rtA.texture : rtB.texture
      updateMaterial.uniforms.uTime.value = time
      updateMaterial.uniforms.uDeltaTime.value = deltaTime
      updateMaterial.needsUpdate = true
      plane.material = updateMaterial
    }

    renderer.setRenderTarget(frame % 2 === 0 ? rtB : rtA)
    renderer.render(plane, orthoCamera)
    renderer.setRenderTarget(null)

    this.state.frame += 1

    return this
  }

  currentTexture(): Texture {
    return this.state.frame % 2 === 0
      ? this.state.rtA.texture
      : this.state.rtB.texture
  }
}
