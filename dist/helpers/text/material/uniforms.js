import { Matrix4, Vector2 } from 'three';
import { fromVector2Declaration } from '../../../declaration.js';
import { optionsDefaults, solveOrientation } from '../types.js';
export function createTextUniforms(userOptions, data, atlas) {
    const options = { ...optionsDefaults, ...userOptions };
    const planeSize = new Vector2(options.textSize * options.lineLength * options.charSize.x, options.textSize * options.lineCount * options.charSize.y);
    return {
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
        uDataTexture: { value: data.texture },
        uDataTextureSize: { value: data.textureSize },
        uBoxBorderWidth: { value: 0 }, // debug border
    };
}
