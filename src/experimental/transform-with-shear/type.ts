import { Quaternion, Vector3 } from 'three'

import { EulerDeclaration, Vector3Declaration, Vector4Declaration } from '../../declaration'

export function createTransformLike() {
  return {
    position: new Vector3(),
    quaternion: new Quaternion(),
    scale: new Vector3(1, 1, 1),
    /**
     * Scale factor (uniform scale)
     */
    scaleFactor: 1,
    /**
     * (xy, xz, yz)
     */
    shear: new Vector3(),
  }
}

export type TransformLike = ReturnType<typeof createTransformLike>

export type TransformDeclaration = Partial<{
  position: Vector3Declaration
  quaternion: Vector4Declaration
  scale: Vector3Declaration
  scaleFactor: number
  shear: Vector3Declaration
  rotation: EulerDeclaration
}>
