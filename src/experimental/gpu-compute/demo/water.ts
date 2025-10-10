import { Vector4 } from 'three'
import { GpuCompute, GpuComputeParams } from '../gpu-compute'

export class GpuComputeWaterDemo extends GpuCompute {
  constructor(params?: GpuComputeParams) {
    super(params)

    this.shaders({
      initial: {
        fragmentColor: /* glsl */`
          gl_FragColor.rgb = vec3(0.0);
          gl_FragColor.a = 1.0;
        `,
      },
      update: {
        uniforms: {
          uPointer: { value: new Vector4(.5, .5, 0.1, 1.0) },
        },
        fragmentColor: /* glsl */`
          vec2 uv = vUv;
          float viscosity = 0.98;
          float scale = 3.0;
          vec2 cellSize = scale / uTextureSize;

          vec4 center = texture2D(uTexture, uv);
          vec4 north = texture2D(uTexture, uv + vec2(0.0, cellSize.y));
          vec4 south = texture2D(uTexture, uv - vec2(0.0, cellSize.y));
          vec4 east = texture2D(uTexture, uv + vec2(cellSize.x, 0.0));
          vec4 west = texture2D(uTexture, uv - vec2(cellSize.x, 0.0));

          // x: previous height
          // y: penultimate height
          // z: unused
          // w: unused

          float newHeight = ((north.x + south.x + east.x + west.x) * 0.5 - center.y) * viscosity;

          // Pointer influence
          float radius = uPointer.z;
          float strength = uPointer.w;
          float dist = distance(uv, uPointer.xy) - radius;
          float cellLength = length(cellSize);
          float influence = smoothstep(cellLength * 0.5, -cellLength * 0.5, dist);
          newHeight += influence * strength * cos(uTime * 10.0);

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