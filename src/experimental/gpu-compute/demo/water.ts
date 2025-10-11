import { Vector4 } from 'three'
import { GpuCompute, GpuComputeParams } from '../gpu-compute'

const defaultParams = {
  ...GpuCompute.defaultParams,

  viscosity: 0.98,
  cellScale: 7.0,
}

type Params = typeof defaultParams & GpuComputeParams

export class GpuComputeWaterDemo extends GpuCompute<Params> {
  static override defaultParams = defaultParams

  constructor(userParams?: Partial<Params>) {
    super(userParams)

    this.shaders({
      initial: {
        fragmentColor: /* glsl */`
          gl_FragColor.rgb = vec3(0.0);
          gl_FragColor.a = 1.0;
        `,
      },
      update: {
        uniforms: {
          uViscosity: { value: this.params.viscosity },
          uCellScale: { value: this.params.cellScale },
          uPointer: { value: new Vector4(.5, .5, 0.1, 1.0) },
        },
        fragmentTop: /* glsl */`
          vec4 fetch(vec2 uv) {
            if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
              return vec4(0.0);
            }
            float margin = 0.2;
            float edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
            edgeDist = 1.0 - pow(1.0 - edgeDist, 5.0);
            float edgeFade = smoothstep(0.0, margin, edgeDist);
            return texture2D(uTexture, uv) * edgeFade;
          }
        `,
        fragmentColor: /* glsl */`
          vec2 uv = vUv;
          float viscosity = uViscosity;
          vec2 cellSize = uCellScale / uTextureSize;

          vec4 center = fetch(uv);
          vec4 north = fetch(uv + vec2(0.0, cellSize.y));
          vec4 south = fetch(uv - vec2(0.0, cellSize.y));
          vec4 east = fetch(uv + vec2(cellSize.x, 0.0));
          vec4 west = fetch(uv - vec2(cellSize.x, 0.0));

          // x: previous height
          // y: penultimate height
          // z: unused
          // w: unused

          float newHeight = ((north.x + south.x + east.x + west.x) * 0.501 - center.y) * viscosity;

          // Pointer influence
          float radius = uPointer.z;
          float strength = uPointer.w;
          float dist = distance(uv, uPointer.xy) - radius;
          float cellLength = length(cellSize);
          float influence = smoothstep(cellLength * 0.5, -cellLength * 0.5, dist);
          newHeight += influence * strength;

          gl_FragColor = vec4(newHeight, center.x, 0.0, 1.0);
        `,
      }
    })
  }

  pointer(x: number, y: number, radius: number, strength: number) {
    const { uPointer } = this.updateUniforms
    uPointer.value.set(x, y, radius, strength)
  }
}