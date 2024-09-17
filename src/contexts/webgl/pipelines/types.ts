import { Scene } from 'three'
import { Pass } from 'three/examples/jsm/Addons.js'

import { DestroyableObject } from 'some-utils-ts/types'

export enum PassType {
  Render = 0,
  PostProcessing = 1000,
  GizmoRender = 2000,
  Outline = 3000,
  Output = 4000,
  Antialiasing = 5000,
}

export type PassMetadata = {
  type: PassType
  insertOrder: number
}

export type PipelineBase = {
  readonly passes: Pass[]

  setScene(scene: Scene): void

  /**
   * If insertOrder is not provided, the pass will be inserted at the end of the 
   * passes of the same type (biggest / last insertOrder + 1). 
   */
  addPass(pass: Pass, metadata: PassMetadata): DestroyableObject

  removePass(pass: Pass): boolean

  render(deltaTime: number): void

  setSize(width: number, height: number, pixelRatio?: number): void
}