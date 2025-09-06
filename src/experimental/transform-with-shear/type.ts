import { Vector3Declaration, Vector4Declaration } from 'some-utils-ts/declaration'
import { Quaternion, Vector3 } from 'three'
import { EulerDeclaration } from '../../declaration'

export const defaultTransformWithShearProps = {
  position: new Vector3(),
  quaternion: new Quaternion(),
  scale: new Vector3(1, 1, 1),
  /**
   * (xy, xz, yz)
   */
  shear: new Vector3(),
}

export type TransformWithShearLike = typeof defaultTransformWithShearProps

export type TransformWithShearDeclaration = Partial<{
  position: Vector3Declaration
  quaternion: Vector4Declaration
  scale: Vector3Declaration
  shear: Vector3Declaration
  rotation: EulerDeclaration
}>
