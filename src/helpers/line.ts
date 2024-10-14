import { BufferGeometry, GreaterDepth, LineBasicMaterial, LineSegments, Vector2, Vector3 } from 'three'

import { Rectangle, RectangleDeclaration } from 'some-utils-ts/math/geom/rectangle'

import { fromVector2Declaration, fromVector3Declaration, Vector2Declaration, Vector3Declaration } from '../declaration'

const _vector2 = new Vector2()
const _vector3 = new Vector3()

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
