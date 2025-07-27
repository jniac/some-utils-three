import { BackSide, BoxGeometry, Color, ColorRepresentation, CubeCamera, FloatType, Group, IcosahedronGeometry, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, PlaneGeometry, PointLight, RGBAFormat, Scene, ShaderMaterial, SphereGeometry, TorusGeometry, UnsignedByteType, Vector3Tuple, WebGLCubeRenderTarget, WebGLRenderer } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/Addons.js'

import { lazy } from 'some-utils-ts/lazy'
import { ShaderForge } from '../shader-forge'
import { flipNormals } from '../utils/geometry/normals'
import { setup } from '../utils/tree'

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0 // hash * 31 + char
  }
  return hash
}

function array<T>(length: number, value: (i: number) => T) {
  return Array.from({ length }, (_, i) => value(i))
}

function isWebGL2Supported() {
  try {
    const canvas = document.createElement('canvas')
    return !!(window.WebGL2RenderingContext && canvas.getContext('webgl2'))
  } catch (e) {
    return false
  }
}

/**
 * Encapsulated inner class for generating random numbers (facilitates reproducibility).
 * 
 * Uses a linear congruential generator algorithm.
 * @see https://en.wikipedia.org/wiki/Linear_congruential_generator
 */
class Random {
  static #max = 0x7fffffff

  state = 123456

  get value() {
    return (this.state - 1) / (Random.#max - 1)
  }

  seed(seedArg: string | number = 123456) {
    if (typeof seedArg === 'string')
      seedArg = hashString(seedArg)

    if (Number.isNaN(seedArg))
      throw new Error(`NaN is not a valid seed.`)

    let seed = Number(seedArg)

    if (Math.abs(seed) < 10)
      seed *= 1000000

    seed %= Random.#max
    seed = seed < 0
      ? seed + Random.#max
      : seed

    if (seed > 1)
      this.state = seed

    if (seed === 0)
      this.state = 123456

    return this

  }

  next() {
    this.state = Math.imul(this.state, 48271) & Random.#max
    return this
  }

  random() {
    return this.next().value
  }

  int(min: number, max: number) {
    return Math.floor(this.random() * (max - min + 1)) + min
  }

  float(min: number, max: number) {
    return this.random() * (max - min) + min
  }
}

const capabilities = lazy(() => {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')

  if (!gl)
    return {}

  const isWebGL2 = gl instanceof WebGL2RenderingContext
  const isFloatTextureSupported = gl.getExtension('OES_texture_float_linear')

  return {
    isWebGL2,
    isFloatTextureSupported,
  }
})

export class EnvironmentStudio {
  static displayName = 'Environment Studio'

  static createParts(textureSize: number) {
    const scene = new Scene()

    const cap = capabilities()
    const type = cap.isFloatTextureSupported ? FloatType : UnsignedByteType

    const rt = new WebGLCubeRenderTarget(textureSize, {
      generateMipmaps: true,
      type,
      format: RGBAFormat,
    })
    const cubeCamera = new CubeCamera(.1, 100, rt)
    return {
      rt,
      cubeCamera,
      scene,
    }
  }

  parts: ReturnType<typeof EnvironmentStudio.createParts>

  #state = {
    time: 0,
    deltaTime: 0,
    onRender: new Set<() => void>(),
  }

  get texture() { return this.parts.rt.texture }
  get scene() { return this.parts.scene }

  constructor({ textureSize = 512 } = {}) {
    this.parts = EnvironmentStudio.createParts(textureSize)
  }

  render(renderer: WebGLRenderer, deltaTime = 1 / 60) {
    this.#state.deltaTime = deltaTime

    for (const callback of this.#state.onRender)
      callback()

    const { cubeCamera, scene, rt } = this.parts
    cubeCamera.update(renderer, scene)

    this.#state.time += deltaTime

    return rt.texture
  }

  clear() {
    this.#state.onRender.clear()
    this.#state.time = 0
    this.#state.deltaTime = 0
    this.parts.scene.traverse(object => {
      if (object instanceof Mesh) {
        object.geometry.dispose()
        object.material.dispose()
      }
    })
    this.parts.scene.clear()
    return this
  }

  createSolidCube({
    size = 10,
    color = '#eeeeee',
  } = {}) {
    const { scene } = this.parts
    const geometry = flipNormals(new BoxGeometry(size, size, size))
    const material = new MeshBasicMaterial({ color })
    return {
      cube: setup(new Mesh(geometry, material),
        { parent: scene })
    }
  }

  createCube({
    size = 10,
    faceColors = [
      '#eeeeee',
      '#eeeeee',
      '#eeeeee',
      '#eeeeee',
      '#eeeeee',
      '#eeeeee',
    ],
  } = {}) {
    const { scene } = this.parts
    const planeGeometry = new PlaneGeometry(size, size)
    const d = size / 2
    const faces = {
      R: setup(new Mesh(planeGeometry, new MeshPhysicalMaterial({ color: faceColors[0] })),
        { parent: scene, position: [d, 0, 0], rotation: [0, -Math.PI / 2, 0] }),
      L: setup(new Mesh(planeGeometry, new MeshPhysicalMaterial({ color: faceColors[1] })),
        { parent: scene, position: [-d, 0, 0], rotation: [0, Math.PI / 2, 0] }),
      U: setup(new Mesh(planeGeometry, new MeshPhysicalMaterial({ color: faceColors[2] })),
        { parent: scene, position: [0, d, 0], rotation: [Math.PI / 2, 0, 0] }),
      D: setup(new Mesh(planeGeometry, new MeshPhysicalMaterial({ color: faceColors[3] })),
        { parent: scene, position: [0, -d, 0], rotation: [-Math.PI / 2, 0, 0] }),
      B: setup(new Mesh(planeGeometry, new MeshPhysicalMaterial({ color: faceColors[4] })),
        { parent: scene, position: [0, 0, -d] }),
      F: setup(new Mesh(planeGeometry, new MeshPhysicalMaterial({ color: faceColors[5] })),
        { parent: scene, position: [0, 0, d], rotation: [0, Math.PI, 0] }),
    }
    return {
      faces,
    }
  }

  createRoundedCube({
    size = 10,
    color = '#eeeeee',
    radius = 1,
    segments = 32,
  } = {}) {
    const { scene } = this.parts
    const geometry = flipNormals(new RoundedBoxGeometry(size, size, size, segments, radius))
    const material = new MeshPhysicalMaterial({ color })
    return {
      roundedCube: setup(new Mesh(geometry, material),
        { parent: scene })
    }
  }

  createSphere({
    color = '#eeeeee',
    size = 10,
  } = {}) {
    const geometry = flipNormals(new IcosahedronGeometry(size * 1.33 / 2, 8))
    const material = new MeshPhysicalMaterial({ color })
    return {
      sphere: setup(new Mesh(geometry, material), this.parts.scene),
    }
  }

  createGradientSphere({
    colors = <ColorRepresentation[]>['#eeeeee', '#dddddd'],
    intensities = <number[]>[1, 1],
    size = 10,
    gradientPower = 1,
  } = {}) {
    const geometry = new IcosahedronGeometry(size * 1.33 / 2, 8)

    const safeIntensities = array(colors.length, i => {
      const intensity = intensities[i]
      return intensity === undefined || Number.isNaN(intensity) ? 1 : intensity
    })
    const material = new ShaderMaterial({
      uniforms: {
        uColors: { value: colors.map(color => new Color(color)) },
        uIntensities: { value: safeIntensities },
        uGradientPower: { value: gradientPower },
      },
      vertexShader: /* glsl */`
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        varying vec3 vNormal;
        uniform vec3 uColors[${colors.length}];
        uniform float uIntensities[${colors.length}];
        uniform float uGradientPower;
        float easeInOut(float x, float power) {
          power = max(power, 0.0001);
          float x1 = pow(x, power);
          float x2 = pow(1.0 - x, power);
          return x1 / (x1 + x2);
        }
        void main() {
          float t = (vNormal.y + 1.0) / 2.0; // Map y from [-1, 1] to [0, 1]
          int maxIndex = ${colors.length - 1};
          int index0 = int(t * float(maxIndex));
          int index1 = min(index0 + 1, maxIndex);
          t = fract(t * float(maxIndex));
          ${gradientPower === 1 ? '' : `t = easeInOut(t, uGradientPower);`}
          vec3 color = mix(uColors[index0], uColors[index1], t);
          float intensity = mix(uIntensities[index0], uIntensities[index1], t);
          gl_FragColor = vec4(color * intensity, 1.0);
        }
      `,
      side: BackSide,
    })
    return {
      sphere: setup(new Mesh(geometry, material), this.parts.scene),
    }
  }

  createGround({
    size = 10,
    color = '#eeeeee',
  } = {}) {
    const { scene } = this.parts
    const geometry = new PlaneGeometry(size * 1.5, size * 1.5, 1, 1)
    const material = new MeshPhysicalMaterial({ color })
    return {
      ground: setup(new Mesh(geometry, material), {
        parent: scene,
        position: [0, -size / 2, 0],
        rotation: [-Math.PI / 2, 0, 0],
      }),
    }
  }

  createThreeLights({
    size = 10,
    mainColor = <ColorRepresentation>'#ffffff',
    mainNuanceColor = <ColorRepresentation>'#c5c5f2',
    backLeftColor = <ColorRepresentation>'#e6d499',
    backRightColor = <ColorRepresentation>'#9bcddd',
    whiteFactor = 0,
    intensity: intensityScale = 1,
  } = {}) {
    const { scene } = this.parts
    const s = size / 10
    const white = new Color('white')
    const light = (color: ColorRepresentation, position: Vector3Tuple, intensity: number, {
      positionScalar = 1,
      distance = 12,
    } = {}) => {
      const light = new PointLight(color, intensity * intensityScale, distance * s, 2)
      light.color.lerp(white, whiteFactor)
      light.position.set(...position).multiplyScalar(s * positionScalar)
      scene.add(light)
      return light
    }
    return {
      mainLight: light(mainColor, [2, 2.5, 1], 30),
      mainNuanceColor: light(mainNuanceColor, [1, 2, 1], 10, { positionScalar: 1.5 }),
      backLeftLight: light(backLeftColor, [-2, -2, -2], 20, { positionScalar: 1.35 }),
      backRightLight: light(backRightColor, [2, -1, -2], 20, { positionScalar: 1.15 }),
      backLeftLight2: light(backLeftColor, [-1, -2, 0], 6, { distance: 20 }),
      backRightLight2: light(backRightColor, [1, -1, 0], 6, { distance: 20 }),
    }
  }

  createDebugColorCube({
    size = 10,
    faceColors = [
      '#ff1428',
      '#ff1428',
      '#42d674',
      '#42d674',
      '#1e0dd2',
      '#1e0dd2',
    ],
  } = {}) {
    const { scene } = this.parts
    const s = size / 10
    setup(new PointLight('#ffffff', 20, 15 * s, 2),
      { parent: scene, position: [1 * s, 3 * s, 2 * s] })

    const debugColors = [
      '#2288dd',
      '#dd8822',
      '#22dd88',
      '#8822dd',
      '#dd2288',
      '#88dd22',
    ]

    const sphereGeometry = new IcosahedronGeometry(.5, 6)
    const debugColorSpheres = debugColors.map((color, i) => {
      return setup(new Mesh(sphereGeometry, new MeshBasicMaterial({ color })), {
        parent: scene,
        position: [3 * s, (i - 2.5) * s, 0],
      })
    })
    const debugGreySpheres = debugColors.map((_, i) => {
      const t = i / (debugColors.length - 1)
      const color = new Color(t, t, t)
      const sphereGeometry = new IcosahedronGeometry(.5, 6)
      return setup(new Mesh(sphereGeometry, new MeshBasicMaterial({ color })), {
        parent: scene,
        position: [-3 * s, (i - 2.5) * s, 0],
      })
    })

    return {
      debugColorSpheres,
      debugGreySpheres,
      ...this.createCube({
        size,
        faceColors,
      })
    }
  }

  randomGradientTorus({
    seed = 123456,
    size = 10,
    animation = true,
  } = {}) {
    const random = new Random().seed(seed)
    const randomAngle = () => random.float(0, Math.PI * 2)
    const s = size / 10
    const torusGeometry = new TorusGeometry(6 * s, 1 * s, 12, 128)
    const sphereGeometry = new SphereGeometry(1 * s)
    const material = new MeshPhysicalMaterial({})
    material.onBeforeCompile = shader => ShaderForge.with(shader)
      .defines('USE_UV')
      .fragment.after('color_fragment', /* glsl */`
        diffuseColor.rgb *= vUv.x;
      `)
    const toruses = array(16, i => {
      const radiusScale = random.float(1, 4)
      const group = setup(new Group(), this.parts.scene)
      const torusMesh = setup(new Mesh(torusGeometry, material), {
        parent: group,
        position: [random.float(-1, 1) * s, random.float(-1, 1) * s, random.float(-1, 1) * s],
        scale: [radiusScale, radiusScale, radiusScale * 1.5],
        rotation: [randomAngle(), randomAngle(), randomAngle(), 'YXZ'],
      })
      array(3, j => {
        const angle = randomAngle()
        const x = Math.cos(angle) * 4 * s
        const y = Math.sin(angle) * 4 * s
        setup(new Mesh(sphereGeometry, material), {
          parent: group,
          position: [x, y, 0],
          scale: random.float(0.5, 1.5),
          rotation: [randomAngle(), randomAngle(), randomAngle(), 'ZXY'],
        })
      })
      return {
        group,
        torusMesh,
      }
    })
    if (animation) {
      this.#state.onRender.add(() => {
        random.seed(seed)
        for (const { group, torusMesh } of toruses) {
          group.rotation.y += random.float(-1, 1) * .05 * this.#state.deltaTime
          torusMesh.rotation.z += random.float(-1, 1) * .1 * this.#state.deltaTime
        }
      })
    }
  }
}