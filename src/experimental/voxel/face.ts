import { Ray, Vector3, Vector3Like } from 'three'

import { Direction, crossDirection, defaultDirectionBitangent, defaultDirectionTangent, directionToVector } from './core'

let _i = 0
let _x = 0, _y = 0, _z = 0
let _offx = 0, _offy = 0, _offz = 0
let _array: Float32Array | number[] = []

const _positionDump = {
  A() {
    _array[_i++] = _offx + _x
    _array[_i++] = _offy + _y
    _array[_i++] = _offz + _z
    return _positionDump
  },
  B() {
    _array[_i++] = _offx + _x
    _array[_i++] = _offy + _y
    _array[_i++] = _offz + _z + 1
    return _positionDump
  },
  C() {
    _array[_i++] = _offx + _x
    _array[_i++] = _offy + _y + 1
    _array[_i++] = _offz + _z
    return _positionDump
  },
  D() {
    _array[_i++] = _offx + _x
    _array[_i++] = _offy + _y + 1
    _array[_i++] = _offz + _z + 1
    return _positionDump
  },
  E() {
    _array[_i++] = _offx + _x + 1
    _array[_i++] = _offy + _y
    _array[_i++] = _offz + _z
    return _positionDump
  },
  F() {
    _array[_i++] = _offx + _x + 1
    _array[_i++] = _offy + _y
    _array[_i++] = _offz + _z + 1
    return _positionDump
  },
  G() {
    _array[_i++] = _offx + _x + 1
    _array[_i++] = _offy + _y + 1
    _array[_i++] = _offz + _z
    return _positionDump
  },
  H() {
    _array[_i++] = _offx + _x + 1
    _array[_i++] = _offy + _y + 1
    _array[_i++] = _offz + _z + 1
    return _positionDump
  },
}

const _normalDump = {
  R() {
    _array[_i++] = +1
    _array[_i++] = 0
    _array[_i++] = 0
    return _normalDump
  },
  L() {
    _array[_i++] = -1
    _array[_i++] = 0
    _array[_i++] = 0
    return _normalDump
  },
  U() {
    _array[_i++] = 0
    _array[_i++] = +1
    _array[_i++] = 0
    return _normalDump
  },
  D() {
    _array[_i++] = 0
    _array[_i++] = -1
    _array[_i++] = 0
    return _normalDump
  },
  F() {
    _array[_i++] = 0
    _array[_i++] = 0
    _array[_i++] = +1
    return _normalDump
  },
  B() {
    _array[_i++] = 0
    _array[_i++] = 0
    _array[_i++] = -1
    return _normalDump
  },
  R6() {
    return _normalDump.R().R().R().R().R().R()
  },
  L6() {
    return _normalDump.L().L().L().L().L().L()
  },
  U6() {
    return _normalDump.U().U().U().U().U().U()
  },
  D6() {
    return _normalDump.D().D().D().D().D().D()
  },
  F6() {
    return _normalDump.F().F().F().F().F().F()
  },
  B6() {
    return _normalDump.B().B().B().B().B().B()
  },
}

const _v0 = new Vector3()
const _v1 = new Vector3()
const _v2 = new Vector3()

class FaceIntersection {
  constructor(
    /**
     * The face that was intersected by the ray.
     */
    public face: Face,
    /**
     * The distance from the ray origin to the intersection point along the ray direction.
     */
    public distance: number,
    /**
     * The ray origin used for the intersection test.
     */
    public origin: Vector3,
    /**
     * The ray direction used for the intersection test.
     */
    public direction: Vector3,
  ) { }
  /**
   * Returns the intersection point of the ray with the face.
   * @param out Optional vector to store the intersection point.
   * @returns The intersection point.
   */
  point(out = new Vector3()): Vector3 {
    return out.copy(this.origin).addScaledVector(this.direction, this.distance)
  }
}

function computeFacePlaneIntersectionT(face: Face, origin: Vector3, direction: Vector3): number | null {
  const f_o = face.origin(_v0)
  const f_n = face.normal(_v1)
  const denom = f_n.dot(direction)
  if (Math.abs(denom) < 1e-6) {
    // Ray is parallel to the face plane
    return null
  }
  const d = f_n.dot(f_o)
  const t = (d - f_n.dot(origin)) / denom
  if (t < 0) {
    // Intersection is behind the ray origin
    return null
  }
  return t
}

function computeFaceIntersection(
  face: Face,
  origin: Vector3,
  direction: Vector3,
): FaceIntersection | null {
  const t = computeFacePlaneIntersectionT(face, origin, direction)
  if (t === null) {
    return null
  }
  const intersectionPoint = _v0.copy(origin).addScaledVector(direction, t)
  const localPoint = _v1.subVectors(intersectionPoint, face.origin(_v2))
  const u = localPoint.dot(directionToVector(face.tangentDirection))
  const v = localPoint.dot(directionToVector(face.bitangentDirection))
  if (u < 0 || u > 1 || v < 0 || v > 1) {
    // Intersection point is outside the face bounds
    return null
  }
  return new FaceIntersection(face, t, origin.clone(), direction.clone())
}

class Face {
  voxel: Vector3
  normalDirection: Direction
  tangentDirection: Direction

  get bitangentDirection(): Direction {
    return crossDirection(this.normalDirection, this.tangentDirection)
  }

  constructor(
    voxel: Vector3,
    normalDirection: Direction,
    tangentDirection: Direction = defaultDirectionTangent[normalDirection]
  ) {
    this.voxel = voxel
    this.normalDirection = normalDirection
    this.tangentDirection = tangentDirection
  }

  clone(): this {
    return new (this.constructor as any)(this.voxel.clone(), this.normalDirection, this.tangentDirection)
  }

  origin(out = new Vector3()): Vector3 {
    out.copy(this.voxel)
    switch (this.normalDirection) {
      case Direction.R:
        return out.add(directionToVector(this.normalDirection)).sub(directionToVector(this.tangentDirection))
      case Direction.L:
        return out
      case Direction.U:
        return out.add(directionToVector(this.normalDirection)).sub(directionToVector(this.bitangentDirection))
      case Direction.D:
        return out
      case Direction.F:
        return out.add(directionToVector(this.normalDirection))
      case Direction.B:
        return out.sub(directionToVector(this.tangentDirection))
      case Direction.Invalid:
        throw new Error('Invalid face direction')
    }
  }

  tangent(out = new Vector3()): Vector3 {
    return out.copy(directionToVector(this.tangentDirection))
  }

  bitangent(out = new Vector3): Vector3 {
    const bitangentDirection = defaultDirectionBitangent[this.normalDirection]
    return out.copy(directionToVector(bitangentDirection))
  }

  normal(out = new Vector3()): Vector3 {
    return out.copy(directionToVector(this.normalDirection))
  }

  min(out = new Vector3()): Vector3 {
    const { voxel, normalDirection: direction } = this
    out.copy(voxel)
    switch (direction) {
      case Direction.R:
        out.x += 1
        break
      case Direction.U:
        out.y += 1
        break
      case Direction.F:
        out.z += 1
        break
    }
    return out
  }

  max(out = new Vector3()): Vector3 {
    const { voxel, normalDirection: direction } = this
    out.set(voxel.x + 1, voxel.y + 1, voxel.z + 1)
    switch (direction) {
      case Direction.L:
        out.x -= 1
        break
      case Direction.D:
        out.y -= 1
        break
      case Direction.B:
        out.z -= 1
        break
    }
    return out
  }

  /**
   * Returns the 't' parameter of the ray-plane intersection, or null if there is no intersection or the ray is parallel to the plane.
   * 
   * Notes:
   * - ⚠️ This method only checks for intersection with the plane of the face, not whether the intersection point is within the face bounds. Use `rayIntersection` for that.
   */
  rayPlaneIntersectionT(origin: Vector3, direction: Vector3): number | null
  rayPlaneIntersectionT(ray: Ray): number | null
  rayPlaneIntersectionT(...args: [Vector3, Vector3] | [Ray]): number | null {
    if (args.length === 1) {
      const ray = args[0]
      return computeFacePlaneIntersectionT(this, ray.origin, ray.direction)
    } else {
      const [origin, direction] = args
      return computeFacePlaneIntersectionT(this, origin, direction)
    }
  }

  isBackfacing(rayDirection: Vector3): boolean {
    const normal = directionToVector(this.normalDirection)
    return normal.dot(rayDirection) > 0
  }

  static rayIntersectionDefaultOptions = {
    backfaceCulling: true,
  }
  /**
   * Returns the intersection of the ray with the face, or null if there is no intersection.
   */
  rayIntersection(origin: Vector3, direction: Vector3, options?: Partial<typeof Face.rayIntersectionDefaultOptions>): FaceIntersection | null
  rayIntersection(ray: Ray, options?: Partial<typeof Face.rayIntersectionDefaultOptions>): FaceIntersection | null
  rayIntersection(...args: any[]): FaceIntersection | null {
    const parseArgs = () => {
      if (args[0] instanceof Ray) {
        const [ray, options] = args as [Ray, Partial<typeof Face.rayIntersectionDefaultOptions>?]
        return { origin: ray.origin, direction: ray.direction, options }
      } else {
        const [origin, direction, options] = args as [Vector3, Vector3, Partial<typeof Face.rayIntersectionDefaultOptions>?]
        return { origin, direction, options }
      }
    }
    const { origin, direction, options } = parseArgs()
    const { backfaceCulling } = { ...Face.rayIntersectionDefaultOptions, ...options }
    if (backfaceCulling && this.isBackfacing(direction)) {
      return null
    }
    return computeFaceIntersection(this, origin, direction)
  }

  /**
   * Dumps the face's vertex positions into the provided array, starting at the given offset.
   * The vertices are ordered in a way that they form two triangles covering the face.
   */
  positionToArray(): number[]
  positionToArray(out: Float32Array, arrayOffset?: number, positionOffset?: Vector3Like): Float32Array
  positionToArray<T extends number[] | Float32Array>(out?: T, arrayOffset = 0, positionOffset?: Vector3Like): T {
    const { voxel: position, normalDirection: direction } = this
    out ??= [] as unknown as T
    _array = out
    _i = arrayOffset
    _x = position.x
    _y = position.y
    _z = position.z
    _offx = positionOffset?.x ?? 0
    _offy = positionOffset?.y ?? 0
    _offz = positionOffset?.z ?? 0

    switch (direction) {
      case Direction.R: {
        _positionDump
          .E().G().F()
          .F().G().H()
        break
      }
      case Direction.L: {
        _positionDump
          .A().B().D()
          .A().D().C()
        break
      }
      case Direction.U: {
        _positionDump
          .D().H().G()
          .D().G().C()
        break
      }
      case Direction.D: {
        _positionDump
          .A().E().F()
          .A().F().B()
        break
      }
      case Direction.F: {
        _positionDump
          .B().F().H()
          .B().H().D()
        break
      }
      case Direction.B: {
        _positionDump
          .A().C().E()
          .E().C().G()
        break
      }
    }
    return out
  }

  normalToArray<T extends number[] | Float32Array>(out: T, offset = 0): T {
    const { normalDirection: direction } = this
    _array = out
    _i = offset
    switch (direction) {
      case Direction.R: {
        _normalDump.R6()
        break
      }
      case Direction.L: {
        _normalDump.L6()
        break
      }
      case Direction.U: {
        _normalDump.U6()
        break
      }
      case Direction.D: {
        _normalDump.D6()
        break
      }
      case Direction.F: {
        _normalDump.F6()
        break
      }
      case Direction.B: {
        _normalDump.B6()
        break
      }
    }
    return out
  }
}

export { Face, type FaceIntersection }
