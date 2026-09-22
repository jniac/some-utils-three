/** Cylindrical shading across the entire projected capsule, including its 2D caps. */
export const capsuleNormals = /* glsl */ `
#if defined(USE_LIGHTING) && defined(USE_CAPSULE_NORMAL)
  // Local X is across the line, Y follows its axis, Z faces the viewer.
  // The caps only clip the silhouette: they never bend normals along the axis.
  vec3 unevenCapsuleNormal(vec2 p, float r1, float r2, float h) {
    float radius;
    if (h <= abs(r1 - r2)) {
      // Coincident endpoints or a containing disk: use a finite constant radius.
      radius = max(r1, r2);
    } else {
      // Extend each endpoint's radius through its cap instead of closing a sphere.
      float t = clamp(p.y / h, 0.0, 1.0);
      radius = mix(r1, r2, t);
    }
    float s = clamp(p.x / max(radius, 0.00001), -1.0, 1.0);
    return vec3(s, 0.0, sqrt(max(0.0, 1.0 - s * s)));
  }
#endif
`
