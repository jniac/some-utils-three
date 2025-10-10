
import { GpuCompute, GpuComputeParams } from '../gpu-compute'

export class GpuComputeGameOfLifeDemo extends GpuCompute {
  constructor(userParams?: Partial<GpuComputeParams>) {
    super(userParams)
    this.enableGlslLib('glsl_utils') // for hash()
    this.shaders({
      initial: {
        fragmentColor: /* glsl */`
          vec2 uv = vUv;
          float r = step(0.9, hash(uv));
          float g = step(0.9, hash(uv + vec2(1.0, 0.0)));
          float b = step(0.9, hash(uv + vec2(0.0, 1.0)));
          gl_FragColor = vec4(r, g, b, 1.0);
        `,
      },
      update: {
        fragmentTop: /* glsl */`
          // Conway's Game of Life rules
          float gameOfLife(float current, float sum) {
            if (current > 0.5) {
              if (sum < 1.5 || sum > 3.5) {
                return 0.0; // Cell dies
              } else {
                return 1.0; // Cell lives
              }
            } else {
              if (sum == 3.0) {
                return 1.0; // Cell becomes alive
              }
            }
            return current;
          }
          `,
        fragmentColor: /* glsl */`
          vec2 uv = vUv;
          vec2 uv0 = uv + vec2(0.0, 1.0) / uTextureSize;
          vec2 uv1 = uv + vec2(1.0, 1.0) / uTextureSize;
          vec2 uv2 = uv + vec2(1.0, 0.0) / uTextureSize;
          vec2 uv3 = uv + vec2(1.0, -1.0) / uTextureSize;
          vec2 uv4 = uv + vec2(0.0, -1.0) / uTextureSize;
          vec2 uv5 = uv + vec2(-1.0, -1.0) / uTextureSize;
          vec2 uv6 = uv + vec2(-1.0, 0.0) / uTextureSize;
          vec2 uv7 = uv + vec2(-1.0, 1.0) / uTextureSize;
          vec3 sum =
            texture2D(uTexture, uv0).rgb +
            texture2D(uTexture, uv1).rgb +
            texture2D(uTexture, uv2).rgb +
            texture2D(uTexture, uv3).rgb +
            texture2D(uTexture, uv4).rgb +
            texture2D(uTexture, uv5).rgb +
            texture2D(uTexture, uv6).rgb +
            texture2D(uTexture, uv7).rgb;
    
          vec3 current = texture2D(uTexture, uv).rgb;
          vec3 next = vec3(
            gameOfLife(current.r, sum.r),
            gameOfLife(current.g, sum.g),
            gameOfLife(current.b, sum.b));
          
          // Add some random "glitches" based on time and position
          vec3 uvt = vec3(uv, uTime);
          vec3 extra = vec3(
            step(0.995, hash(uvt.xyz)), 
            step(0.995, hash(uvt.yzx)), 
            step(0.995, hash(uvt.zxy)));
    
          gl_FragColor.rgb = max(next, extra);
        `,
      },

    })
  }
}