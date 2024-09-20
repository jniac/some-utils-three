import { Euler, Vector3 } from 'three'

const defaultTransform = {
  position: new Vector3(0, 0, 0),
  rotation: new Euler(0, 0, 0, 'XYZ'),
  scale: new Vector3(1, 1, 1),
  visible: true,
}

export type Transform = typeof defaultTransform