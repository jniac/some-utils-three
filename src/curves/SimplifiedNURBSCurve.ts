import { Curve, Vector3, Vector3Like, Vector4, Vector4Like } from 'three'
import { NURBSCurve } from 'three/addons/curves/NURBSCurve.js'

function createOpenKnots(degree: number, pointCount: number): number[] {
  const knots = Array<number>(degree + 1).fill(0)
  const spanCount = pointCount - degree

  for (let i = 1; i < spanCount; i++) {
    knots.push(i / spanCount)
  }

  return knots.concat(Array<number>(degree + 1).fill(1))
}

function createClosedKnots(degree: number, pointCount: number): number[] {
  const knotCount = pointCount + degree * 3 + 1
  return Array.from({ length: knotCount }, (_, index) => index)
}

function toVector4(point: Vector3Like | Vector4Like): Vector4 {
  const weight = 'w' in point && typeof point.w === 'number' ? point.w : 1
  return new Vector4(point.x, point.y, point.z, weight)
}

export class SimplifiedNURBSCurve extends Curve<Vector3> {
  static defaultParams = {
    degree: 3,
    controlPoints: <(Vector3Like | Vector4Like)[]>[
      new Vector4(0, 0, 0, 1),
      new Vector4(5, 0, 0, 1),
      new Vector4(5, 5, 0, 1),
      new Vector4(10, 5, 0, 1),
      new Vector4(15, 5, 0, 1),
    ],
    closed: false,
  }

  params: typeof SimplifiedNURBSCurve.defaultParams
  #nurbsCurve: NURBSCurve

  constructor(userParams: Partial<typeof SimplifiedNURBSCurve.defaultParams> = {}) {
    super()
    this.params = { ...SimplifiedNURBSCurve.defaultParams, ...userParams }
    const { degree, controlPoints, closed } = this.params

    if (!Number.isInteger(degree) || degree < 1) {
      throw new RangeError('The NURBS degree must be a positive integer')
    }

    if (controlPoints.length < degree + 1) {
      throw new RangeError(`A degree ${degree} NURBS requires at least ${degree + 1} control points`)
    }

    const points = controlPoints.map(toVector4)

    if (closed) {
      const periodicPoints = [
        ...points.slice(-degree),
        ...points,
        ...points.slice(0, degree),
      ]
      const knots = createClosedKnots(degree, points.length)

      this.#nurbsCurve = new NURBSCurve(
        degree,
        knots,
        periodicPoints,
        degree,
        degree + points.length,
      )
    } else {
      this.#nurbsCurve = new NURBSCurve(
        degree,
        createOpenKnots(degree, points.length),
        points,
      )
    }
  }

  getPoint(t: number, optionalTarget = new Vector3()): Vector3 {
    return this.#nurbsCurve.getPoint(t, optionalTarget)
  }
}
