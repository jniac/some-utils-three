import { Line3, Sphere, Vector3 } from 'three'

export function lineIntersectSphere(
  line: Line3,
  sphere: Sphere,
  target: Vector3): boolean {
  const direction = new Vector3().subVectors(line.end, line.start)
  const offset = new Vector3().subVectors(line.start, sphere.center)

  const a = direction.dot(direction)

  if (a === 0) {
    return false
  }

  const b = offset.dot(direction)
  const c = offset.dot(offset) - sphere.radius * sphere.radius
  const discriminant = b * b - a * c

  if (discriminant < 0) {
    return false
  }

  const root = Math.sqrt(discriminant)
  const tNear = (-b - root) / a
  const tFar = (-b + root) / a

  const t = tNear >= 0 && tNear <= 1 ? tNear :
    tFar >= 0 && tFar <= 1 ? tFar :
      null

  if (t === null) {
    return false
  }

  target.copy(direction).multiplyScalar(t).add(line.start)
  return true
}
