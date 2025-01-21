import { Camera, Scene } from 'three'

import { Ticker } from 'some-utils-ts/ticker'
import { Destroyable } from 'some-utils-ts/types'

import { Pointer } from './pointer'

export type ThreeBaseContext = {
  width: number
  height: number
  aspect: number
  pixelRatio: number
  ticker: Ticker
  pointer: Pointer
  scene: Scene
  camera: Camera

  initialized: boolean
  initialize: (domContainer: HTMLElement, pointerScope: HTMLElement) => Destroyable
}
