
/**
 * 2D SDF functions from Inigo Quilez
 * https://iquilezles.org/articles/distfunctions2d/
 */
export const glsl_sdf_2d = /* glsl */`
  // 2D SDF functions
  float sdSegment(in vec2 p, in vec2 a, in vec2 b) {
    vec2 pa = p-a, ba = b-a;
    float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
    return length( pa - ba*h );
  }

  float sdRoundedSegment(in vec2 p, in vec2 a, in vec2 b, float r) {
    return sdSegment(p, a, b) - r;
  }
`