import { Matrix4, Vector2 } from 'three'

import { fromVector3Declaration } from '../../../declaration'

import { TextHelperAtlas } from '../atlas'
import { TextHelperData } from '../data'
import { Options, optionsDefaults, solveOrientation } from '../types'

export type TextUniforms = ReturnType<typeof createTextUniforms>

export function createTextUniforms(userOptions: Options, data: TextHelperData, atlas: TextHelperAtlas) {
  const options = { ...optionsDefaults, ...userOptions }
  const planeSize = new Vector2(
    options.textSize * options.lineLength * options.charSize.x,
    options.textSize * options.lineCount * options.charSize.y)
  return {
    uCameraMatrix: { value: new Matrix4() },
    uOrientation: { value: solveOrientation(options.orientation) },
    uTextOffset: { value: fromVector3Declaration(options.textOffset) },
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
  }
}