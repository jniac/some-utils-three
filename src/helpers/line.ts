import { BufferGeometry, GreaterDepth, LineBasicMaterial, LineSegments, Matrix4, Vector2, Vector3 } from 'three'

import { Rectangle, RectangleDeclaration } from 'some-utils-ts/math/geom/rectangle'

import { fromTransformDeclaration, fromVector2Declaration, fromVector3Declaration, TransformDeclaration, Vector2Declaration, Vector3Declaration } from '../declaration'

const _vector2 = new Vector2()
const _vector3 = new Vector3()
const _m = new Matrix4()

type BasicOptions = Partial<{
  transform: TransformDeclaration
}>

function transformAndPush(existingPoints: Vector3[], newPoints: Vector3[], options?: BasicOptions): void {
  if (options?.transform) {
    fromTransformDeclaration(options.transform, _m)
    for (const point of newPoints) {
      point.applyMatrix4(_m)
    }
  }
  existingPoints.push(...newPoints)
}

export class LineHelper extends LineSegments<BufferGeometry, LineBasicMaterial> {
  points: Vector3[] = []

  showOccludedLines({ opacity = .2 } = {}): this {
    const material = new LineBasicMaterial({
      color: this.material.color,
      transparent: true,
      depthFunc: GreaterDepth,
      opacity,
    })
    const clone = new LineSegments(this.geometry, material)
    this.add(clone)
    return this
  }

  clear(): this {
    this.points.length = 0
    this.geometry.setFromPoints(this.points)
    return this
  }

  draw(): this {
    this.geometry.setFromPoints(this.points)
    this.geometry.computeBoundingSphere()
    return this
  }

  line(a: Vector3Declaration, b: Vector3Declaration, options?: BasicOptions): this {
    const va = fromVector3Declaration(a)
    const vb = fromVector3Declaration(b)
    transformAndPush(this.points, [va, vb], options)
    return this
  }

  static circleDefaultOptions = { x: 0, y: 0, radius: .5, segments: 96 }
  circle(options?: BasicOptions & Partial<typeof LineHelper.circleDefaultOptions & { x: number, y: number, radius: number }>): this
  circle(center: Vector2Declaration, radius: number, options?: BasicOptions & Partial<typeof LineHelper.circleDefaultOptions>): this
  circle(...args: any[]): this {
    const solveArgs = () => {
      if (args.length > 1) {
        const [center, radius, options] = args
        const { x, y } = fromVector2Declaration(center, _vector2)
        return { x, y, radius, ...options }
      }
      return args[0]
    }
    const { x, y, radius, segments, ...optionsRest } = { ...LineHelper.circleDefaultOptions, ...solveArgs() }
    const vx = new Vector3(1, 0, 0)
    const vy = new Vector3(0, 1, 0)
    const points = [] as Vector3[]
    for (let i = 0; i < segments; i++) {
      const a0 = i / segments * Math.PI * 2
      const a1 = (i + 1) / segments * Math.PI * 2
      const x0 = Math.cos(a0) * radius
      const y0 = Math.sin(a0) * radius
      const x1 = Math.cos(a1) * radius
      const y1 = Math.sin(a1) * radius
      const v0 = new Vector3(x, y, 0)
        .addScaledVector(vx, x0)
        .addScaledVector(vy, y0)
      const v1 = new Vector3(x, y, 0)
        .addScaledVector(vx, x1)
        .addScaledVector(vy, y1)
      points.push(v0, v1)
    }
    transformAndPush(this.points, points, optionsRest)
    return this
  }

  rectangle(rect?: RectangleDeclaration, options?: BasicOptions): this {
    const { centerX: x, centerY: y, width, height } = Rectangle.from(rect)
    const w2 = width / 2
    const h2 = height / 2
    const a = new Vector3(x - w2, y - h2, 0)
    const b = new Vector3(x + w2, y - h2, 0)
    const c = new Vector3(x + w2, y + h2, 0)
    const d = new Vector3(x - w2, y + h2, 0)
    transformAndPush(this.points, [a, b, b, c, c, d, d, a], options)
    return this
  }

  /**
   * NOTE: "Transform option" is not implemented here.
   */
  box({
    center = <Vector3Declaration>[0, 0, 0],
    size = <Vector3Declaration>1,
  } = {}): this {
    const { x, y, z } = fromVector3Declaration(center, _vector3)
    const { x: sx, y: sy, z: sz } = fromVector3Declaration(size, _vector3)
    const halfX = sx / 2
    const halfY = sy / 2
    const halfZ = sz / 2
    const a = new Vector3(x - halfX, y - halfY, z - halfZ)
    const b = new Vector3(x + halfX, y - halfY, z - halfZ)
    const c = new Vector3(x + halfX, y + halfY, z - halfZ)
    const d = new Vector3(x - halfX, y + halfY, z - halfZ)
    const e = new Vector3(x - halfX, y - halfY, z + halfZ)
    const f = new Vector3(x + halfX, y - halfY, z + halfZ)
    const g = new Vector3(x + halfX, y + halfY, z + halfZ)
    const h = new Vector3(x - halfX, y + halfY, z + halfZ)
    this.points.push(a, b, b, c, c, d, d, a)
    this.points.push(e, f, f, g, g, h, h, e)
    this.points.push(a, e, b, f, c, g, d, h)
    return this
  }

  plus(center: Vector2Declaration, size: number, options?: BasicOptions): this {
    const half = size / 2
    const { x, y } = fromVector2Declaration(center, _vector2)
    const a = new Vector3(x - half, y, 0)
    const b = new Vector3(x + half, y, 0)
    const c = new Vector3(x, y - half, 0)
    const d = new Vector3(x, y + half, 0)
    transformAndPush(this.points, [a, b, c, d], options)
    return this
  }

  cross(center: Vector2Declaration, size: number, options?: BasicOptions): this {
    const half = size / 2
    const { x, y } = fromVector2Declaration(center, _vector2)
    const a = new Vector3(x - half, y - half, 0)
    const b = new Vector3(x + half, y + half, 0)
    const c = new Vector3(x - half, y + half, 0)
    const d = new Vector3(x + half, y - half, 0)
    transformAndPush(this.points, [a, b, c, d], options)
    return this
  }
}
