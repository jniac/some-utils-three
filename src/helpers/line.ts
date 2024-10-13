import { BufferGeometry, LineBasicMaterial, LineSegments, Vector2, Vector3 } from 'three'

import { Rectangle, RectangleDeclaration } from 'some-utils-ts/math/geom/rectangle'

import { fromVector2Declaration, Vector2Declaration } from '../declaration'

const _vector2 = new Vector2()

export class LineHelper extends LineSegments<BufferGeometry, LineBasicMaterial> {
  points: Vector3[] = []

  clear(): this {
    this.points.length = 0
    this.geometry.setFromPoints(this.points)
    return this
  }

  draw(): this {
    this.geometry.setFromPoints(this.points)
    return this
  }

  rectangle(rect: RectangleDeclaration): this {
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
