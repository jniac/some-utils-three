import { Color, Vector3 } from 'three'

import { glsl_ramp } from 'some-utils-ts/glsl/ramp'

import { GpuCompute, GpuComputeParams } from '../gpu-compute'

export class GpuComputePenDemo extends GpuCompute {
  constructor(params?: GpuComputeParams) {
    super(params)

    // Enable glsl libs
    this.enableGlslLib(
      'glsl_blur_3_11',
      'glsl_sdf_2d',
    )

    this.shaders({
      /**
       * Initial shader: clears the texture to black.
       */
      initial: {
        fragmentColor: /* glsl */`
          gl_FragColor.rgb = vec3(0.0);
          gl_FragColor.a = 1.0;
        `,
      },

      /**
       * Update shader: draws a rounded line between the last pen position and 
       * the current one, with a given radius (size).
       */
      update: {
        uniforms: {
          uPenLast: { value: new Vector3() },
          uPen: { value: new Vector3() },
          uColors: { value: [new Color('#ffcc00'), new Color('#00ffcc'), new Color('#00ccff')] },
        },
        fragmentTop: glsl_ramp,
        fragmentColor: /* glsl */`
          vec2 uv = vUv;
          vec2 center = uPen.xy;
          float radius = uPen.z * 0.5;
          
          // Draw single circle:
          // float dist = distance(uv, center) - radius;
          // Draw rounded line (enabled via glsl_sdf_2d):
          float dist = sdRoundedSegment(uv, uPenLast.xy, uPen.xy, radius);

          float strength = smoothstep(0.005, -0.005, dist);
          
          float decay = 0.995;
          // No blur:
          // vec3 prev = texture2D(uTexture, uv).rgb * decay;
          // With blur (enabled via glsl_blur_3_11):
          vec3 prev = gaussianBlur11x11(uv, 2.0).rgb * decay;

          Vec3Ramp r = ramp(mod(uTime, 1.0), uColors[0], uColors[1], uColors[2], uColors[0]);
          vec3 color = mix(r.a, r.b, r.t);

          vec3 pen = color * strength;
          gl_FragColor.rgb = max(prev, pen);
        `,
      },
    })
  }

  pen(x: number, y: number, size: number) {
    this.uniforms.uPen.value.set(x, y, size)
    this.uniforms.uPenLast.value.copy(this.uniforms.uPen.value)
  }

  penMove(x: number, y: number, size: number) {
    this.uniforms.uPenLast.value.copy(this.uniforms.uPen.value)
    this.uniforms.uPen.value.set(x, y, size)
  }
}