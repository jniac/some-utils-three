import { Camera, Scene } from 'three'

export type ThreeContextBase = {
  readonly scene: Scene
  readonly camera: Camera
  setScene(scene: Scene): void
}