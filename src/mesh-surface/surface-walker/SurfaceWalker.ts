import { BufferGeometry, Matrix3, Matrix4, Vector2, Vector3 } from 'three'

import { fromVector2Declaration, fromVector3Declaration, Vector2Declaration, Vector2DeclarationLoose, Vector3Declaration } from '../../declaration'
import { Matrix2 } from '../../math/Matrix2'

import { HashMapArray } from '../../collections/hash-map'
import { distancePointToLineSq, findFirstEdgeIntersection, solveTriangle2D, transposeIntersectionUV } from './math'
import { PathSegment, SurfacePoint, WalkStatus } from './types'

class TriangleView {
  walker!: SurfaceWalker
  triangleIndex!: number

  A = new Vector3()
  B = new Vector3()
  C = new Vector3()

  AB = new Vector3()
  AC = new Vector3()
  AB_length = 0
  AC_length = 0

  constructor(walker: SurfaceWalker, triangleIndex: number) {
    this.set(walker, triangleIndex)
  }

  set(walker: SurfaceWalker, triangleIndex: number): this {
    this.walker = walker
    this.triangleIndex = triangleIndex

    this.walker.triangleVertices(triangleIndex, [this.A, this.B, this.C])
    this.AB.subVectors(this.B, this.A)
    this.AC.subVectors(this.C, this.A)
    this.AB_length = this.AB.length()
    this.AC_length = this.AC.length()

    return this
  }

  clone(): TriangleView {
    return new TriangleView(this.walker, this.triangleIndex)
  }

  getPositionFromUV(u: number, v: number, out = new Vector3()): Vector3 {
    return out
      .set(0, 0, 0)
      .addScaledVector(this.A, 1 - u - v)
      .addScaledVector(this.B, u)
      .addScaledVector(this.C, v)
  }

  static #getPosition_cache = new Vector2()
  getPosition(uvArg: Vector2Declaration, out = new Vector3()): Vector3 {
    const uv = fromVector2Declaration(uvArg, TriangleView.#getPosition_cache)
    return this.getPositionFromUV(uv.x, uv.y, out)
  }

  static #getUV_cache = {
    P: new Vector3(),
    AP: new Vector3(),
  }
  getUV(pointArg: Vector3Declaration, out = new Vector2()): Vector2 {
    const { P, AP } = TriangleView.#getUV_cache
    const { AB, AC } = this
    fromVector3Declaration(pointArg, P)
    AP.subVectors(P, this.A)

    const d00 = AB.dot(AB)
    const d01 = AB.dot(AC)
    const d11 = AC.dot(AC)
    const d20 = AP.dot(AB)
    const d21 = AP.dot(AC)

    const denom = d00 * d11 - d01 * d01
    const v = (d11 * d20 - d01 * d21) / denom
    const w = (d00 * d21 - d01 * d20) / denom

    return out.set(v, w)
  }

  static #getClosestEdgeIndex_cache = {
    P: new Vector3(),
    BC: new Vector3(),
  }
  getClosestEdgeIndex(pointArg: Vector3Declaration): number {
    const { P, BC } = TriangleView.#getClosestEdgeIndex_cache
    const { A, B, C, AB, AC } = this
    fromVector3Declaration(pointArg, P)

    const scoreAB = distancePointToLineSq(P, A, AB)
    const scoreBC = distancePointToLineSq(P, B, BC.subVectors(C, B))
    const scoreAC = distancePointToLineSq(P, A, AC)
    if (scoreAB <= scoreBC) {
      if (scoreAB <= scoreAC) {
        return 0
      } else {
        return 2
      }
    } else {
      if (scoreBC <= scoreAC) {
        return 1
      } else {
        return 2
      }
    }
  }
}

/**
 * Represents a segment of the walk path that lies within a single triangle.
 */
class LinkedPathSegment implements PathSegment {
  triangleIndex: number
  u0: number
  v0: number
  u1: number
  v1: number

  walker: SurfaceWalker
  next: LinkedPathSegment | null = null

  constructor(
    walker: SurfaceWalker,
    triangleIndex: number,
    u0: number,
    v0: number,
    u1: number,
    v1: number
  ) {
    this.walker = walker
    this.triangleIndex = triangleIndex
    this.u0 = u0
    this.v0 = v0
    this.u1 = u1
    this.v1 = v1
  }

  getPosition0(out = new Vector3()): Vector3 {
    return this.walker.triangle(this.triangleIndex).getPositionFromUV(this.u0, this.v0, out)
  }

  getPosition1(out = new Vector3()): Vector3 {
    return this.walker.triangle(this.triangleIndex).getPositionFromUV(this.u1, this.v1, out)
  }
}

class Triangle2DSolver {
  // Triangle 0 (current) in 2D orthogonal space
  // p0 is always at origin (0, 0)
  t0_u = new Vector2()          // Vector from p0 to p1
  t0_u_length = 0
  t0_v = new Vector2()          // Vector from p0 to p2
  t0_v_length = 0
  t0_uv_angle = 0
  t0_w = new Vector2()          // Vector from p1 to p2
  t0_w_length = 0
  t0_start_uv = new Vector2()
  t0_delta_uv = new Vector2()

  // Triangle 1 (next) edge lengths
  t1_u_length = 0
  t1_v_length = 0
  t1_w_length = 0

  // Triangle 1 vertices in 2D orthogonal space
  t1_p0 = new Vector2()
  t1_p1 = new Vector2()
  t1_p2 = new Vector2()

  // Triangle 1 basis vectors
  t1_u = new Vector2()
  t1_v = new Vector2()

  // Results: intersection point and direction in t1 space
  t1_I_uv = new Vector2()
  t1_remaining_delta_uv = new Vector2()

  // Transform matrices
  m0 = new Matrix2()
  m1_inv = new Matrix2()
  m_01 = new Matrix2()

  /**
   * Solves the 2D triangle transformation problem.
   * 
   * @param tri0 - Current triangle
   * @param e0 - Edge index in tri0 where intersection occurs (0=AB, 1=BC, 2=CA)
   * @param t0_start_uv - Starting barycentric coordinates in tri0
   * @param t0_delta_uv - Movement delta in tri0 barycentric space
   * @param t0_I_uv - Intersection point in tri0 barycentric space
   * @param tri1 - Next triangle
   * @param e1 - Edge index in tri1 that corresponds to e0 (0=AB, 1=BC, 2=CA)
   */
  solve(
    tri0: TriangleView,
    e0: number,
    t0_start_uv: Vector2,
    t0_delta_uv: Vector2,
    t0_I_uv: Vector2,
    tri1: TriangleView,
    e1: number,
  ): this {
    this.t0_start_uv = t0_start_uv
    this.t0_delta_uv = t0_delta_uv

    // Build tri0 in 2D orthogonal space with p0 at origin
    this.t0_u_length = tri0.AB_length
    this.t0_u.set(this.t0_u_length, 0)
    this.t0_uv_angle = tri0.AB.angleTo(tri0.AC)
    this.t0_v_length = tri0.AC_length
    this.t0_v.set(
      this.t0_v_length * Math.cos(this.t0_uv_angle),
      this.t0_v_length * Math.sin(this.t0_uv_angle)
    )
    this.t0_w.subVectors(this.t0_v, this.t0_u)
    this.t0_w_length = this.t0_w.length()

    // Transpose intersection UV from tri0 to tri1
    transposeIntersectionUV(
      t0_I_uv,
      e0,
      e1,
      this.t1_I_uv,
    )

    // Get tri1 edge lengths
    this.t1_u_length = tri1.AB_length
    this.t1_v_length = tri1.AC_length
    this.t1_w_length = tri1.B.distanceTo(tri1.C)

    // Solve tri1 vertices in 2D orthogonal space
    // Uses circle intersection - two circles centered at known points with known radii
    // must intersect at the unknown third vertex
    solveTriangle2D(
      e0,
      e1,
      this.t0_u,
      this.t0_v,

      this.t1_u_length,
      this.t1_v_length,
      this.t1_w_length,

      this.t1_p0,
      this.t1_p1,
      this.t1_p2,
    )

    // Compute tri1 basis vectors (from p0 to p1, from p0 to p2)
    this.t1_u.subVectors(this.t1_p1, this.t1_p0)
    this.t1_v.subVectors(this.t1_p2, this.t1_p0)

    // Build transformation matrix from tri0 barycentric space to tri1 barycentric space
    // m0: tri0 barycentric -> 2D orthogonal
    // m1_inv: 2D orthogonal -> tri1 barycentric
    // m_01 = m1_inv * m0: tri0 barycentric -> tri1 barycentric
    this.m0.setBasis(this.t0_u, this.t0_v)
    this.m1_inv.setBasis(this.t1_u, this.t1_v).invert()
    this.m_01.multiplyMatrices(this.m1_inv, this.m0)

    // Transform the full direction from tri0 space to tri1 space
    this.t1_remaining_delta_uv.copy(t0_delta_uv)
    this.m_01.applyTo(this.t1_remaining_delta_uv)

    return this
  }
}

/**
 * Result of a walk operation across the mesh surface.
 */
export class WalkResult {
  constructor(
    /** The walker instance used for this walk */
    public walker: SurfaceWalker,

    /** Time taken for the walk operation in milliseconds (for performance analysis) */
    public computeTime: number,

    /** The final triangle reached */
    public finalTriangleIndex: number,

    /** The final barycentric coordinates in the final triangle */
    public finalUV: Vector2,

    /** Path segments traversed (each segment is within one triangle) */
    public path: LinkedPathSegment[],

    /** Walk direction in the final triangle's barycentric space */
    public remainingDeltaUV: Vector2,

    /** Reason why the walk stopped */
    public status: WalkStatus,
  ) { }

  get statusString(): string {
    return WalkStatus[this.status]
  }

  getFinalPosition(out = new Vector3()): Vector3 {
    return this.walker.triangle(this.finalTriangleIndex).getPosition(this.finalUV, out)
  }
}

export type SurfacePointDeclaration =
  | SurfacePoint
  | [triangleIndex: number, u: number, v: number]

export function fromSurfacePointDeclaration(decl: SurfacePointDeclaration): SurfacePoint {
  if (Array.isArray(decl)) {
    return {
      triangleIndex: decl[0],
      x: decl[1],
      y: decl[2],
    }
  }
  return decl
}

/**
 * (Triangle) Surface Walker
 */
export class SurfaceWalker {
  pointsBuffer = new Float32Array(0)
  indicesBuffer = null as Uint16Array | null

  /**
   * Triangle adjacency information, as an array of triangleCount * 3 elements.
   * Each triangle has 3 entries, one per edge, indicating the index of the adjacent triangle.
   * 
   * Edge indexing:
   * - Edge 0: from vertex A to vertex B (the "u" edge in barycentric space)
   * - Edge 1: from vertex B to vertex C (the "w" edge)
   * - Edge 2: from vertex C to vertex A (opposite of "v" edge)
   * 
   * Value is 0xFFFF if there is no adjacent triangle on that edge (boundary edge).
   */
  triangleAdjacencyArray = new Uint16Array(0)

  get triangleCount() {
    if (this.indicesBuffer) {
      return this.indicesBuffer.length / 3
    } else {
      return this.pointsBuffer.length / 9
    }
  }

  static #getTriangleVertices_cache = {
    ABC: [
      new Vector3(),
      new Vector3(),
      new Vector3(),
    ] as [Vector3, Vector3, Vector3],
  }
  triangleVertices(triangleIndex: number, out?: [Vector3, Vector3, Vector3]): [Vector3, Vector3, Vector3] {
    const { ABC } = SurfaceWalker.#getTriangleVertices_cache
    const A = out?.[0] ?? ABC[0]
    const B = out?.[1] ?? ABC[1]
    const C = out?.[2] ?? ABC[2]

    let ai: number, bi: number, ci: number
    if (this.indicesBuffer) {
      ai = this.indicesBuffer[triangleIndex * 3 + 0] * 3
      bi = this.indicesBuffer[triangleIndex * 3 + 1] * 3
      ci = this.indicesBuffer[triangleIndex * 3 + 2] * 3
    } else {
      ai = triangleIndex * 9 + 0
      bi = triangleIndex * 9 + 3
      ci = triangleIndex * 9 + 6
    }

    const arr = this.pointsBuffer
    A.set(arr[ai + 0], arr[ai + 1], arr[ai + 2])
    B.set(arr[bi + 0], arr[bi + 1], arr[bi + 2])
    C.set(arr[ci + 0], arr[ci + 1], arr[ci + 2])

    return out ?? ABC
  }

  /**
   * For debugging purposes.
   * 
   * Rotates the vertex indices of the specified triangle (permuting the vertices 
   * indices or positions).
   * 
   * Useful for testing different edge cases in the walk algorithm, by changing which edge is considered edge 0, 1, or 2.
   * 
   * Notes:
   * - ⚠️ This mutates the underlying geometry data and adjacency information, 
   *   so it should only be used for testing and debugging, not in production code.
   */
  rotateVertexIndex(triangleIndex: number, offset = 1): this {
    offset = (offset % 3 + 3) % 3

    // Rotate adjacency info
    if (this.triangleAdjacencyArray.length > 0) {
      const adj0 = this.triangleAdjacencyArray[triangleIndex * 3 + 0]
      const adj1 = this.triangleAdjacencyArray[triangleIndex * 3 + 1]
      const adj2 = this.triangleAdjacencyArray[triangleIndex * 3 + 2]
      if (offset === 1) {
        this.triangleAdjacencyArray[triangleIndex * 3 + 0] = adj1
        this.triangleAdjacencyArray[triangleIndex * 3 + 1] = adj2
        this.triangleAdjacencyArray[triangleIndex * 3 + 2] = adj0
      } else if (offset === 2) {
        this.triangleAdjacencyArray[triangleIndex * 3 + 0] = adj2
        this.triangleAdjacencyArray[triangleIndex * 3 + 1] = adj0
        this.triangleAdjacencyArray[triangleIndex * 3 + 2] = adj1
      }
    }

    // Rotate triangle vertices in geometry buffers
    if (this.indicesBuffer) {
      const i0 = this.indicesBuffer[triangleIndex * 3 + 0]
      const i1 = this.indicesBuffer[triangleIndex * 3 + 1]
      const i2 = this.indicesBuffer[triangleIndex * 3 + 2]
      if (offset === 1) {
        this.indicesBuffer[triangleIndex * 3 + 0] = i1
        this.indicesBuffer[triangleIndex * 3 + 1] = i2
        this.indicesBuffer[triangleIndex * 3 + 2] = i0
      } else if (offset === 2) {
        this.indicesBuffer[triangleIndex * 3 + 0] = i2
        this.indicesBuffer[triangleIndex * 3 + 1] = i0
        this.indicesBuffer[triangleIndex * 3 + 2] = i1
      }
    } else {
      const baseIndex = triangleIndex * 9
      const x0 = this.pointsBuffer[baseIndex + 0]
      const y0 = this.pointsBuffer[baseIndex + 1]
      const z0 = this.pointsBuffer[baseIndex + 2]
      const x1 = this.pointsBuffer[baseIndex + 3]
      const y1 = this.pointsBuffer[baseIndex + 4]
      const z1 = this.pointsBuffer[baseIndex + 5]
      const x2 = this.pointsBuffer[baseIndex + 6]
      const y2 = this.pointsBuffer[baseIndex + 7]
      const z2 = this.pointsBuffer[baseIndex + 8]
      if (offset === 1) {
        this.pointsBuffer[baseIndex + 0] = x1
        this.pointsBuffer[baseIndex + 1] = y1
        this.pointsBuffer[baseIndex + 2] = z1
        this.pointsBuffer[baseIndex + 3] = x2
        this.pointsBuffer[baseIndex + 4] = y2
        this.pointsBuffer[baseIndex + 5] = z2
        this.pointsBuffer[baseIndex + 6] = x0
        this.pointsBuffer[baseIndex + 7] = y0
        this.pointsBuffer[baseIndex + 8] = z0
      } else if (offset === 2) {
        this.pointsBuffer[baseIndex + 0] = x2
        this.pointsBuffer[baseIndex + 1] = y2
        this.pointsBuffer[baseIndex + 2] = z2
        this.pointsBuffer[baseIndex + 3] = x0
        this.pointsBuffer[baseIndex + 4] = y0
        this.pointsBuffer[baseIndex + 5] = z0
        this.pointsBuffer[baseIndex + 6] = x1
        this.pointsBuffer[baseIndex + 7] = y1
        this.pointsBuffer[baseIndex + 8] = z1
      }
    }
    return this
  }

  #triangle_cache = new TriangleView(this, -1);
  triangle(triangleIndex: number, out?: TriangleView): TriangleView {
    return (out ?? this.#triangle_cache).set(this, triangleIndex)
  }

  fromGeometry(geometry: BufferGeometry) {
    this.pointsBuffer = geometry.attributes.position.array as Float32Array<ArrayBuffer>
    if (geometry.index) {
      this.indicesBuffer = geometry.index.array as Uint16Array
    } else {
      this.indicesBuffer = null
    }
    this.#computeAdjacency()
    return this
  }

  #computeAdjacency() {
    const vertexToTriangleMap = new HashMapArray<Vector3, { triangleIndex: number; localVertexIndex: number }>({
      hash: v => {
        const prime = 31
        let hash = 17
        hash = hash * prime + Math.floor(v.x * 1000000)
        hash = hash * prime + Math.floor(v.y * 1000000)
        hash = hash * prime + Math.floor(v.z * 1000000)
        return hash
      },
      equals: (a, b) => a.x === b.x && a.y === b.y && a.z === b.z,
      clone: v => v.clone()
    })

    const triangleCount = this.triangleCount
    this.triangleAdjacencyArray = new Uint16Array(triangleCount * 3)
    this.triangleAdjacencyArray.fill(0xFFFF)

    for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex++) {
      const triangleVertices = this.triangleVertices(triangleIndex)
      for (let localVertexIndex = 0; localVertexIndex < 3; localVertexIndex++) {
        const vertex = triangleVertices[localVertexIndex]
        vertexToTriangleMap.add(vertex, { triangleIndex, localVertexIndex })
      }
    }

    for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex++) {
      const [v0, v1, v2] = this.triangleVertices(triangleIndex)
      const candidates0 = vertexToTriangleMap.get(v0)!.filter(e => e.triangleIndex !== triangleIndex)
      const candidates1 = vertexToTriangleMap.get(v1)!.filter(e => e.triangleIndex !== triangleIndex)
      const candidates2 = vertexToTriangleMap.get(v2)!.filter(e => e.triangleIndex !== triangleIndex)

      // Edge 0 (v0-v1): shared by candidates0 and candidates1
      const edge0 = candidates1.findIndex(e1 => candidates0.some(e0 => e0.triangleIndex === e1.triangleIndex))
      // Edge 1 (v1-v2): shared by candidates1 and candidates2
      const edge1 = candidates2.findIndex(e2 => candidates1.some(e1 => e1.triangleIndex === e2.triangleIndex))
      // Edge 2 (v2-v0): shared by candidates2 and candidates0
      const edge2 = candidates0.findIndex(e0 => candidates2.some(e2 => e2.triangleIndex === e0.triangleIndex))

      this.triangleAdjacencyArray[triangleIndex * 3 + 0] = edge0 >= 0 ? candidates1[edge0].triangleIndex : 0xFFFF
      this.triangleAdjacencyArray[triangleIndex * 3 + 1] = edge1 >= 0 ? candidates2[edge1].triangleIndex : 0xFFFF
      this.triangleAdjacencyArray[triangleIndex * 3 + 2] = edge2 >= 0 ? candidates0[edge2].triangleIndex : 0xFFFF
    }
  }

  static #triangleAdjacency_cache = [0, 0, 0] as [number, number, number];
  /**
   * Returns the adjacent triangle indices for each edge.
   * 
   * @returns [adjEdge0, adjEdge1, adjEdge2] where each value is the triangle index
   *          of the adjacent triangle, or -1 if the edge is a boundary edge.
   * 
   * Notes:
   * - ⚠️ The returned array is a shared cache, do not store it.
   */
  triangleAdjacency(triangleIndex: number): [number, number, number] {
    const cache = SurfaceWalker.#triangleAdjacency_cache
    const normalize = (index: number) => index === 0xFFFF ? -1 : index
    cache[0] = normalize(this.triangleAdjacencyArray[triangleIndex * 3 + 0])
    cache[1] = normalize(this.triangleAdjacencyArray[triangleIndex * 3 + 1])
    cache[2] = normalize(this.triangleAdjacencyArray[triangleIndex * 3 + 2])
    return cache
  }

  surfacePointToPosition(point: SurfacePoint, out = new Vector3()): Vector3 {
    const { triangleIndex: index, x: u, y: v } = point
    return this.triangle(index).getPositionFromUV(u, v, out)
  }

  // Reusable instances to avoid allocations in hot path
  #tri0 = new TriangleView(this, -1);
  #tri1 = new TriangleView(this, -1);
  #solver = new Triangle2DSolver()

  /**
   * For debugging purposes.
   * 
   * Exposes the internal triangle solver which computes the coordinate transformation
   * when crossing from one triangle to another. This allows testing the solver in isolation,
   * by manually setting up triangle configurations and verifying the results.
   */
  get solver(): Triangle2DSolver {
    return this.#solver
  }

  // Working memory for walk iterations
  #walkState = {
    currentUV: new Vector2(),
    remainingDelta: new Vector2(),
    intersectionUV: new Vector2(),
    segmentDeltaUV: new Vector2(),
    segmentDeltaWorld: new Vector3(),
    distanceMatrix: new Matrix3(),
  }

  /**
   * Walks across the mesh surface following a direction vector in barycentric space.
   * 
   * The walk starts at `startUV` in triangle `startTriangleIndex` and follows
   * `deltaUV` as a direction in barycentric coordinates. The walk continues across triangle boundaries
   * until either:
   * - A boundary edge is reached with no adjacent triangle (status = BoundaryHit)
   * - Maximum iterations are reached (status = MaxIterations)
   * - The maximum distance is reached (status = MaxDistance)
   * 
   * @param startTriangleIndex - Index of the starting triangle
   * @param startUVArg - Starting barycentric coordinates (u, v) where u+v <= 1
   * @param deltaUVArg - Walk direction in barycentric space; its magnitude is ignored
   * @param maxIterations - Safety limit on triangle crossings (default 1000)
   * @param maxDistance - Maximum distance along the surface (default Infinity)
   * @param matrix - Optional transform used when measuring the distance
   * @returns WalkResult containing final position, path, and completion status
   */
  walk(
    startTriangleIndex: number,
    startUVArg: Vector2DeclarationLoose,
    deltaUVArg: Vector2DeclarationLoose,
    {
      maxIterations = 1000 as number,
      maxDistance = Infinity as number,
      matrix = null as Matrix4 | null,
    } = {}
  ): WalkResult {
    const now = () => globalThis.performance?.now?.() ?? Date.now()
    const tStart = now()

    const startUV = fromVector2Declaration(startUVArg)
    const deltaUV = fromVector2Declaration(deltaUVArg)

    const state = this.#walkState
    state.currentUV.copy(startUV)
    state.remainingDelta.copy(deltaUV)
    if (matrix) {
      state.distanceMatrix.setFromMatrix4(matrix)
    } else {
      state.distanceMatrix.identity()
    }

    const path: LinkedPathSegment[] = []
    let currentTriangleIndex = startTriangleIndex
    let iterations = 0
    let distance = 0

    const addSegment = (endUV: Vector2): WalkResult | null => {
      const triangle = this.#tri0.set(this, currentTriangleIndex)
      state.segmentDeltaUV.subVectors(endUV, state.currentUV)
      state.segmentDeltaWorld
        .copy(triangle.AB)
        .multiplyScalar(state.segmentDeltaUV.x)
        .addScaledVector(triangle.AC, state.segmentDeltaUV.y)
        .applyMatrix3(state.distanceMatrix)

      const segmentDistance = state.segmentDeltaWorld.length()
      const availableDistance = Math.max(0, maxDistance - distance)

      if (Number.isFinite(availableDistance) && segmentDistance >= availableDistance) {
        const ratio = segmentDistance > 0 ? availableDistance / segmentDistance : 0
        const finalUV = state.currentUV.clone().lerp(endUV, ratio)
        path.push(new LinkedPathSegment(
          this,
          currentTriangleIndex,
          state.currentUV.x,
          state.currentUV.y,
          finalUV.x,
          finalUV.y
        ))

        return new WalkResult(
          this,
          now() - tStart,
          currentTriangleIndex,
          finalUV,
          path,
          state.remainingDelta.clone(),
          WalkStatus.MaxDistance,
        )
      }

      distance += segmentDistance
      path.push(new LinkedPathSegment(
        this,
        currentTriangleIndex,
        state.currentUV.x,
        state.currentUV.y,
        endUV.x,
        endUV.y
      ))
      return null
    }

    while (iterations < maxIterations) {
      iterations++

      // Check if we cross an edge in the current triangle
      const intersection = findFirstEdgeIntersection(state.currentUV, state.remainingDelta)

      if (intersection.valid === false) {
        break
      }

      // We hit an edge - add segment to path
      const e0 = intersection.edgeIndex  // Edge index in current triangle
      state.intersectionUV.copy(intersection.uv)

      const maxDistanceResult = addSegment(state.intersectionUV)
      if (maxDistanceResult) {
        return maxDistanceResult
      }

      // Check if there's an adjacent triangle across this edge
      const adjacency = this.triangleAdjacency(currentTriangleIndex)
      const nextTriangleIndex = adjacency[e0]

      if (nextTriangleIndex === -1) {
        // Hit a boundary edge - cannot continue
        return new WalkResult(
          this,
          now() - tStart,
          currentTriangleIndex,
          state.intersectionUV.clone(),
          path,
          state.remainingDelta.clone(),
          WalkStatus.BoundaryHit,
        )
      }

      // Continue to next triangle
      this.#tri0.set(this, currentTriangleIndex)
      this.#tri1.set(this, nextTriangleIndex)

      // Find which edge in the next triangle corresponds to our crossing edge
      const intersectionPoint3D = this.#tri0.getPosition(state.intersectionUV)
      const e1 = this.#tri1.getClosestEdgeIndex(intersectionPoint3D)

      // Solve the coordinate transformation
      this.#solver.solve(
        this.#tri0,
        e0,
        state.currentUV,
        state.remainingDelta,
        state.intersectionUV,
        this.#tri1,
        e1,
      )

      // Update state for next iteration
      currentTriangleIndex = nextTriangleIndex
      state.currentUV.copy(this.#solver.t1_I_uv)
      state.remainingDelta.copy(this.#solver.t1_remaining_delta_uv)
    }

    // Max iterations reached
    // console.warn(`GeometryWalker.walk: Maximum iterations (${maxIterations}) reached`)
    return new WalkResult(
      this,
      now() - tStart,
      currentTriangleIndex,
      state.currentUV.clone(),
      path,
      state.remainingDelta.clone(),
      WalkStatus.MaxIterations,
    )
  }
}
