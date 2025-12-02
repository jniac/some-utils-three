import { cameraPosition, cameraWorldMatrix, color, EPSILON, float, Fn, hash, If, int, mat3, mix, NodeAccess, normalWorld, objectPosition, positionLocal, storage, uniform, vec2, vec3, vec4 } from 'three/tsl'
import { ColorRepresentation, Matrix4, Object3D, StorageInstancedBufferAttribute } from 'three/webgpu'

import { fromVector3Declaration, Vector3Declaration } from '../declaration'

export const autoLitOptionsDefaults = {
  emissive: .2,
  shadowColor: <ColorRepresentation>'#808080',
  power: 2,
  sunDirection: <Vector3Declaration>[1, 3, -1],
}
export type AutoLitOptions = Partial<typeof autoLitOptionsDefaults>
export const autoLit = (mainColor: ColorRepresentation = 'white', options?: AutoLitOptions) => Fn(() => {
  const { emissive, shadowColor, power, sunDirection } = { ...autoLitOptionsDefaults, ...options }
  const sunDirectionVector = fromVector3Declaration(sunDirection).negate().normalize()
  const t1 = normalWorld.normalize().dot(vec3(sunDirectionVector)).add(1).mul(0.5).pow(power).oneMinus()
  // const t1 = normalWorld.normalize().dot(positionWorld.sub(vec3(1, 3, 1)).normalize()).add(1).mul(0.5).pow(power).oneMinus()
  const t2 = mix(emissive, 1, t1)
  return mix(color(shadowColor as any), color(mainColor as any), t2.mul(1))
})()

/**
 * Clamps a vector to a maximum length.
 */
// @ts-ignore
export const clampVector = Fn(([v, maxLength = 1 as any]) => {
  const length = v.length().max(maxLength)
  return v.mul(float(maxLength).div(length))
})

// @ts-ignore
export const spow = Fn(([x, p]: [any, any]) => {
  return float(x).sign().mul(float(x).abs().pow(p))
})

// @ts-ignore
export const powerBump = Fn(([x, p]: [any, any]) => {
  return float(1).sub(float(2).mul(x).sub(1).abs().pow(p))
})

// @ts-ignore
export const toDirectionAndMagnitude = Fn(([v]: [any]) => {
  const vVec3 = vec3(v)
  const vLength = vVec3.length()
  const result = vec4().toVar()
  If(vLength.greaterThan(EPSILON), () => {
    result.assign(vec4(vVec3.div(vLength), vLength))
  })
  return result
})

// @ts-ignore
export const rotate2D = Fn(([vector, angle]: [any, any]) => {
  const v = vec2(vector)
  const a = float(angle)
  const c = float(angle).cos()
  const s = float(angle).sin()
  return vec2(
    v.x.mul(c).sub(v.y.mul(s)),
    v.x.mul(s).add(v.y.mul(c)),
  )
})

// @ts-ignore
export const scale2D = Fn(([vector, scale, pivot]: any[]) => {
  const v = vec2(vector)
  const s = vec2(scale)
  const p = vec2(pivot)
  return v.sub(p).mul(s).add(p)
})

/**
 * InstancedStorage is a little wrapper around a StorageInstancedBufferAttribute
 * that provides a way to create a storage buffer and a read-only storage buffer
 * (TSL / Three Shading Language).
 */
export class InstancedStorage {
  count: number
  type: string
  typeSize: number
  attribute: StorageInstancedBufferAttribute
  storage: any // ShaderNodeObject<StorageBufferNode>

  get readonlyStorage() { return this.getReadonlyStorage() }

  constructor(countOrArray: number | Float32Array, type = 'vec3', typeSize = 3, defaultValue = [0, 0, 0]) {
    const createArray = () => {
      const array = new Float32Array(count * typeSize)
      for (let i = 0; i < count; i++) {
        for (let j = 0; j < typeSize; j++) {
          array[i * typeSize + j] = defaultValue[j] ?? 0
        }
      }
      return array
    }
    const count = typeof countOrArray === 'number' ? countOrArray : countOrArray.length / typeSize
    const array = typeof countOrArray === 'number' ? createArray() : countOrArray
    this.count = count
    this.type = type
    this.typeSize = typeSize
    this.attribute = new StorageInstancedBufferAttribute(array, typeSize)
    this.storage = storage(this.attribute, type, count)
  }

  private _readonlyStorage: /* ShaderNodeObject<StorageBufferNode> */ any | null = null
  /**
   * This is an important feature: it allows to create a read-only storage buffer
   * that can be used in a vertex / fragment shader (positionNode, normalNode, etc.). 
   * Indeed, unlike compute shaders, vertex / fragment shaders can only read from
   * storage buffers that are marked as read-only.
   */
  getReadonlyStorage() {
    if (this._readonlyStorage) {
      return this._readonlyStorage
    }

    this._readonlyStorage = storage(this.attribute, this.type, this.count)
    this._readonlyStorage.access = NodeAccess.READ_ONLY
    return this._readonlyStorage
  }
}

/**
 * The definitive z-fighting solution.
 * 
 * Extreeeemely powerful function that allows to create a shader node that will
 * offset the vertex position of an object in the direction of the camera and 
 * scale the position to make the object appear at the same place, but closer or
 * further away from the camera.
 * 
 * Needless to say, I'm quite proud of this one.
 */
export function zOffset(object: Object3D, zOffset = 1) {
  const plane1MatrixWorldInverse = uniform(new Matrix4())
    .onUpdate((_, self) => {
      self.value.copy(object.matrixWorld).invert()
      return undefined
    }, 'frame')

  return Fn(() => {
    const d = objectPosition(object).sub(cameraPosition).length()

    // Clamp the zOffset to the distance between the camera and the object minus 1.
    const clampedZOffset = float(zOffset).min(d.sub(1))

    // Convert the forward camera direction to the local space of the current object.

    const v = plane1MatrixWorldInverse.mul(cameraWorldMatrix.element(int(3))).xyz.normalize().mul(clampedZOffset)

    // Since the object is send backward, we need to scale the position to make it appear at the right place.
    const magicScaleFactor = d.sub(clampedZOffset).div(d)

    return positionLocal.mul(magicScaleFactor).add(v)
  })()
}

// @ts-ignore
export const rotationMatrix = Fn(([axis, angle]) => {
  const c = angle.cos()
  const s = angle.sin()
  const omc = c.oneMinus()
  const x = axis.x
  const y = axis.y
  const z = axis.z
  return mat3(
    c.add(x.mul(x).mul(omc)), x.mul(y).mul(omc).sub(z.mul(s)), x.mul(z).mul(omc).add(y.mul(s)),
    x.mul(y).mul(omc).add(z.mul(s)), c.add(y.mul(y).mul(omc)), y.mul(z).mul(omc).sub(x.mul(s)),
    x.mul(z).mul(omc).sub(y.mul(s)), y.mul(z).mul(omc).add(x.mul(s)), c.add(z.mul(z).mul(omc))
  )
})

// @ts-ignore
export const hash3 = Fn(([index, indexOffset = 0, indexScalar = 437]) => {
  const x = hash(index.add(indexOffset).mul(indexScalar))
  const y = hash(index.add(indexOffset).add(1).mul(indexScalar))
  const z = hash(index.add(indexOffset).add(2).mul(indexScalar))
  return vec3(x, y, z)
})

// @ts-ignore
export const hash4 = Fn(([index, indexOffset = 0, indexScalar = 437]) => {
  const x = hash(index.add(indexOffset).mul(indexScalar))
  const y = hash(index.add(indexOffset).add(1).mul(indexScalar))
  const z = hash(index.add(indexOffset).add(2).mul(indexScalar))
  const w = hash(index.add(indexOffset).add(3).mul(indexScalar))
  return vec4(x, y, z, w)
})

/**
 * Returns a random unit vector uniformly distributed on the unit sphere.
 */
// @ts-ignore
export const randomUnitVector = Fn(([index]) => {
  const r1 = hash(index.add(17).mul(437))
  const r2 = hash(index.add(23).mul(439))
  const phi = r1.mul(2 * Math.PI)
  const z = r2.mul(2).sub(1)
  const r = z.mul(z).oneMinus().sqrt()
  return vec3(r.mul(phi.cos()), r.mul(phi.sin()), z)
})

export const sdf2D = {
  /**
   * @param p The point to test
   * @param radius The radius of the circle
   */
  circle: (p: any, radius: any = 1) => {
    return vec2(p).length().sub(radius)
  },

  /**
   * @param p The point to test
   * @param size the extents of the box
   */
  box: (p: any, size: any = vec2(1, 1)) => {
    const d = vec2(p).abs().sub(size)
    return d.max(0).length().add(d.x.max(d.y).min(0))
  },
}
