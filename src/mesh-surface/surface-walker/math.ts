import { Vector2, Vector2Like, Vector3 } from 'three'

const distancePointToLine_cache = {
  op: new Vector3(),
  n: new Vector3(),
}

/**
 * Returns the *squared* distance from point p to the line defined by origin o and direction v.
 * @param p A point.
 * @param o The origin of the line.
 * @param v The direction vector of the line.
 * @returns
 */
export function distancePointToLineSq(p: Vector3, o: Vector3, v: Vector3): number {
  const { op, n } = distancePointToLine_cache
  op.subVectors(p, o)
  n.crossVectors(op, v)
  return n.lengthSq() / v.lengthSq()
}

/**
 * Returns the distance from point p to the line defined by origin o and direction v.
 * @param p A point.
 * @param o The origin of the line.
 * @param v The direction vector of the line.
 * @returns
 */
export function distancePointToLine(p: Vector3, o: Vector3, v: Vector3): number {
  const { op, n } = distancePointToLine_cache
  op.subVectors(p, o)
  n.crossVectors(op, v)
  return n.length() / v.length()
}



const findFirstEdgeIntersectionResultCache = {
  valid: false,
  t: 0,
  edgeIndex: -1,
  uv: new Vector2(),
}
/**
 * ## 🧐 ALGO!
 * 
 * Computes the first edge intersection of a ray within a triangle in UV space
 * (using barycentric coordinates).
 * 
 * Notes:
 * - The result is cached and will be overwritten on each call.
 */
export function findFirstEdgeIntersection(
  startUV: Vector2Like,
  deltaUV: Vector2Like,
) {
  const u = startUV.x
  const v = startUV.y
  const du = deltaUV.x
  const dv = deltaUV.y

  const t0 = du < 0 ? -u / du : Infinity
  const t1 = dv < 0 ? -v / dv : Infinity
  const t2 = du + dv > 0 ? (1 - u - v) / (du + dv) : Infinity

  const t = Math.min(t0, t1, t2)

  const result = findFirstEdgeIntersectionResultCache
  result.valid = Number.isFinite(t) && t >= 0
  result.t = t
  result.edgeIndex = t === t0 ? 2 : t === t1 ? 0 : t === t2 ? 1 : -1
  result.uv.set(
    u + du * t,
    v + dv * t,
  )
  return result
}



/**
 * ## 🧐 ALGO!
 * 
 * Transposes the intersection UV coordinates from one triangle to another
 * based on the edges involved in the intersection.
 * 
 * Notes:
 * - The result is stored in the `out` parameter.
 * - This function assumes that the triangles are connected along the specified edges.
 * - Edge indices are 0, 1, 2 corresponding to the triangle's edges. 0 is U, 2 is V
 */
export function transposeIntersectionUV(
  // inputs
  t0_I_uv: Vector2,
  t0_I_edge: number,
  t1_I_edge: number,

  // output
  t1_I_uv: Vector2,
) {
  const u = t0_I_uv.x
  const v = t0_I_uv.y
  switch (t0_I_edge) {
    case 0: // t0.u
      switch (t1_I_edge) {
        case 0: // t1.u
          return t1_I_uv.set(1 - u, 0)
        case 1: // t1.w
          return t1_I_uv.set(u, 1 - u)
        case 2: // t1.v
          return t1_I_uv.set(0, u)
      }
    case 1: // t0.w
      switch (t1_I_edge) {
        case 0: // t1.u
          return t1_I_uv.set(1 - v, 0)
        case 1: // t1.w
          return t1_I_uv.set(v, u)
        case 2: // t1.v
          return t1_I_uv.set(0, 1 - u)
      }
    case 2: // t0.v
      switch (t1_I_edge) {
        case 0: // t1.u
          return t1_I_uv.set(v, 0)
        case 1: // t1.w
          return t1_I_uv.set(1 - v, v)
        case 2: // t1.v
          return t1_I_uv.set(0, 1 - v)
      }
  }
}



const circleIntersection_cache = {
  AB: new Vector2(),
  ex: new Vector2(),
  ey: new Vector2(),
  p: new Vector2(),
  result: {
    count: 0,
    s0: new Vector2(),
    s1: new Vector2(),
  },
}
export function circleIntersection(
  A: Vector2,
  rA: number,
  B: Vector2,
  rB: number
): typeof circleIntersection_cache.result {
  const { AB, ex, ey, p, result } = circleIntersection_cache
  AB.subVectors(B, A)
  const d = AB.length()

  result.count = 0

  // No solution cases
  if (d > rA + rB)
    return result
  if (d < Math.abs(rA - rB))
    return result
  if (d === 0 && rA === rB)
    return result // infinite solutions

  ex.copy(AB).normalize()

  const x = (rA * rA - rB * rB + d * d) / (2 * d)
  const h2 = rA * rA - x * x

  if (h2 < 0)
    return result

  const h = Math.sqrt(h2)

  p.copy(A).addScaledVector(ex, x)
  ey.set(-ex.y, ex.x) // perpendicular vector

  // tangent
  if (h === 0) {
    result.count = 1
    return result
  }

  result.s0.copy(p).addScaledVector(ey, h)
  result.s1.copy(p).addScaledVector(ey, -h)

  return result
}


/**
 * ## 🧐 ALGO!
 * 
 * ### What do we want?
 * - To compute the positions of T1's vertices in 2D orthogonal space.
 * 
 * ### What do we have?
 * - T0's vertices positions in 2D orthogonal space where:
 *    - T0.p0 is at (0,0)
 *    - T0.p1 is at (some_given_length, 0)
 *    - T0.p2 is at (some_given_value, some_given_value)
 * - T1's edge lengths:
 *   - t1_u_length (edge from p0 to p1)
 *   - t1_v_length (edge from p0 to p2)
 *   - t1_w_length (edge from p1 to p2)
 * 
 * ### What's hard here?
 *   - Depending on which edges are involved in the intersection, the known points 
 *     change. We have to handle all combinations of edge intersections.
 * 
 * ### Notes:
 * - Edges are indexed as follows:
 *   - 0: edge from p0 to p1 (u)
 *   - 1: edge from p1 to p2 (w)
 *   - 2: edge from p0 to p2 (v)
 * - Source of confusion:
 *   - u and v refer to the barycentric coordinates within the triangle.
 *   - w refers to the third edge of the triangle.
 *   - So edges in the direct order are: u, w , inverse(v)
 * 
 * @param t0_I_edge 
 * @param t1_I_edge 
 * @param t0_u 
 * @param t0_v 
 * @param t1_u_length 
 * @param t1_v_length 
 * @param t1_w_length 
 * @param t1_p0 
 * @param t1_p1 
 * @param t1_p2 
 */
export function solveTriangle2D(
  // inputs
  // edges involved in the intersection
  t0_I_edge: number,
  t1_I_edge: number,

  // - t0:
  t0_u: Vector2,
  t0_v: Vector2,

  // - t1:
  t1_u_length: number,
  t1_v_length: number,
  t1_w_length: number,

  // outputs
  t1_p0: Vector2,
  t1_p1: Vector2,
  t1_p2: Vector2,
) {
  switch (t0_I_edge) {
    case 0: {
      switch (t1_I_edge) {
        case 0: {
          t1_p0.copy(t0_u)
          t1_p1.set(0, 0)
          const { s0 } = circleIntersection(t1_p0, t1_v_length, t1_p1, t1_w_length)
          t1_p2.copy(s0)
          break
        }
        case 1: {
          t1_p1.copy(t0_u)
          t1_p2.set(0, 0)
          const { s0 } = circleIntersection(t1_p1, t1_u_length, t1_p2, t1_v_length)
          t1_p0.copy(s0)
          break
        }
        case 2: {
          t1_p2.copy(t0_u)
          t1_p0.set(0, 0)
          const { s0 } = circleIntersection(t1_p2, t1_w_length, t1_p0, t1_u_length)
          t1_p1.copy(s0)
          break
        }
      }
      break
    }

    case 1: {
      switch (t1_I_edge) {
        case 0: {
          t1_p0.copy(t0_v)
          t1_p1.copy(t0_u)
          const { s0 } = circleIntersection(t1_p0, t1_v_length, t1_p1, t1_w_length)
          t1_p2.copy(s0)
          break
        }
        case 1: {
          t1_p1.copy(t0_v)
          t1_p2.copy(t0_u)
          const { s0 } = circleIntersection(t1_p1, t1_u_length, t1_p2, t1_v_length)
          t1_p0.copy(s0)
          break
        }
        case 2: {
          t1_p2.copy(t0_v)
          t1_p0.copy(t0_u)
          const { s0 } = circleIntersection(t1_p2, t1_w_length, t1_p0, t1_u_length)
          t1_p1.copy(s0)
          break
        }
      }
      break
    }

    case 2: {
      switch (t1_I_edge) {
        case 0: {
          t1_p0.set(0, 0)
          t1_p1.copy(t0_v)
          const { s0 } = circleIntersection(t1_p0, t1_v_length, t1_p1, t1_w_length)
          t1_p2.copy(s0)
          break
        }
        case 1: {
          t1_p1.set(0, 0)
          t1_p2.copy(t0_v)
          const { s0 } = circleIntersection(t1_p1, t1_u_length, t1_p2, t1_v_length)
          t1_p0.copy(s0)
          break
        }
        case 2: {
          t1_p2.set(0, 0)
          t1_p0.copy(t0_v)
          const { s0 } = circleIntersection(t1_p2, t1_w_length, t1_p0, t1_u_length)
          t1_p1.copy(s0)
          break
        }
      }
      break
    }
  }
}
