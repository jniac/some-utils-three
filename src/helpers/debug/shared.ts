import { Vector3Declaration } from 'some-utils-ts/declaration'
import { Color, Matrix4, Vector3 } from 'three'
import { TransformDeclaration, fromTransformDeclaration, fromVector3Declaration } from '../../declaration'

export const _v0 = new Vector3()
export const _v1 = new Vector3()
export const _v2 = new Vector3()
export const _v3 = new Vector3()
export const _v4 = new Vector3()
export const _v5 = new Vector3()
export const _v6 = new Vector3()
export const _c0 = new Color()
const _m0 = new Matrix4()

export class Utils {
  static boxPoints = [
    new Vector3(),
    new Vector3(),
    new Vector3(),
    new Vector3(),
    new Vector3(),
    new Vector3(),
    new Vector3(),
    new Vector3(),
  ];

  static boxDefaults = {
    inset: 0,
    transform: undefined as TransformDeclaration | undefined,
  };

  static boxMinMaxDefaults = {
    min: new Vector3(-.5, -.5, -.5) as Vector3Declaration,
    max: new Vector3(.5, .5, .5) as Vector3Declaration,
  };

  static boxCenterSizeDefaults = {
    center: new Vector3(0, 0, 0) as Vector3Declaration,
    size: new Vector3(1, 1, 1) as Vector3Declaration,
  };

  static box(value: Partial<typeof Utils.boxDefaults> & (Partial<typeof Utils.boxMinMaxDefaults> | Partial<typeof Utils.boxCenterSizeDefaults>) = {}) {
    const [p0, p1, p2, p3, p4, p5, p6, p7] = Utils.boxPoints

    // P1 & P2 should represent the min and max points of the box
    if ('min' in value || 'max' in value) {
      const {
        min = Utils.boxMinMaxDefaults.min, max = Utils.boxMinMaxDefaults.max,
      } = value
      fromVector3Declaration(min, p0)
      fromVector3Declaration(max, p1)
    }

    else if ('center' in value || 'size' in value) {
      const {
        center = Utils.boxCenterSizeDefaults.center, size = Utils.boxCenterSizeDefaults.size,
      } = value
      fromVector3Declaration(center, p2)
      fromVector3Declaration(size, p3).multiplyScalar(.5)
      p0.copy(p2).sub(p3)
      p1.copy(p2).add(p3)
    }

    else {
      // No min/max or center/size provided, use default values
      p0.copy(Utils.boxMinMaxDefaults.min as Vector3)
      p1.copy(Utils.boxMinMaxDefaults.max as Vector3)
    }

    if (value.inset) {
      p0.addScalar(value.inset)
      p1.addScalar(-value.inset)
    }
    const { x: x0, y: y0, z: z0 } = p0
    const { x: x1, y: y1, z: z1 } = p1
    p1.set(x1, y0, z0)
    p2.set(x1, y0, z1)
    p3.set(x0, y0, z1)
    p4.set(x0, y1, z0)
    p5.set(x1, y1, z0)
    p6.set(x1, y1, z1)
    p7.set(x0, y1, z1)
    if (value.transform) {
      fromTransformDeclaration(value.transform, _m0)
      p0.applyMatrix4(_m0)
      p1.applyMatrix4(_m0)
      p2.applyMatrix4(_m0)
      p3.applyMatrix4(_m0)
      p4.applyMatrix4(_m0)
      p5.applyMatrix4(_m0)
      p6.applyMatrix4(_m0)
      p7.applyMatrix4(_m0)
    }
    return Utils
  }
}
