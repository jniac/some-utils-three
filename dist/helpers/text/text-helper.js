import { DataTexture, DoubleSide, InstancedMesh, Matrix4, MeshBasicMaterial, PlaneGeometry, RGBAFormat, UnsignedByteType, Vector2 } from 'three';
import { fromTransformDeclarations, fromVector2Declaration } from '../../declaration.js';
import { ShaderForge } from '../../shader-forge.js';
import { makeMatrix4 } from '../../utils/make.js';
import { TextHelperAtlas } from './atlas.js';
import { TextHelperData } from './data.js';
import { getDataStringView } from './utils.js';
const orientations = {
    'oriented': 0,
    'billboard': 1,
};
const Orientation = {
    Normal: 0,
    Billboard: 1,
};
function solveOrientation(orientation) {
    if (typeof orientation === 'string') {
        if (orientation in orientations) {
            return orientations[orientation];
        }
        throw new Error(`Invalid orientation: ${orientation}`);
    }
    return orientation;
}
const defaultOptions = {
    textCount: 1000,
    lineLength: 24,
    lineCount: 2,
    charSize: new Vector2(.2, .3),
    textSize: 1,
    textOffset: 0,
    orientation: 'billboard',
    textDefaults: {
        color: '#ff00ff',
        size: 1,
    },
};
let nextId = 0;
export class TextHelper extends InstancedMesh {
    // Expose some statics
    static defaultOptions = defaultOptions;
    static Orientation = Orientation;
    static Atlas = TextHelperAtlas;
    static Data = TextHelperData;
    // Instance properties
    textHelperId = nextId++;
    options;
    derived;
    atlas;
    data;
    dataTexture;
    constructor(userOptions) {
        const atlas = new TextHelperAtlas();
        const options = { ...defaultOptions, ...userOptions };
        const planeSize = new Vector2(options.textSize * options.lineLength * options.charSize.x, options.textSize * options.lineCount * options.charSize.y);
        const geometry = new PlaneGeometry(planeSize.width, planeSize.height);
        const data = new TextHelperData(atlas.symbols, options.textCount, options.lineCount, options.lineLength);
        const dataTexture = new DataTexture(data.array, data.textureSize.width, data.textureSize.height, RGBAFormat, UnsignedByteType);
        dataTexture.needsUpdate = true;
        const uniforms = {
            uCameraMatrix: { value: new Matrix4() },
            uOrientation: { value: solveOrientation(options.orientation) },
            uTextOffset: { value: fromVector2Declaration(options.textOffset) },
            uPlaneSize: { value: planeSize },
            uCharSize: { value: options.charSize },
            uLineLength: { value: options.lineLength },
            uLineCount: { value: options.lineCount },
            uAtlasCharGrid: { value: atlas.charGrid },
            uDataStrideHeader: { value: data.strideHeaderByteSize },
            uDataStride: { value: data.strideByteSize / 4 },
            uDataTexture: { value: dataTexture },
            uDataTextureSize: { value: data.textureSize },
            uBoxBorderWidth: { value: 0 }, // debug border
        };
        const material = new MeshBasicMaterial({
            map: atlas.texture,
            transparent: true,
            alphaTest: .5,
            side: DoubleSide,
        });
        material.name = 'TextHelperMaterial';
        material.onBeforeCompile = shader => ShaderForge.with(shader)
            .uniforms(uniforms)
            .varying({
            vInstanceId: 'float',
            vTextColor: 'vec4',
            vBackgroundColor: 'vec4',
            vCurrentLineCount: 'float',
        })
            .top(/* glsl */ `
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
            .vertex.replace('project_vertex', /* glsl */ `
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
            .fragment.top(/* glsl */ `
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
            .fragment.replace('map_fragment', /* glsl */ `
        diffuseColor = getCharColorWithBorder();
      `);
        super(geometry, material, options.textCount);
        this.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
            uniforms.uCameraMatrix.value.copy(camera.matrixWorld);
        };
        // Frustum culling cannot be applied since each text position is defined into the data texture.
        this.frustumCulled = false;
        this.layers;
        this.options = options;
        this.atlas = atlas;
        this.data = data;
        this.dataTexture = dataTexture;
        this.derived = { planeSize };
    }
    /**
     * Apply a transform to all text instances (not the TextHelper itself).
     */
    applyTransform(...transforms) {
        const mt = fromTransformDeclarations(transforms);
        const mi = new Matrix4();
        const count = this.instanceMatrix.array.length;
        for (let i = 0; i < count; i += 16) {
            mi
                .fromArray(this.instanceMatrix.array, i)
                .multiply(mt)
                .toArray(this.instanceMatrix.array, i);
        }
        return this;
    }
    addTo(parent) {
        if (parent) {
            parent.add(this);
        }
        else {
            this.removeFromParent();
        }
        return this;
    }
    onTop(renderOrder = 1000) {
        if (renderOrder !== 0) {
            this.renderOrder = renderOrder;
            this.material.depthTest = false;
            this.material.depthWrite = false;
            this.material.transparent = true;
        }
        else {
            this.renderOrder = 0;
            this.material.depthTest = true;
            this.material.depthWrite = true;
            this.material.transparent = false;
        }
        return this;
    }
    setData(data) {
        this.data = data;
        this.dataTexture.image.data = data.array;
        this.dataTexture.needsUpdate = true;
        return this;
    }
    clearAllText() {
        this.instanceMatrix.array.fill(0);
        this.instanceMatrix.needsUpdate = true;
        return this;
    }
    setTextAt(index, text, options = {}) {
        this.data.setTextAt(index, text, { ...this.options.textDefaults, ...options });
        this.dataTexture.needsUpdate = true;
        this.setMatrixAt(index, makeMatrix4(options));
        this.instanceMatrix.needsUpdate = true;
        return this;
    }
    setColorAt(index, color) {
        this.data.setColorAt(index, { color });
        this.dataTexture.needsUpdate = true;
    }
    setTextColorAt(index, options) {
        this.data.setColorAt(index, options);
        this.dataTexture.needsUpdate = true;
        return this;
    }
    getDataStringView(start = 0, length = 3) {
        return getDataStringView(this.atlas, this.data.array, this.data.strideByteSize, this.options.lineCount, this.options.lineLength, start, length);
    }
}
