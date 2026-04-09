import { BufferAttribute, BufferGeometry, InterleavedBufferAttribute, Sphere, Vector3 } from 'three'

import {
  _rayTriangleIntersection,
  _rayTriangleIntersection_cache,
  _rayTriangleIntersection_result,
  TriangleIntersection
} from './intersection-triangle'

import { Culling, IntersectionMode } from './types'

const _cache = {
  positionAttr: <BufferAttribute | InterleavedBufferAttribute>null!,
  indexAttr: <BufferAttribute>null!,
  culling: Culling.None,
  mode: IntersectionMode.Ray,
  triangleCount: 0,
  triangleIndex: 0,
}

function _rayGeometryIntersection_start(
  origin: Vector3,
  direction: Vector3,
  geometry: BufferGeometry,
  culling: Culling,
  mode: IntersectionMode,
): void {
  _rayTriangleIntersection_cache.o.copy(origin)
  _rayTriangleIntersection_cache.d.copy(direction)

  _cache.positionAttr = geometry.attributes.position
  _cache.indexAttr = geometry.index!
  _cache.culling = culling
  _cache.mode = mode

  _cache.triangleIndex = -1
  _cache.triangleCount = _cache.indexAttr
    ? _cache.indexAttr.count / 3
    : _cache.positionAttr.count / 3
}

function _rayGeometryIntersectionWithIndex_next() {
  const { indexAttr, positionAttr, triangleIndex, triangleCount, culling, mode } = _cache
  const { p0, p1, p2 } = _rayTriangleIntersection_cache
  for (let i = triangleIndex + 1; i < triangleCount; i++) {
    const i0 = indexAttr.getX(i * 3)
    const i1 = indexAttr.getX(i * 3 + 1)
    const i2 = indexAttr.getX(i * 3 + 2)

    p0.set(
      positionAttr.getX(i0),
      positionAttr.getY(i0),
      positionAttr.getZ(i0),
    )
    p1.set(
      positionAttr.getX(i1),
      positionAttr.getY(i1),
      positionAttr.getZ(i1),
    )
    p2.set(
      positionAttr.getX(i2),
      positionAttr.getY(i2),
      positionAttr.getZ(i2),
    )

    _rayTriangleIntersection()

    if (_rayTriangleIntersection_result.isLineIntersection()) {
      if (mode === IntersectionMode.Ray && _rayTriangleIntersection_result.t < 0)
        continue

      if (mode === IntersectionMode.Segment && _rayTriangleIntersection_result.t > 1)
        continue

      if (culling !== Culling.None && culling === _rayTriangleIntersection_result.getCulling())
        continue

      _cache.triangleIndex = i
      return
    }
  }

  _cache.triangleIndex = triangleCount
}

// Non-indexed geometry
function _rayGeometryIntersectionWithoutIndex_next() {
  const { positionAttr, triangleIndex, triangleCount, culling, mode } = _cache
  const { p0, p1, p2 } = _rayTriangleIntersection_cache
  for (let i = triangleIndex + 1; i < triangleCount; i++) {
    const i0 = i * 3
    const i1 = i * 3 + 1
    const i2 = i * 3 + 2

    p0.set(
      positionAttr.getX(i0),
      positionAttr.getY(i0),
      positionAttr.getZ(i0),
    )
    p1.set(
      positionAttr.getX(i1),
      positionAttr.getY(i1),
      positionAttr.getZ(i1),
    )
    p2.set(
      positionAttr.getX(i2),
      positionAttr.getY(i2),
      positionAttr.getZ(i2),
    )

    _rayTriangleIntersection()

    if (_rayTriangleIntersection_result.isLineIntersection()) {
      if (mode === IntersectionMode.Ray && _rayTriangleIntersection_result.t < 0)
        continue

      if (mode === IntersectionMode.Segment && _rayTriangleIntersection_result.t > 1)
        continue

      if (culling !== Culling.None && culling === _rayTriangleIntersection_result.getCulling())
        continue

      _cache.triangleIndex = i
      return
    }
  }

  _cache.triangleIndex = triangleCount
}

class GeometryIntersection extends TriangleIntersection {
  triangleIndex = -1

  fromTriangleIntersection(other: TriangleIntersection, triangleIndex: number): this {
    super.copy(other)
    this.triangleIndex = triangleIndex
    return this
  }

  override copy(other: GeometryIntersection): this {
    super.copy(other)
    this.triangleIndex = other.triangleIndex
    return this
  }

  override clone(): GeometryIntersection {
    return new GeometryIntersection().copy(this)
  }
}

const defaultOptions = {
  /**
   * Defines the type of intersection test to perform:
   * - Line: tests if the infinite line defined by the ray intersects the triangle.
   * - Ray: tests if the ray (half-line) intersects the triangle.
   * - Segment: tests if the line segment from the ray origin to ray origin + direction intersects the triangle.
   */
  mode: <IntersectionMode | keyof typeof IntersectionMode>IntersectionMode.Ray,
  /**
   * If true, ignores intersections where the ray hits the back face of the triangle.
   */
  culling: <Culling | keyof typeof Culling>Culling.None,
}

/**
 * Performs ray-triangle intersection tests for all triangles in the given geometry. 
 * 
 * Returns the first intersection result, or null if no intersection is found.
 * 
 * Notes:
 * - The "direction" vector is not required to be normalized, but it must not be a zero vector.
 */
function rayGeometryFirstIntersection(
  origin: Vector3,
  direction: Vector3,
  geometry: BufferGeometry,
  options?: Partial<typeof defaultOptions>,
): GeometryIntersection | null {
  const {
    mode: modeArg,
    culling: cullingArg,
  } = {
    ...defaultOptions,
    ...options,
  }

  const result = new GeometryIntersection()
  const culling = typeof cullingArg === 'string' ? Culling[cullingArg as keyof typeof Culling] : cullingArg
  const mode = typeof modeArg === 'string' ? IntersectionMode[modeArg as keyof typeof IntersectionMode] : modeArg

  _rayGeometryIntersection_start(origin, direction, geometry, culling, mode)

  const _next = _cache.indexAttr
    ? _rayGeometryIntersectionWithIndex_next
    : _rayGeometryIntersectionWithoutIndex_next

  let iterationCount = 0
  const MAX_ITERATIONS = 1e5
  while (_cache.triangleIndex < _cache.triangleCount) {
    if (iterationCount++ >= MAX_ITERATIONS)
      throw new Error('rayGeometryFirstIntersection: Exceeded maximum iterations, possible infinite loop')

    _next()

    if (_cache.triangleIndex >= _cache.triangleCount)
      break

    if (_rayTriangleIntersection_result.t < result.t)
      result.fromTriangleIntersection(_rayTriangleIntersection_result, _cache.triangleIndex)
  }

  return result.t === Infinity ? null : result
}

/**
 * Performs ray-triangle intersection tests for all triangles in the given geometry. 
 * 
 * Returns an array of intersection results, sorted by distance from the ray origin (closest first).
 * 
 * Notes:
 * - The "direction" vector is not required to be normalized, but it must not be a zero vector.
 */
function rayGeometryAllIntersections(
  origin: Vector3,
  direction: Vector3,
  geometry: BufferGeometry,
  options?: Partial<typeof defaultOptions>,
): GeometryIntersection[] {
  const {
    mode: modeArg,
    culling: cullingArg,
  } = {
    ...defaultOptions,
    ...options,
  }

  const results: GeometryIntersection[] = []
  const mode = typeof modeArg === 'string' ? IntersectionMode[modeArg as keyof typeof IntersectionMode] : modeArg
  const culling = typeof cullingArg === 'string' ? Culling[cullingArg as keyof typeof Culling] : cullingArg

  _rayGeometryIntersection_start(origin, direction, geometry, culling, mode)

  const next = _cache.indexAttr
    ? _rayGeometryIntersectionWithIndex_next
    : _rayGeometryIntersectionWithoutIndex_next

  let iterationCount = 0
  const MAX_ITERATIONS = 1e5
  while (_cache.triangleIndex < _cache.triangleCount) {
    if (iterationCount++ >= MAX_ITERATIONS)
      throw new Error('rayGeometryAllIntersections: Exceeded maximum iterations, possible infinite loop')

    next()

    if (_cache.triangleIndex >= _cache.triangleCount)
      break

    results.push(new GeometryIntersection()
      .fromTriangleIntersection(_rayTriangleIntersection_result, _cache.triangleIndex))
  }

  return results.sort((a, b) => a.t - b.t)
}

/**
 * ⚠️ 🚧 WIP!
 * 
 * TODO: Finish and test spherical probe geometry intersection.
 */
function sphericalProbeGeometryFirstIntersection(
  origin: Vector3,
  radius: number,
  geometry: BufferGeometry,
  options?: Partial<typeof defaultOptions>,
): GeometryIntersection | null {
  geometry.computeBoundingSphere()
  const probeSphere = new Sphere(origin, radius)

  if (probeSphere.intersectsSphere(geometry.boundingSphere!) === false) {
    return null
  }

  const result = new GeometryIntersection()

  const probeArray = probe42
  const direction = new Vector3()
  for (let i = 0; i < 24; i++) {
    direction.fromArray(probeArray, i * 3)
    _rayGeometryIntersection_start(origin, direction, geometry, Culling.None, IntersectionMode.SymmetricSegment)
  }

  throw new Error('Not implemented yet')
}

export {
  GeometryIntersection,
  rayGeometryAllIntersections,
  rayGeometryFirstIntersection,
  defaultOptions as rayGeometryIntersectionDefaultOptions
}

