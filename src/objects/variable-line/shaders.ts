import { ShaderChunk } from 'three'

import { lightingLoops } from './lighting'
import { capsuleNormals } from './normals'

export const vertexShader = /* glsl */ `
  #ifndef LINE_RECEIVE_SHADOWS
    #undef USE_SHADOWMAP
  #endif
  uniform float uLinewidth;
  uniform float uPixelRatio;
  uniform mat4 uCameraView;
  uniform mat4 uCameraProjection;
  uniform mat4 uCameraProjectionInverse;
  uniform mat4 uCameraWorld;
  uniform vec2 uResolution;

  attribute vec3 instanceStart;
  attribute vec3 instanceEnd;
  attribute float instanceWidthStart;
  attribute float instanceWidthEnd;
  #if defined(USE_LIGHTING) && defined(USE_CAPSULE_NORMAL) && defined(USE_SMOOTH_NORMALS)
    attribute vec3 instanceTangentStart;
    attribute vec3 instanceTangentEnd;
    vec2 projectTangent(vec4 clip, vec3 tangent) {
      vec4 derivative = uCameraProjection * uCameraView * modelMatrix * vec4(tangent, 0.0);
      vec2 direction = (derivative.xy * clip.w - clip.xy * derivative.w) * uResolution;
      float len = length(direction);
      return len > 0.00001 ? direction / len : vec2(0.0);
    }
  #endif

  varying vec2 vStart;
  varying vec2 vEnd;
  varying vec2 vRadii;
  varying float vVisible;


  #if defined(USE_LIGHTING) && defined(USE_CAPSULE_NORMAL) && defined(USE_SMOOTH_NORMALS)
    varying vec2 vTangentStart;
    varying vec2 vTangentEnd;
  #endif
  varying vec4 vBillboardClip;
  #ifdef USE_COLOR
    varying vec3 vColorStart;
    varying vec3 vColorEnd;
  #endif
  #if defined(USE_LIGHTING) || defined(USE_WORLD_POSITION) || defined(USE_SHADOWMAP) || defined(LINE_SHADOW_PASS)
    varying vec3 vWorldPosition;
  #endif
  #ifdef LINE_DEPTH_PASS
    varying vec2 vHighPrecisionZW;
  #endif

  #ifdef USE_COLOR
    attribute vec3 instanceColorStart;
    attribute vec3 instanceColorEnd;
  #endif
  #ifdef LINE_RECEIVE_SHADOWS
    #include <shadowmap_pars_vertex>
  #endif
  #include <common>
  #include <logdepthbuf_pars_vertex>

  void main() {
    vec4 start = uCameraView * modelMatrix * vec4(instanceStart, 1.0);
    vec4 end = uCameraView * modelMatrix * vec4(instanceEnd, 1.0);
    #if defined(USE_LIGHTING) && defined(USE_CAPSULE_NORMAL) && defined(USE_SMOOTH_NORMALS)
      vec3 tangentStart = instanceTangentStart;
      vec3 tangentEnd = instanceTangentEnd;
    #endif
    vec2 radii = 0.5 * max(uLinewidth, 0.0) * vec2(instanceWidthStart, instanceWidthEnd);
    vVisible = 1.0;
    #ifdef USE_COLOR
      vColorStart = instanceColorStart;
      vColorEnd = instanceColorEnd;
    #endif
    // Trim before projection, interpolating the width at the new endpoint.
    if (uCameraProjection[2][3] == -1.0) {
      float nearZ = -uCameraProjection[3][2] / (uCameraProjection[2][2] - 1.0);
      if (start.z > nearZ && end.z > nearZ) {
        vVisible = 0.0;
        start.z = nearZ;
        end.z = nearZ;
      } else if (start.z > nearZ) {
        float t = (nearZ - start.z) / (end.z - start.z);
        start = mix(start, end, t);
        radii.x = mix(radii.x, radii.y, t);
        #if defined(USE_LIGHTING) && defined(USE_CAPSULE_NORMAL) && defined(USE_SMOOTH_NORMALS)
          tangentStart = mix(tangentStart, tangentEnd, t);
        #endif
        #ifdef USE_COLOR
          vColorStart = mix(vColorStart, vColorEnd, t);
        #endif
      } else if (end.z > nearZ) {
        float t = (nearZ - end.z) / (start.z - end.z);
        end = mix(end, start, t);
        radii.y = mix(radii.y, radii.x, t);
        #if defined(USE_LIGHTING) && defined(USE_CAPSULE_NORMAL) && defined(USE_SMOOTH_NORMALS)
          tangentEnd = mix(tangentEnd, tangentStart, t);
        #endif
        #ifdef USE_COLOR
          vColorEnd = mix(vColorEnd, vColorStart, t);
        #endif
      }
    }
    vec4 clipStart = uCameraProjection * start;
    vec4 clipEnd = uCameraProjection * end;
    #if defined(USE_LIGHTING) && defined(USE_CAPSULE_NORMAL) && defined(USE_SMOOTH_NORMALS)
      vTangentStart = projectTangent(clipStart, tangentStart);
      vTangentEnd = projectTangent(clipEnd, tangentEnd);
    #endif
    vStart = clipStart.xy / clipStart.w * uResolution * 0.5;
    vEnd = clipEnd.xy / clipEnd.w * uResolution * 0.5;
    #ifdef WORLD_UNITS
      // Project a camera-facing world-space radius at each endpoint.
      // World widths are independent of model scale, as with LineMaterial.
      float pixelsPerUnit = abs(uCameraProjection[1][1]) * uResolution.y * 0.5;
      radii *= pixelsPerUnit / vec2(clipStart.w, clipEnd.w);
    #else
      radii *= uPixelRatio;
    #endif
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
    clip.xy += offset * 2.0 / uResolution * clip.w;
    vBillboardClip = clip;
    gl_Position = clip;
    #if defined(USE_LIGHTING) || defined(USE_WORLD_POSITION) || defined(USE_SHADOWMAP) || defined(LINE_SHADOW_PASS)
      vec4 cameraPosition = uCameraProjectionInverse * clip;
      vec4 worldPosition = uCameraWorld * vec4(cameraPosition.xyz / cameraPosition.w, 1.0);
      vWorldPosition = worldPosition.xyz;
      #if defined(LINE_SHADOW_PASS) && !defined(SHADOW_BILLBOARD_LIGHT)
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      #elif defined(LINE_RECEIVE_SHADOWS)
        // A camera-facing normal allows three.js shadowNormalBias to work.
        vec3 transformedNormal = vec3(0.0, 0.0, 1.0);
        #define HAS_NORMAL
        #include <shadowmap_vertex>
      #endif
    #endif
    #ifdef LINE_DEPTH_PASS
      vHighPrecisionZW = gl_Position.zw;
    #endif

    #ifndef LINE_SHADOW_PASS
    #include <logdepthbuf_vertex>
    #endif
  }
`

export const fragmentShader = /* glsl */ `
  #ifndef LINE_RECEIVE_SHADOWS
    #undef USE_SHADOWMAP
  #endif
  #ifdef LINE_SHADOW_PASS
    uniform float uShadowCastBias;
  #endif
  uniform vec3 uDiffuse;
  uniform float uOpacity;
  uniform vec2 uResolution;


  varying vec2 vStart;
  varying vec2 vEnd;
  varying vec2 vRadii;
  varying float vVisible;

  #if defined(USE_LIGHTING) && defined(USE_CAPSULE_NORMAL) && defined(USE_SMOOTH_NORMALS)
    varying vec2 vTangentStart;
    varying vec2 vTangentEnd;
  #endif
  varying vec4 vBillboardClip;
  #ifdef USE_COLOR
    varying vec3 vColorStart;
    varying vec3 vColorEnd;
  #endif
  #if defined(USE_LIGHTING) || defined(USE_WORLD_POSITION) || defined(USE_SHADOWMAP) || defined(LINE_SHADOW_PASS)
    varying vec3 vWorldPosition;
  #endif
  #ifdef LINE_DEPTH_PASS
    varying vec2 vHighPrecisionZW;
  #endif

  #include <common>
  #include <packing>
  #ifdef LINE_DISTANCE_PASS
    uniform vec3 referencePosition;
    uniform float nearDistance;
    uniform float farDistance;
  #endif
  #if defined(USE_LIGHTING) || defined(LINE_RECEIVE_SHADOWS)
    uniform float uShadowReceiveBias;
    #include <lights_pars_begin>
  #endif
  #ifdef LINE_RECEIVE_SHADOWS
    #include <shadowmap_pars_fragment>
    #ifndef USE_LIGHTING
      ${ShaderChunk.shadowmask_pars_fragment.replaceAll('.shadowBias', '.shadowBias - uShadowReceiveBias')}
    #endif

  #endif

  #include <logdepthbuf_pars_fragment>

  ${capsuleNormals}

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
    vec2 q = vBillboardClip.xy / vBillboardClip.w * uResolution * 0.5 - vStart;
    vec2 p = vec2(dot(q, vec2(dir.y, -dir.x)), dot(q, dir));
    float d = sdUnevenCapsule(p, vRadii.x, vRadii.y, h);
    float aa = max(fwidth(d), 0.0001);
    float coverage = 1.0 - smoothstep(-aa, aa, d);
    if (coverage <= 0.0) discard;
    #ifdef LINE_SHADOW_PASS
      // Shadow maps store a hard silhouette, not blended antialiasing.
      if (d > 0.0 || uOpacity <= 0.0) discard;
      // Hardware depth textures (including point-light cube maps) read this depth.
      gl_FragDepth = clamp(gl_FragCoord.z + uShadowCastBias, 0.0, 1.0);
    #endif
    #ifdef LINE_DEPTH_PASS
      float depth = 0.5 * vHighPrecisionZW.x / vHighPrecisionZW.y + 0.5;
      gl_FragColor = packDepthToRGBA(clamp(depth + uShadowCastBias, 0.0, 1.0));
    #elif defined(LINE_DISTANCE_PASS)
      float distanceToLight = length(vWorldPosition - referencePosition);
      gl_FragColor = packDepthToRGBA(clamp((distanceToLight - nearDistance) / (farDistance - nearDistance) + uShadowCastBias, 0.0, 1.0));
    #else
    float opacity = uOpacity * coverage;
    if (opacity < 1.0) discard;
    vec4 diffuseColor = vec4(uDiffuse, opacity);
    #ifdef USE_COLOR
      float colorT = h > 0.00001 ? clamp(p.y / h, 0.0, 1.0) : 0.0;
      diffuseColor.rgb *= mix(vColorStart, vColorEnd, colorT);
    #endif
    #ifdef USE_LIGHTING
      vec3 geometryPosition = (viewMatrix * vec4(vWorldPosition, 1.0)).xyz;
      vec3 geometryNormal = vec3(0.0, 0.0, 1.0);
      #ifdef USE_CAPSULE_NORMAL
        vec3 localNormal = unevenCapsuleNormal(p, vRadii.x, vRadii.y, h);
        vec2 shadingDir = dir;
        #ifdef USE_SMOOTH_NORMALS
          float tangentT = h > 0.00001 ? clamp(p.y / h, 0.0, 1.0) : 0.0;
          vec2 startDir = dot(vTangentStart, vTangentStart) > 0.5 ? vTangentStart : dir;
          vec2 endDir = dot(vTangentEnd, vTangentEnd) > 0.5 ? vTangentEnd : dir;
          vec2 blendedDir = mix(startDir, endDir, tangentT);
          if (dot(blendedDir, blendedDir) > 0.00001) shadingDir = normalize(blendedDir);
        #endif
        // Rotate the projected capsule frame into view space (same space as lights).
        geometryNormal = vec3(
          vec2(shadingDir.y, -shadingDir.x) * localNormal.x + shadingDir * localNormal.y,
          localNormal.z
        );
      #endif
      vec3 irradiance = ambientLightColor;
      IncidentLight directLight;
      ${lightingLoops}
      diffuseColor.rgb *= irradiance * RECIPROCAL_PI;
    #elif defined(USE_SHADOWMAP)
      diffuseColor.rgb *= getShadowMask();
    #endif
    gl_FragColor = diffuseColor;
    #include <logdepthbuf_fragment>
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #endif
  }
`
