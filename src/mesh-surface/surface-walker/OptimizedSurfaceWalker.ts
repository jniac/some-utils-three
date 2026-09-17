import { BufferGeometry, Matrix4 } from 'three'

import { MutableVector2Like, MutableVector3Like, PathSegment, SurfacePoint, WalkStatus } from './types'

export type OptimizedWalkResult = {
  point: SurfacePoint
  direction: MutableVector2Like
  status: WalkStatus
  iterations: number
  distance: number
  path?: PathSegment[]
}

export type OptimizedWalkOptions = {
  maxIterations?: number
  maxDistance?: number
  matrix?: Matrix4 | null
  recordPath?: boolean
}

const edgeVertices = [
  [0, 1],
  [1, 2],
  [2, 0],
] as const

function createResult(): OptimizedWalkResult {
  return {
    point: { triangleIndex: -1, x: 0, y: 0 },
    direction: { x: 0, y: 0 },
    status: WalkStatus.MaxIterations,
    iterations: 0,
    distance: 0,
  }
}

/**
 * Allocation-conscious surface walker.
 *
 * Geometry-dependent values are precomputed by `fromGeometry()`. Calls to
 * `walk()` use scalar arithmetic only unless path recording is requested.
 */
export class OptimizedSurfaceWalker {
  state = {
    triangleCount: 0,
    origins: new Float64Array(0),
    bases: new Float64Array(0),
    metrics: new Float64Array(0),
    adjacentTriangles: new Int32Array(0),
    adjacentEdges: new Int8Array(0),
    directionTransforms: new Float64Array(0),
  }

  fromGeometry(geometry: BufferGeometry): this {
    const position = geometry.attributes.position
    const triangleCount = geometry.index
      ? geometry.index.count / 3
      : position.count / 3

    const origins = new Float64Array(triangleCount * 3)
    const bases = new Float64Array(triangleCount * 6)
    const metrics = new Float64Array(triangleCount * 3)
    const adjacentTriangles = new Int32Array(triangleCount * 3)
    const adjacentEdges = new Int8Array(triangleCount * 3)
    const directionTransforms = new Float64Array(triangleCount * 3 * 4)
    const vertexKeys = new Array<string>(triangleCount * 3)
    const edgeMap = new Map<string, number[]>()

    adjacentTriangles.fill(-1)
    adjacentEdges.fill(-1)

    for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex++) {
      const i0 = geometry.index
        ? geometry.index.getX(triangleIndex * 3)
        : triangleIndex * 3
      const i1 = geometry.index
        ? geometry.index.getX(triangleIndex * 3 + 1)
        : triangleIndex * 3 + 1
      const i2 = geometry.index
        ? geometry.index.getX(triangleIndex * 3 + 2)
        : triangleIndex * 3 + 2

      const ax = position.getX(i0)
      const ay = position.getY(i0)
      const az = position.getZ(i0)
      const bx = position.getX(i1)
      const by = position.getY(i1)
      const bz = position.getZ(i1)
      const cx = position.getX(i2)
      const cy = position.getY(i2)
      const cz = position.getZ(i2)

      const ux = bx - ax
      const uy = by - ay
      const uz = bz - az
      const vx = cx - ax
      const vy = cy - ay
      const vz = cz - az

      const originOffset = triangleIndex * 3
      origins[originOffset] = ax
      origins[originOffset + 1] = ay
      origins[originOffset + 2] = az

      const basisOffset = triangleIndex * 6
      bases[basisOffset] = ux
      bases[basisOffset + 1] = uy
      bases[basisOffset + 2] = uz
      bases[basisOffset + 3] = vx
      bases[basisOffset + 4] = vy
      bases[basisOffset + 5] = vz

      const metricOffset = triangleIndex * 3
      metrics[metricOffset] = ux * ux + uy * uy + uz * uz
      metrics[metricOffset + 1] = ux * vx + uy * vy + uz * vz
      metrics[metricOffset + 2] = vx * vx + vy * vy + vz * vz

      vertexKeys[triangleIndex * 3] = `${ax},${ay},${az}`
      vertexKeys[triangleIndex * 3 + 1] = `${bx},${by},${bz}`
      vertexKeys[triangleIndex * 3 + 2] = `${cx},${cy},${cz}`
    }

    for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex++) {
      for (let edgeIndex = 0; edgeIndex < 3; edgeIndex++) {
        const [va, vb] = edgeVertices[edgeIndex]
        const keyA = vertexKeys[triangleIndex * 3 + va]
        const keyB = vertexKeys[triangleIndex * 3 + vb]
        const edgeKey = keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`
        const halfEdgeIndex = triangleIndex * 3 + edgeIndex
        const matches = edgeMap.get(edgeKey)
        if (matches) {
          matches.push(halfEdgeIndex)
        } else {
          edgeMap.set(edgeKey, [halfEdgeIndex])
        }
      }
    }

    for (const halfEdges of edgeMap.values()) {
      if (halfEdges.length < 2) {
        continue
      }
      const halfEdge0 = halfEdges[0]
      const halfEdge1 = halfEdges[1]
      const triangle0 = Math.floor(halfEdge0 / 3)
      const edge0 = halfEdge0 % 3
      const triangle1 = Math.floor(halfEdge1 / 3)
      const edge1 = halfEdge1 % 3

      adjacentTriangles[halfEdge0] = triangle1
      adjacentEdges[halfEdge0] = edge1
      adjacentTriangles[halfEdge1] = triangle0
      adjacentEdges[halfEdge1] = edge0
    }

    this.state = {
      triangleCount,
      origins,
      bases,
      metrics,
      adjacentTriangles,
      adjacentEdges,
      directionTransforms,
    }

    for (let halfEdge = 0; halfEdge < adjacentTriangles.length; halfEdge++) {
      const adjacentTriangle = adjacentTriangles[halfEdge]
      if (adjacentTriangle === -1) {
        continue
      }
      this.#computeDirectionTransform(
        Math.floor(halfEdge / 3),
        halfEdge % 3,
        adjacentTriangle,
        adjacentEdges[halfEdge],
        vertexKeys,
      )
    }

    return this
  }

  surfacePointToPosition<T extends MutableVector3Like>(
    point: SurfacePoint,
    out?: T,
  ): T {
    const { triangleIndex, x: u, y: v } = point
    const originOffset = triangleIndex * 3
    const basisOffset = triangleIndex * 6
    const { origins, bases } = this.state
    out = out ?? { x: 0, y: 0, z: 0 } as T
    out.x = origins[originOffset]
      + bases[basisOffset] * u
      + bases[basisOffset + 3] * v
    out.y = origins[originOffset + 1]
      + bases[basisOffset + 1] * u
      + bases[basisOffset + 4] * v
    out.z = origins[originOffset + 2]
      + bases[basisOffset + 2] * u
      + bases[basisOffset + 5] * v
    return out
  }

  walk(
    start: SurfacePoint,
    direction: MutableVector2Like,
    options: OptimizedWalkOptions = {},
    out: OptimizedWalkResult = createResult(),
  ): OptimizedWalkResult {
    const {
      maxIterations = 1000,
      maxDistance = Infinity,
      matrix = null,
      recordPath = false,
    } = options
    const {
      metrics,
      bases,
      adjacentTriangles,
      adjacentEdges,
      directionTransforms,
    } = this.state

    let triangleIndex = start.triangleIndex
    let u = start.x
    let v = start.y
    let du = direction.x
    let dv = direction.y
    let distance = 0
    let iterations = 0

    let path: PathSegment[] | undefined
    if (recordPath) {
      path = out.path ?? []
      path.length = 0
      out.path = path
    } else {
      out.path = undefined
    }

    while (iterations < maxIterations) {
      iterations++

      const t0 = du < 0 ? -u / du : Infinity
      const t1 = dv < 0 ? -v / dv : Infinity
      const duv = du + dv
      const t2 = duv > 0 ? (1 - u - v) / duv : Infinity
      const t = Math.min(t0, t1, t2)

      if (!Number.isFinite(t) || t < 0) {
        return this.#writeResult(
          out,
          triangleIndex,
          u,
          v,
          du,
          dv,
          WalkStatus.MaxIterations,
          iterations,
          distance,
        )
      }

      const edgeIndex = t === t0 ? 2 : t === t1 ? 0 : 1
      const intersectionU = u + du * t
      const intersectionV = v + dv * t
      const segmentU = intersectionU - u
      const segmentV = intersectionV - v
      const segmentDistance = this.#segmentLength(
        triangleIndex,
        segmentU,
        segmentV,
        metrics,
        bases,
        matrix,
      )
      const availableDistance = Math.max(0, maxDistance - distance)

      if (Number.isFinite(availableDistance) && segmentDistance >= availableDistance) {
        const ratio = segmentDistance > 0 ? availableDistance / segmentDistance : 0
        const finalU = u + segmentU * ratio
        const finalV = v + segmentV * ratio
        if (path) {
          path.push({ triangleIndex, u0: u, v0: v, u1: finalU, v1: finalV })
        }
        return this.#writeResult(
          out,
          triangleIndex,
          finalU,
          finalV,
          du,
          dv,
          WalkStatus.MaxDistance,
          iterations,
          distance + availableDistance,
        )
      }

      if (path) {
        path.push({
          triangleIndex,
          u0: u,
          v0: v,
          u1: intersectionU,
          v1: intersectionV,
        })
      }
      distance += segmentDistance

      const halfEdge = triangleIndex * 3 + edgeIndex
      const nextTriangle = adjacentTriangles[halfEdge]
      if (nextTriangle === -1) {
        return this.#writeResult(
          out,
          triangleIndex,
          intersectionU,
          intersectionV,
          du,
          dv,
          WalkStatus.BoundaryHit,
          iterations,
          distance,
        )
      }

      const nextEdge = adjacentEdges[halfEdge]
      let nextU = 0
      let nextV = 0
      if (edgeIndex === 0) {
        if (nextEdge === 0) {
          nextU = 1 - intersectionU
        } else if (nextEdge === 1) {
          nextU = intersectionU
          nextV = 1 - intersectionU
        } else {
          nextV = intersectionU
        }
      } else if (edgeIndex === 1) {
        if (nextEdge === 0) {
          nextU = 1 - intersectionV
        } else if (nextEdge === 1) {
          nextU = intersectionV
          nextV = intersectionU
        } else {
          nextV = 1 - intersectionU
        }
      } else if (nextEdge === 0) {
        nextU = intersectionV
      } else if (nextEdge === 1) {
        nextU = 1 - intersectionV
        nextV = intersectionV
      } else {
        nextV = 1 - intersectionV
      }

      const transformOffset = halfEdge * 4
      const nextDu = directionTransforms[transformOffset] * du
        + directionTransforms[transformOffset + 1] * dv
      const nextDv = directionTransforms[transformOffset + 2] * du
        + directionTransforms[transformOffset + 3] * dv

      triangleIndex = nextTriangle
      u = nextU
      v = nextV
      du = nextDu
      dv = nextDv
    }

    return this.#writeResult(
      out,
      triangleIndex,
      u,
      v,
      du,
      dv,
      WalkStatus.MaxIterations,
      iterations,
      distance,
    )
  }

  #segmentLength(
    triangleIndex: number,
    du: number,
    dv: number,
    metrics: Float64Array,
    bases: Float64Array,
    matrix: Matrix4 | null,
  ): number {
    if (!matrix) {
      const metricOffset = triangleIndex * 3
      return Math.sqrt(
        du * du * metrics[metricOffset]
        + 2 * du * dv * metrics[metricOffset + 1]
        + dv * dv * metrics[metricOffset + 2]
      )
    }

    const basisOffset = triangleIndex * 6
    const x = bases[basisOffset] * du + bases[basisOffset + 3] * dv
    const y = bases[basisOffset + 1] * du + bases[basisOffset + 4] * dv
    const z = bases[basisOffset + 2] * du + bases[basisOffset + 5] * dv
    const e = matrix.elements
    const transformedX = e[0] * x + e[4] * y + e[8] * z
    const transformedY = e[1] * x + e[5] * y + e[9] * z
    const transformedZ = e[2] * x + e[6] * y + e[10] * z
    return Math.sqrt(
      transformedX * transformedX
      + transformedY * transformedY
      + transformedZ * transformedZ
    )
  }

  #writeResult(
    out: OptimizedWalkResult,
    triangleIndex: number,
    u: number,
    v: number,
    directionU: number,
    directionV: number,
    status: WalkStatus,
    iterations: number,
    distance: number,
  ): OptimizedWalkResult {
    out.point.triangleIndex = triangleIndex
    out.point.x = u
    out.point.y = v
    out.direction.x = directionU
    out.direction.y = directionV
    out.status = status
    out.iterations = iterations
    out.distance = distance
    return out
  }

  #computeDirectionTransform(
    triangle0: number,
    edge0: number,
    triangle1: number,
    edge1: number,
    vertexKeys: string[],
  ): void {
    const { metrics, directionTransforms } = this.state
    const metricOffset0 = triangle0 * 3
    const metricOffset1 = triangle1 * 3
    const g00 = metrics[metricOffset0]
    const g01 = metrics[metricOffset0 + 1]
    const g11 = metrics[metricOffset0 + 2]
    const h00 = metrics[metricOffset1]
    const h01 = metrics[metricOffset1 + 1]
    const h11 = metrics[metricOffset1 + 2]

    const u0x = Math.sqrt(g00)
    const u0y = 0
    const v0x = g01 / u0x
    const v0y = Math.sqrt(Math.max(0, g11 - v0x * v0x))
    const p0x = [0, u0x, v0x]
    const p0y = [0, u0y, v0y]
    const p1x = [0, 0, 0]
    const p1y = [0, 0, 0]
    const [edge0A, edge0B] = edgeVertices[edge0]
    const [edge1A, edge1B] = edgeVertices[edge1]
    const keyOffset0 = triangle0 * 3
    const keyOffset1 = triangle1 * 3

    const vertex0A = this.#matchingVertex(
      vertexKeys,
      keyOffset0,
      vertexKeys[keyOffset1 + edge1A],
      edge0A,
      edge0B,
    )
    const vertex0B = this.#matchingVertex(
      vertexKeys,
      keyOffset0,
      vertexKeys[keyOffset1 + edge1B],
      edge0A,
      edge0B,
    )
    p1x[edge1A] = p0x[vertex0A]
    p1y[edge1A] = p0y[vertex0A]
    p1x[edge1B] = p0x[vertex0B]
    p1y[edge1B] = p0y[vertex0B]

    const third0 = 3 - edge0A - edge0B
    const third1 = 3 - edge1A - edge1B
    const centerAx = p1x[edge1A]
    const centerAy = p1y[edge1A]
    const centerBx = p1x[edge1B]
    const centerBy = p1y[edge1B]
    const edgeX = centerBx - centerAx
    const edgeY = centerBy - centerAy
    const edgeLengthSq = edgeX * edgeX + edgeY * edgeY
    const edgeLength = Math.sqrt(edgeLengthSq)
    const radiusASq = this.#edgeLengthSq(edge1A, third1, h00, h01, h11)
    const radiusBSq = this.#edgeLengthSq(edge1B, third1, h00, h01, h11)
    const along = (radiusASq - radiusBSq + edgeLengthSq) / (2 * edgeLength)
    const height = Math.sqrt(Math.max(0, radiusASq - along * along))
    const axisX = edgeX / edgeLength
    const axisY = edgeY / edgeLength
    const baseX = centerAx + axisX * along
    const baseY = centerAy + axisY * along
    const perpendicularX = -axisY
    const perpendicularY = axisX
    const side0 = edgeX * (p0y[third0] - centerAy)
      - edgeY * (p0x[third0] - centerAx)
    const candidateX = baseX + perpendicularX * height
    const candidateY = baseY + perpendicularY * height
    const candidateSide = edgeX * (candidateY - centerAy)
      - edgeY * (candidateX - centerAx)
    const sign = candidateSide * side0 <= 0 ? 1 : -1
    p1x[third1] = baseX + perpendicularX * height * sign
    p1y[third1] = baseY + perpendicularY * height * sign

    const u1x = p1x[1] - p1x[0]
    const u1y = p1y[1] - p1y[0]
    const v1x = p1x[2] - p1x[0]
    const v1y = p1y[2] - p1y[0]
    const determinant = u1x * v1y - v1x * u1y
    const transformOffset = (triangle0 * 3 + edge0) * 4

    directionTransforms[transformOffset] = (v1y * u0x - v1x * u0y) / determinant
    directionTransforms[transformOffset + 1] = (v1y * v0x - v1x * v0y) / determinant
    directionTransforms[transformOffset + 2] = (-u1y * u0x + u1x * u0y) / determinant
    directionTransforms[transformOffset + 3] = (-u1y * v0x + u1x * v0y) / determinant
  }

  #matchingVertex(
    vertexKeys: string[],
    triangle0KeyOffset: number,
    triangle1VertexKey: string,
    edge0A: number,
    edge0B: number,
  ): number {
    return vertexKeys[triangle0KeyOffset + edge0A] === triangle1VertexKey
      ? edge0A
      : edge0B
  }

  #edgeLengthSq(
    vertexA: number,
    vertexB: number,
    g00: number,
    g01: number,
    g11: number,
  ): number {
    if ((vertexA === 0 && vertexB === 1) || (vertexA === 1 && vertexB === 0)) {
      return g00
    }
    if ((vertexA === 0 && vertexB === 2) || (vertexA === 2 && vertexB === 0)) {
      return g11
    }
    return g00 + g11 - 2 * g01
  }
}
