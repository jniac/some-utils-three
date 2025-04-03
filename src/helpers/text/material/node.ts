import { DoubleSide } from 'three'

import { MeshBasicNodeMaterial } from 'three/webgpu'
import { TextHelperAtlas } from '../atlas'
import { TextUniforms } from './uniforms'

export function createTextNodeMaterial(uniformsSrc: TextUniforms, atlas: TextHelperAtlas) {
  const material = new MeshBasicNodeMaterial()
  material.name = 'TextHelperMaterial'
  material.transparent = true
  material.alphaTest = 0.5
  material.side = DoubleSide

  console.warn('TextHelperMaterial is not supported in WebGPU yet, using MeshBasicNodeMaterial instead')

  return material
}