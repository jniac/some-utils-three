import { Vector3 } from 'three'

import { Culling, TriangleIntersectionType } from './types'

class TriangleIntersection {
  type = TriangleIntersectionType.Parallel

  t = Infinity
  u = 0
  v = 0

  o = new Vector3()
  d = new Vector3()
  e1 = new Vector3()
  e2 = new Vector3()

  copy(other: TriangleIntersection): this {
    this.type = other.type
    this.t = other.t
    this.u = other.u
    this.v = other.v
    this.o.copy(other.o)
    this.d.copy(other.d)
    this.e1.copy(other.e1)
    this.e2.copy(other.e2)
    return this
  }

  clone(): TriangleIntersection {
    return new TriangleIntersection().copy(this)
  }

  isLineIntersection(): boolean {
    return this.type >= TriangleIntersectionType.LineIntersection
  }

  isRayIntersection(): boolean {
    return this.type >= TriangleIntersectionType.RayIntersection
  }

  isSegmentIntersection(): boolean {
    return this.type === TriangleIntersectionType.SegmentIntersection
  }

  getFacing(): boolean {
    const { x: e1x, y: e1y, z: e1z } = this.e1
    const { x: e2x, y: e2y, z: e2z } = this.e2
    const nx = e1y * e2z - e1z * e2y
    const ny = e1z * e2x - e1x * e2z
    const nz = e1x * e2y - e1y * e2x
    // Backface if normal dot ray direction is positive
    return nx * this.d.x + ny * this.d.y + nz * this.d.z < 0
  }

  getCulling(): Culling {
    return this.getFacing() ? Culling.BackFace : Culling.FrontFace
  }

  getPoint(out = new Vector3()): Vector3 {
    return out.copy(this.d).multiplyScalar(this.t).add(this.o)
  }

  getNormal(out = new Vector3()): Vector3 {
    return out.copy(this.e1).cross(this.e2).normalize()
  }
}

const _result = new TriangleIntersection()

const _cache = {
  o: new Vector3(),
  d: new Vector3(),
  p0: new Vector3(),
  p1: new Vector3(),
  p2: new Vector3(),
  epsilon: 1e-6,
}

function _rayTriangleIntersection(): void {
  const { o, d, p0, p1, p2, epsilon } = _cache
  // edges
  const e1x = p1.x - p0.x
  const e1y = p1.y - p0.y
  const e1z = p1.z - p0.z

  const e2x = p2.x - p0.x
  const e2y = p2.y - p0.y
  const e2z = p2.z - p0.z

  // pvec = v × e2
  const px = d.y * e2z - d.z * e2y
  const py = d.z * e2x - d.x * e2z
  const pz = d.x * e2y - d.y * e2x

  const det = e1x * px + e1y * py + e1z * pz

  if (Math.abs(det) < epsilon) {
    _result.type = TriangleIntersectionType.Parallel
    return
  }

  const invDet = 1 / det

  // tvec = o - p0
  const tx = o.x - p0.x
  const ty = o.y - p0.y
  const tz = o.z - p0.z

  const u = (tx * px + ty * py + tz * pz) * invDet
  if (u < 0 || u > 1) {
    _result.type = TriangleIntersectionType.Outside
    return
  }

  // qvec = tvec × e1
  const qx = ty * e1z - tz * e1y
  const qy = tz * e1x - tx * e1z
  const qz = tx * e1y - ty * e1x

  const v = (d.x * qx + d.y * qy + d.z * qz) * invDet
  if (v < 0 || u + v > 1) {
    _result.type = TriangleIntersectionType.Outside
    return
  }

  const t = (e2x * qx + e2y * qy + e2z * qz) * invDet

  _result.t = t
  _result.u = u
  _result.v = v
  _result.type =
    t < 0 ? TriangleIntersectionType.LineIntersection :
      t > 1 ? TriangleIntersectionType.RayIntersection :
        TriangleIntersectionType.SegmentIntersection

  _result.e1.set(e1x, e1y, e1z)
  _result.e2.set(e2x, e2y, e2z)
  _result.o.copy(o)
  _result.d.copy(d)
}

function rayTriangleIntersection(
  rayOrigin: Vector3,
  rayDirection: Vector3,
  triangleP0: Vector3,
  triangleP1: Vector3,
  triangleP2: Vector3,
): TriangleIntersection {
  _cache.o.copy(rayOrigin)
  _cache.d.copy(rayDirection)
  _cache.p0.copy(triangleP0)
  _cache.p1.copy(triangleP1)
  _cache.p2.copy(triangleP2)

  _rayTriangleIntersection()

  return _result.clone()
}

export {
  _rayTriangleIntersection,
  _cache as _rayTriangleIntersection_cache,
  _result as _rayTriangleIntersection_result,
  rayTriangleIntersection,
  TriangleIntersection
}
