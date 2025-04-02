import { DoubleSide, MeshBasicMaterial } from 'three'

import { ShaderForge } from '../../../shader-forge'

import { TextHelperAtlas } from '../atlas'
import { TextUniforms } from './uniforms'

export function createWebglMaterial(uniforms: TextUniforms, atlas: TextHelperAtlas) {
  const material = new MeshBasicMaterial({
    map: atlas.texture,
    transparent: true,
    alphaTest: .5,
    side: DoubleSide,
  })
  material.name = 'TextHelperMaterial'
  material.onBeforeCompile = shader => ShaderForge.with(shader)
    .uniforms(uniforms)
    .varying({
      vInstanceId: 'float',
      vTextColor: 'vec4',
      vBackgroundColor: 'vec4',
      vCurrentLineCount: 'float',
    })
    .top(/* glsl */`
      vec4 getData4(int instanceId, int offset) {
        int width = int(uDataTextureSize.x);
        int index = instanceId * int(uDataStride) + offset;
        int dataY = index / width;
        int dataX = index - dataY * width;
        return texelFetch(uDataTexture, ivec2(dataX, dataY), 0);
      }
      vec4 getData4(float instanceId, int offset) {
        return getData4(int(instanceId), offset);
      }
        
      vec2 getCharOffset(float instanceId, float charIndex) {
        int p = int(uDataStrideHeader + charIndex);
        int q = p / 4;
        int r = p - q * 4; // p % 4;
        vec4 charIndexes = getData4(instanceId, q);
        float i = charIndexes[r] * 255.0;
        float x = mod(i, uAtlasCharGrid.x);
        float y = floor(i / uAtlasCharGrid.x);
        return vec2(x, uAtlasCharGrid.y - y - 1.0) / uAtlasCharGrid;
      }
      vec2 getCharOffset(float instanceId, float line, float char) {
        // return vec2(line * 82.0 + char, 0.0) / uAtlasCharGrid;
        return getCharOffset(instanceId, line * uLineLength + char);
      }
    `)
    .vertex.replace('project_vertex', /* glsl */`
      vec4 infoTexel = getData4(gl_InstanceID, 0);
      vCurrentLineCount = infoTexel.r * 255.0;

      vTextColor = getData4(gl_InstanceID, 1);
      vBackgroundColor = getData4(gl_InstanceID, 2);

      vec4 sizeBytes = getData4(gl_InstanceID, 3) * 255.0;
      uint encoded =
        uint(sizeBytes.x) << 24 |
        uint(sizeBytes.y) << 16 |
        uint(sizeBytes.z) << 8  |
        uint(sizeBytes.w);
      float size = uintBitsToFloat(encoded);

      vec4 mvPosition = vec4(transformed * size, 1.0);

      mat4 textMatrix = uOrientation < 0.5
        ? modelMatrix * instanceMatrix
        : mat4(
          uCameraMatrix[0],
          uCameraMatrix[1],
          uCameraMatrix[2],
          modelMatrix * vec4(instanceMatrix[3].xyz, 1.0));

      mvPosition.xy += uTextOffset;

      mvPosition = viewMatrix * textMatrix * mvPosition;

      gl_Position = projectionMatrix * mvPosition;

      vInstanceId = float(gl_InstanceID);
    `)
    .fragment.top(/* glsl */`
      float sdBox(in vec2 p, in vec2 b) {
        vec2 d = abs(p) - b;
        return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
      }

      vec4 getCharColor() {
        vec2 uv = vMapUv * vec2(uLineLength, uLineCount);

        uv.y += (uLineCount - vCurrentLineCount) * 0.5;
        float lineIndex = floor((uLineCount - uv.y));

        if (lineIndex < 0.0 || lineIndex >= vCurrentLineCount)
          discard;

        float currentLineLength = getData4(vInstanceId, 4 + int(lineIndex)).r * 255.0;
        // vec2 ddx = dFdx(uv);
        // vec2 ddy = dFdy(uv);
        uv.x += (uLineLength - currentLineLength) * -0.5;
        float charIndex = floor(uv.x);

        if (charIndex < 0.0 || charIndex >= currentLineLength)
          discard;

        uv = fract(uv);
        // diffuseColor = vec4(uv, 1.0, 1.0);
        uv /= uAtlasCharGrid;

        uv += getCharOffset(vInstanceId, lineIndex, charIndex);
        // float lod = log2(max(length(dFdx(vMapUv)), length(dFdy(vMapUv))));
        vec4 charColor = textureLod(map, uv, 0.0);
        // Use textureGrad for better quality, when the square texture will be used
        // vec4 sampledDiffuseColor = textureGrad(map, uv, ddx, ddy);
        float char = charColor.r;
        
        return vec4(
          mix(vBackgroundColor.rgb, vTextColor.rgb, charColor.r),
          mix(vBackgroundColor.a, vTextColor.a, charColor.r));
      }

      vec4 getCharColorWithBorder() {
        if (uBoxBorderWidth > 0.0) {
          vec2 p = (vMapUv - 0.5) * uPlaneSize;
          float d = sdBox(p, uPlaneSize * 0.5) + uBoxBorderWidth;
          if (d > 0.0) {
            return vTextColor;
          }
        }
        return getCharColor();
      }
    `)
    .fragment.replace('map_fragment', /* glsl */`
      diffuseColor = getCharColorWithBorder();
    `)

  return material
} 