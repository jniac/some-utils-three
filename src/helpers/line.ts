import { LineSegments, Vector2 } from 'three'

import { Rectangle, RectangleDeclaration } from 'some-utils-ts/math/geom/rectangle'

export class LineHelper extends LineSegments {
  points: Vector2[] = []

  clear(): this {
    this.points.length = 0
    this.geometry.setFromPoints(this.points)
    return this
  }

  rectangle(rect: RectangleDeclaration): this {
    const { x, y, width, height } = Rectangle.from(rect)
    const w2 = width / 2
    const h2 = height / 2
    const a = new Vector2(x - w2, y - h2)
    const b = new Vector2(x + w2, y - h2)
    const c = new Vector2(x + w2, y + h2)
    const d = new Vector2(x - w2, y + h2)
    this.points.push(a, b, b, c, c, d, d, a)
    this.geometry.setFromPoints(this.points)
    return this
  }
}
