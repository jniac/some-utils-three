import { Vector3 } from 'three'

const _v1 = new Vector3()
const _v2 = new Vector3()
const _v3 = new Vector3()

export function closestPointsBetweenLines(
  p1: Vector3,
  d1: Vector3,
  p2: Vector3,
  d2: Vector3,
) {
  const r = _v1.subVectors(p1, p2)
  const a = d1.dot(d1)
  const e = d2.dot(d2)
  const f = d2.dot(r)
  const c = d1.dot(r)
  const b = d1.dot(d2)
  const denom = a * e - b * b
  let t1: number
  let t2: number
  if (Math.abs(denom) < 1e-6) {
    // Parallel
    t1 = 0
    t2 = f / e
  } else {
    t1 = (b * f - c * e) / denom
    t2 = (a * f - b * c) / denom
  }
  const point1 = _v2.copy(d1).multiplyScalar(t1).add(p1)
  const point2 = _v3.copy(d2).multiplyScalar(t2).add(p2)
  return {
    point1,
    point2,
    t1,
    t2,
  }
}