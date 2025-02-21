import { Camera, Scene } from 'three'

import { Ticker } from 'some-utils-ts/ticker'
import { Destroyable } from 'some-utils-ts/types'

import { Pointer } from './pointer'

export enum ThreeContextType {
  WebGL = 'webgl',
  WebGPU = 'webgpu',
}

export type ThreeBaseContext = {
  type: ThreeContextType

  width: number
  height: number
  aspect: number
  pixelRatio: number
  ticker: Ticker
  pointer: Pointer
  scene: Scene
  camera: Camera

  skipRender: boolean
  initialized: boolean
  initialize: (domContainer: HTMLElement, pointerScope: HTMLElement) => Destroyable
}
