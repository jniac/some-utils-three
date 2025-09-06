import { Quaternion, Vector3 } from 'three'

import { EulerDeclaration, Vector3Declaration, Vector4Declaration } from '../../declaration'

export function createTransformWithShearLike() {
  return {
    position: new Vector3(),
    quaternion: new Quaternion(),
    scale: new Vector3(1, 1, 1),
    /**
     * (xy, xz, yz)
     */
    shear: new Vector3(),
  } as const
}

export type TransformWithShearLike = ReturnType<typeof createTransformWithShearLike>

export type TransformWithShearDeclaration = Partial<{
  position: Vector3Declaration
  quaternion: Vector4Declaration
  scale: Vector3Declaration
  shear: Vector3Declaration
  rotation: EulerDeclaration
}>
