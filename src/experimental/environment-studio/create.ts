import { BackSide, BoxGeometry, Color, ColorRepresentation, Group, IcosahedronGeometry, Material, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, PlaneGeometry, PointLight, ShaderMaterial, SphereGeometry, Texture, TorusGeometry, Vector3Tuple } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/Addons.js'

import { ShaderForge } from '../../shader-forge'
import { flipNormals } from '../../utils/geometry/normals'
import { setup } from '../../utils/tree'

import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { setVertexColors } from '../../utils/geometry'
import { EnvironmentStudio, EnvironmentStudioState } from './environment-studio'
import { array, isCubeTexture, Random } from './utils'

/**
 * Return a set of utility functions to create various 3D objects in the environment studio.
 * 
 * For commodity, the creation functions are bound to the `instance` of `EnvironmentStudio`
 * into a `create` object.
 */
export function create(instance: EnvironmentStudio, instanceState: EnvironmentStudioState) {
  /**
   * Set of utility functions to create various 3D objects in the environment studio.
   */
  const create = {
    solidCube({
      size = 10,
      color = '#eeeeee',
    } = {}) {
      const { scene } = instance.parts
      const geometry = flipNormals(new BoxGeometry(size, size, size))
      const material = new MeshBasicMaterial({ color })
      return {
        cube: setup(new Mesh(geometry, material),
          { parent: scene })
      }
    },

    cube({
      size = 10,
      faceColors = [
        '#eeeeee',
        '#eeeeee',
        '#eeeeee',
        '#eeeeee',
        '#eeeeee',
        '#eeeeee',
      ],
      MaterialClass = MeshPhysicalMaterial as new (...args: any[]) => Material,
    } = {}) {
      const { scene } = instance.parts
      const planeGeometry = new PlaneGeometry(size, size)
      const d = size / 2
      const faces = {
        R: setup(new Mesh(planeGeometry, new MaterialClass({ color: faceColors[0] })),
          { parent: scene, position: [d, 0, 0], rotation: [0, -Math.PI / 2, 0] }),
        L: setup(new Mesh(planeGeometry, new MaterialClass({ color: faceColors[1] })),
          { parent: scene, position: [-d, 0, 0], rotation: [0, Math.PI / 2, 0] }),
        U: setup(new Mesh(planeGeometry, new MaterialClass({ color: faceColors[2] })),
          { parent: scene, position: [0, d, 0], rotation: [Math.PI / 2, 0, 0] }),
        D: setup(new Mesh(planeGeometry, new MaterialClass({ color: faceColors[3] })),
          { parent: scene, position: [0, -d, 0], rotation: [-Math.PI / 2, 0, 0] }),
        F: setup(new Mesh(planeGeometry, new MaterialClass({ color: faceColors[5] })),
          { parent: scene, position: [0, 0, d], rotation: [0, Math.PI, 0] }),
        B: setup(new Mesh(planeGeometry, new MaterialClass({ color: faceColors[4] })),
          { parent: scene, position: [0, 0, -d] }),
      }
      return {
        faces,
      }
    },

    roundedCube({
      size = 10,
      color = '#eeeeee',
      radius = 1,
      segments = 32,
    } = {}) {
      const { scene } = instance.parts
      const geometry = flipNormals(new RoundedBoxGeometry(size, size, size, segments, radius))
      const material = new MeshPhysicalMaterial({ color })
      return {
        roundedCube: setup(new Mesh(geometry, material),
          { parent: scene })
      }
    },

    sphere({
      color = '#eeeeee',
      size = 10,
    } = {}) {
      const geometry = flipNormals(new IcosahedronGeometry(size * 1.33 / 2, 8))
      const material = new MeshPhysicalMaterial({ color })
      return {
        sphere: setup(new Mesh(geometry, material), instance.parts.scene),
      }
    },

    gradientSphere({
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
        sphere: setup(new Mesh(geometry, material), instance.parts.scene),
      }
    },

    /**
     * Create a sphere that can be used as an environment map.
     * 
     * Note:
     * - The map will be projected "equirectangularly" onto the sphere.
     */
    environmentSphere({
      size = 10,
      map = null as null | Texture,
    }) {
      const geometry = new SphereGeometry(size * 1.33 / 2, 8, 8)
      const material = new MeshBasicMaterial({
        map,
        side: BackSide,
        depthWrite: false,
      })
      const sphere = setup(new Mesh(geometry, material), instance.parts.scene)
      return { sphere }
    },

    /**
     * Create a cube that can be used as an environment map.
     * 
     * Note:
     * - The map will be applied on each face of the cube.
     */
    environmentCube({
      size = 10,
      map = null as null | Texture,
      colorFallback = '#808080' as ColorRepresentation,
    }) {
      const { scene } = instance.parts
      const depthWrite = false

      if (map === null) {
        const geometry = new BoxGeometry(size, size, size)
        const material = new MeshBasicMaterial({ color: colorFallback, depthWrite, side: BackSide })
        const cube = setup(new Mesh(geometry, material), scene)
        return { cube }
      }

      if (isCubeTexture(map)) {
        const material = new ShaderMaterial({
          uniforms: {
            uMap: { value: map },
          },
          vertexShader: /* glsl */`
            varying vec3 vWorldNormal;

            void main() {
              vec4 worldPosition = modelMatrix * vec4(position, 1.0);
              vWorldNormal = normalize(mat3(modelMatrix) * worldPosition.xyz);
              gl_Position = projectionMatrix * viewMatrix * worldPosition;
            }          
          `,
          fragmentShader: /* glsl */`
            uniform samplerCube uMap;
            varying vec3 vWorldNormal;

            void main() {
              vec4 color = textureCube(uMap, vWorldNormal);
              gl_FragColor = color;
            }
          `,
          side: BackSide,
          depthWrite,
        })
        const geometry = new BoxGeometry(size, size, size)
        const cube = setup(new Mesh(geometry, material), scene)
        return { cube }
      }

      const material = new MeshBasicMaterial({ map, depthWrite })
      const geometry = new BoxGeometry(size, size, size)
        .scale(1, 1, -1) // Mirror the z-axis to match the cube texture orientation
      const cube = setup(new Mesh(geometry, material), scene)
      return { cube }
    },

    ground({
      size = 10,
      color = '#eeeeee',
    } = {}) {
      const { scene } = instance.parts
      const geometry = new PlaneGeometry(size * 1.5, size * 1.5, 1, 1)
      const material = new MeshPhysicalMaterial({ color })
      return {
        ground: setup(new Mesh(geometry, material), {
          parent: scene,
          position: [0, -size / 2, 0],
          rotation: [-Math.PI / 2, 0, 0],
        }),
      }
    },

    threeLights({
      size = 10,
      mainColor = <ColorRepresentation>'#ffffff',
      mainNuanceColor = <ColorRepresentation>'#c5c5f2',
      backLeftColor = <ColorRepresentation>'#e6d499',
      backRightColor = <ColorRepresentation>'#9bcddd',
      whiteFactor = 0,
      intensity: intensityScale = 1,
    } = {}) {
      const { scene } = instance.parts
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
    },

    debugColorCube({
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
      const { scene } = instance.parts
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

      const createSymbolGeometry = (symbol: '+' | '-' | 'x' | 'y' | 'z') => {
        const THICKNESS = 0.2
        switch (symbol) {
          case '-': {
            return new PlaneGeometry(.8, THICKNESS)
          }
          case '+': {
            return mergeGeometries([
              new PlaneGeometry(.8, THICKNESS),
              new PlaneGeometry(.8, THICKNESS).rotateZ(Math.PI / 2),
            ], false)
          }
          case 'x': {
            return mergeGeometries([
              new PlaneGeometry(THICKNESS, 1.414213).rotateZ(Math.PI / 4),
              new PlaneGeometry(THICKNESS, 1.414213).rotateZ(-Math.PI / 4),
            ], false)
          }
          case 'y': {
            return mergeGeometries([
              new PlaneGeometry(THICKNESS, .5).translate(0, -.25, 0),
              new PlaneGeometry(THICKNESS, .65).rotateZ(Math.PI / 4).translate(-.2, .25, 0),
              new PlaneGeometry(THICKNESS, .65).rotateZ(-Math.PI / 4).translate(.2, .25, 0),
            ], false)
          }
          case 'z': {
            return mergeGeometries([
              new PlaneGeometry(1, THICKNESS).translate(0, -(0.5 - THICKNESS / 2), 0),
              new PlaneGeometry(1, THICKNESS).translate(0, (0.5 - THICKNESS / 2), 0),
              new PlaneGeometry(1.1, THICKNESS).rotateZ(Math.PI * .22),
            ], false)
          }
          default: {
            return new PlaneGeometry(.1, .1)
          }
        }
      }

      const createSymbols = (arg: string, color: ColorRepresentation, turnQuarters: [y: number, x: number]) => {
        const SCALE = 0.2
        const g = mergeGeometries([...arg].map((char, i, array) => {
          const offset = (i - (array.length - 1) / 2) * 1
          return createSymbolGeometry(char as any).translate(offset, 0, 0)
        }), false)
        setVertexColors(g, color)
        g.scale(SCALE, SCALE, SCALE)
        g.translate(0, 0, -1)
        g.rotateY(turnQuarters[0] * Math.PI / 2)
        g.rotateX(turnQuarters[1] * Math.PI / 2)
        return g
      }

      setup(new Mesh(mergeGeometries([
        createSymbols('+x', '#ff0000', [3, 0]),
        createSymbols('-x', '#ff0000', [1, 0]),
        createSymbols('+y', '#00ff66', [0, 1]),
        createSymbols('-y', '#00ff66', [0, 3]),
        createSymbols('+z', '#0033ff', [2, 0]),
        createSymbols('-z', '#0033ff', [0, 0]),
      ], false), new MeshBasicMaterial({ vertexColors: true })), scene)

      return {
        debugColorSpheres,
        debugGreySpheres,
        ...create.cube({
          size,
          faceColors,
        })
      }
    },

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
        const group = setup(new Group(), instance.parts.scene)
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
        instanceState.onRender.add(() => {
          random.seed(seed)
          for (const { group, torusMesh } of toruses) {
            group.rotation.y += random.float(-1, 1) * .05 * instanceState.deltaTime
            torusMesh.rotation.z += random.float(-1, 1) * .1 * instanceState.deltaTime
          }
        })
      }
    },
  }

  return create
}