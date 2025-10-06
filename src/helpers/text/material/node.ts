import { DoubleSide } from 'three'

import { add, cameraWorldMatrix, color, div, float, floor, Fn, If, instanceIndex, mat3, mod, mul, positionGeometry, sub, texture, uniform, varying, vec2, vec3, vec4 } from 'three/tsl'
import { MeshBasicNodeMaterial } from 'three/webgpu'
import { TextHelperAtlas } from '../atlas'
import { TextUniforms } from './uniforms'

export function createTextNodeMaterial(uniforms: TextUniforms, atlas: TextHelperAtlas) {
  const material = new MeshBasicNodeMaterial()
  material.name = 'TextHelperMaterial'
  material.transparent = true
  material.alphaTest = 0.5
  material.side = DoubleSide

  console.warn('TextHelperMaterial is not supported in WebGPU yet, do not expect it to work.')

  const uDataTextureSize = uniform(uniforms.uDataTextureSize.value)
    .onFrameUpdate(() => uniforms.uDataTextureSize.value)
  const uDataStride = uniform(uniforms.uDataStride.value)
    .onFrameUpdate(() => uniforms.uDataStride.value)
  const uDataStrideHeader = uniform(uniforms.uDataStrideHeader.value)
    .onFrameUpdate(() => uniforms.uDataStrideHeader.value)
  const uAtlasCharGrid = uniform(uniforms.uAtlasCharGrid.value)
    .onFrameUpdate(() => uniforms.uAtlasCharGrid.value)

  function getData4(instanceId: any, offset: any) {
    const width = uDataTextureSize.x
    const index = add(mul(instanceId, uDataStride), offset)
    const dataY = div(index, width)
    const dataX = sub(index, mul(dataY, width))
    return texture(uniforms.uDataTexture.value, vec2(dataX, dataY))
  }

  function getCharOffset(instanceId: any, charIndex: any) {
    const p = add(uDataStrideHeader, charIndex)
    const q = floor(div(p, 4))
    const r = sub(p, mul(q, 4))
    const charIndexes = vec4(mul(getData4(instanceId, q), 255.0))
    const i = float(0).toVar()
    If(r.equal(0), () => i.assign(charIndexes.x))
      .ElseIf(r.equal(1), () => i.assign(charIndexes.y))
      .ElseIf(r.equal(2), () => i.assign(charIndexes.z))
      .ElseIf(r.equal(3), () => i.assign(charIndexes.w))
    const x = mod(i, uAtlasCharGrid.x)
    const y = floor(div(i, uAtlasCharGrid.x))
    return div(vec2(x, sub(sub(uAtlasCharGrid.y, y), 1.0)), uDataTextureSize)
  }

  const infoTexel = getData4(instanceIndex, 0)
  const vCurrentLineCount = varying(mul(infoTexel.r, 255.0))
  const vTextColor = varying(getData4(instanceIndex, 1))
  const vBackgroundColor = varying(getData4(instanceIndex, 2))

  // const sizeBytes = mul(getData4(instanceIndex, 3), 255.0)
  // const encoded = add(
  //   add(
  //     add(mul(int(sizeBytes.x), 16777216), mul(int(sizeBytes.y), 65536)),
  //     mul(int(sizeBytes.z), 256)),
  //   int(sizeBytes.w)
  // )
  // uintBitsToFloat is not supported in WebGPU
  const size = float(1)
  // To be completed...

  // Orientation is ok
  const uOrientation = uniform(1)
    .onRenderUpdate(() => uniforms.uOrientation.value)
  const orientedPosition = Fn(() => {
    const position = vec3().toVar()
    If(uOrientation.equal(0), () => {
      position.assign(positionGeometry)
    }).Else(() => {
      position.assign(mat3(cameraWorldMatrix).mul(positionGeometry))
    })
    return position
  })
  material.positionNode = orientedPosition()

  material.colorNode = color('yellow')

  return material
}