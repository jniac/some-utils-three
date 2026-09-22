import { Color, ColorRepresentation, ShaderMaterial, Vector2 } from 'three'

export interface VariableLineMaterialParameters {
  color?: ColorRepresentation
  linewidth?: number
  opacity?: number
  worldUnits?: boolean
}

/** Camera-facing capsules, with pixel or world-unit diameters. */
export class VariableLineMaterial extends ShaderMaterial {
  constructor({
    color = 'white',
    linewidth = 1,
    opacity = 1,
    worldUnits = false,
  }: VariableLineMaterialParameters = {}) {
    super({
      uniforms: {
        diffuse: { value: new Color(color) },
        linewidth: { value: linewidth },
        pixelRatio: { value: 1 },
        worldUnits: { value: worldUnits },
        opacity: { value: opacity },
        resolution: { value: new Vector2(1, 1) },
      },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        uniform float linewidth;
        uniform float pixelRatio;
        uniform bool worldUnits;
        uniform vec2 resolution;
        attribute vec3 instanceStart;
        attribute vec3 instanceEnd;
        attribute float instanceWidthStart;
        attribute float instanceWidthEnd;
        varying vec2 vStart;
        varying vec2 vEnd;
        varying vec2 vRadii;
        varying float vVisible;
        #include <common>
        #include <logdepthbuf_pars_vertex>

        void main() {
          vec4 start = modelViewMatrix * vec4(instanceStart, 1.0);
          vec4 end = modelViewMatrix * vec4(instanceEnd, 1.0);
          vec2 radii = 0.5 * max(linewidth, 0.0) * vec2(instanceWidthStart, instanceWidthEnd);
          vVisible = 1.0;
          // Trim before projection, interpolating the width at the new endpoint.
          if (projectionMatrix[2][3] == -1.0) {
            float nearZ = -projectionMatrix[3][2] / (projectionMatrix[2][2] - 1.0);
            if (start.z > nearZ && end.z > nearZ) {
              vVisible = 0.0;
              start.z = nearZ;
              end.z = nearZ;
            } else if (start.z > nearZ) {
              float t = (nearZ - start.z) / (end.z - start.z);
              start = mix(start, end, t);
              radii.x = mix(radii.x, radii.y, t);
            } else if (end.z > nearZ) {
              float t = (nearZ - end.z) / (start.z - end.z);
              end = mix(end, start, t);
              radii.y = mix(radii.y, radii.x, t);
            }
          }
          vec4 clipStart = projectionMatrix * start;
          vec4 clipEnd = projectionMatrix * end;
          vStart = clipStart.xy / clipStart.w * resolution * 0.5;
          vEnd = clipEnd.xy / clipEnd.w * resolution * 0.5;
          if (worldUnits) {
            // Project a camera-facing world-space radius at each endpoint.
            // World widths are independent of model scale, as with LineMaterial.
            float pixelsPerUnit = abs(projectionMatrix[1][1]) * resolution.y * 0.5;
            radii *= pixelsPerUnit / vec2(clipStart.w, clipEnd.w);
          } else {
            radii *= pixelRatio;
          }
          vRadii = radii;
          vec2 delta = vEnd - vStart;
          float h = length(delta);
          vec2 dir = h > 0.00001 ? delta / h : vec2(0.0, 1.0);
          vec2 normal = vec2(dir.y, -dir.x);
          // A conservative rectangle contains both disks and their tangent hull.
          float extent = max(radii.x, radii.y) + 1.5;
          bool atEnd = position.y > 0.0;
          vec2 offset = extent * (normal * position.x + dir * position.y);
          vec4 clip = atEnd ? clipEnd : clipStart;
          clip.xy += offset * 2.0 / resolution * clip.w;
          gl_Position = clip;
          #include <logdepthbuf_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 diffuse;
        uniform float opacity;
        uniform vec2 resolution;
        uniform vec2 viewportOrigin;
        varying vec2 vStart;
        varying vec2 vEnd;
        varying vec2 vRadii;
        varying float vVisible;
        #include <common>
        #include <logdepthbuf_pars_fragment>

        // Inigo Quilez: https://iquilezles.org/articles/distfunctions2d/
        float sdUnevenCapsule(vec2 p, float r1, float r2, float h) {
          // Includes zero-length segments and one disk containing the other.
          if (h <= abs(r1 - r2)) {
            return r1 >= r2 ? length(p) - r1 : length(p - vec2(0.0, h)) - r2;
          }
          p.x = abs(p.x);
          float b = (r1 - r2) / h;
          float a = sqrt(max(0.0, 1.0 - b * b));
          float k = dot(p, vec2(-b, a));
          if (k < 0.0) return length(p) - r1;
          if (k > a * h) return length(p - vec2(0.0, h)) - r2;
          return dot(p, vec2(a, b)) - r1;
        }
        void main() {
          if (vVisible < 0.5 || max(vRadii.x, vRadii.y) <= 0.0) discard;
          vec2 delta = vEnd - vStart;
          float h = length(delta);
          vec2 dir = h > 0.00001 ? delta / h : vec2(0.0, 1.0);
          vec2 q = gl_FragCoord.xy - viewportOrigin - resolution * 0.5 - vStart;
          vec2 p = vec2(dot(q, vec2(dir.y, -dir.x)), dot(q, dir));
          float d = sdUnevenCapsule(p, vRadii.x, vRadii.y, h);
          float aa = max(fwidth(d), 0.0001);
          float coverage = 1.0 - smoothstep(-aa, aa, d);
          if (coverage <= 0.0) discard;
          gl_FragColor = vec4(diffuse, opacity * coverage);
          #include <logdepthbuf_fragment>
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    })
    this.uniforms.viewportOrigin = { value: new Vector2() }
  }

  get worldUnits(): boolean {
    return this.uniforms.worldUnits.value
  }
  set worldUnits(value: boolean) {
    this.uniforms.worldUnits.value = value
  }

  get linewidth(): number {
    return this.uniforms.linewidth.value
  }
  set linewidth(value: number) {
    if (this.uniforms.linewidth) this.uniforms.linewidth.value = value
  }
}
