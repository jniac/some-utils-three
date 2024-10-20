import { BufferGeometry, GreaterDepth, LineBasicMaterial, LineSegments, Matrix4, Vector2, Vector3 } from 'three'

import { Rectangle, RectangleDeclaration } from 'some-utils-ts/math/geom/rectangle'

import { fromTransformDeclaration, fromVector2Declaration, fromVector3Declaration, TransformDeclaration, Vector2Declaration, Vector3Declaration } from '../declaration'

const _vector2 = new Vector2()
const _vector3 = new Vector3()
const _m = new Matrix4()

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
    return this
  }

  static circleDefaultOptions = { radius: .5, segments: 96 }
  circle(options?: Partial<typeof LineHelper.circleDefaultOptions> & TransformDeclaration): this {
    const { radius, segments, ...rest } = { ...LineHelper.circleDefaultOptions, ...options }
    fromTransformDeclaration(rest, _m)
    const vx = new Vector3(1, 0, 0)
    const vy = new Vector3(0, 1, 0)
    for (let i = 0; i < segments; i++) {
      const a0 = i / segments * Math.PI * 2
      const a1 = (i + 1) / segments * Math.PI * 2
      const x0 = Math.cos(a0) * radius
      const y0 = Math.sin(a0) * radius
      const x1 = Math.cos(a1) * radius
      const y1 = Math.sin(a1) * radius
      const v0 = new Vector3()
        .addScaledVector(vx, x0)
        .addScaledVector(vy, y0)
        .applyMatrix4(_m)
      const v1 = new Vector3()
        .addScaledVector(vx, x1)
        .addScaledVector(vy, y1)
        .applyMatrix4(_m)
      this.points.push(v0, v1)
    }
    return this
  }

  rectangle(rect?: RectangleDeclaration & TransformDeclaration): this {
    const { centerX: x, centerY: y, width, height } = Rectangle.from(rect)
    const w2 = width / 2
    const h2 = height / 2
    const a = new Vector3(x - w2, y - h2, 0)
    const b = new Vector3(x + w2, y - h2, 0)
    const c = new Vector3(x + w2, y + h2, 0)
    const d = new Vector3(x - w2, y + h2, 0)
    this.points.push(a, b, b, c, c, d, d, a)
    return this
  }

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

  plus(center: Vector2Declaration, size: number): this {
    const half = size / 2
    const { x, y } = fromVector2Declaration(center, _vector2)
    const a = new Vector3(x - half, y, 0)
    const b = new Vector3(x + half, y, 0)
    const c = new Vector3(x, y - half, 0)
    const d = new Vector3(x, y + half, 0)
    this.points.push(a, b, c, d)
    return this
  }

  cross(center: Vector2Declaration, size: number): this {
    const half = size / 2
    const { x, y } = fromVector2Declaration(center, _vector2)
    const a = new Vector3(x - half, y - half, 0)
    const b = new Vector3(x + half, y + half, 0)
    const c = new Vector3(x - half, y + half, 0)
    const d = new Vector3(x + half, y - half, 0)
    this.points.push(a, b, c, d)
    return this
  }
}
