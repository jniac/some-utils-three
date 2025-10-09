import { Vector3 } from 'three'

import { GpuCompute, GpuComputeParams } from '../gpu-compute'

export class GpuComputePenDemo extends GpuCompute {
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
          uPen: { value: new Vector3() },
        },
        fragmentColor: /* glsl */`
          vec2 uv = vUv;
          vec2 center = uPen.xy;
          float radius = uPen.z;
          float dist = distance(uv, center);
          float strength = smoothstep(radius, radius - 0.01, dist);
          // vec3 prev = texture2D(uTexture, uv).rgb * 0.99;
          vec3 prev = gaussianBlur11x11(uv).rgb * 0.99;
          vec3 pen = vec3(1.0, 0.5, 0.0) * strength;
          gl_FragColor.rgb = max(prev, pen);
        `,
      },
    })
  }

  pen(x: number, y: number, size: number) {
    this.uniforms.uPen.value.set(x, y, size)
  }
}