import { Box3, BufferAttribute, BufferGeometry, Color, ColorRepresentation, GreaterDepth, LineBasicMaterial, LineSegments, Matrix4, Vector2, Vector3 } from 'three/webgpu'

import { Rectangle, RectangleDeclaration } from 'some-utils-ts/math/geom/rectangle'

import { fromTransformDeclaration, fromVector2Declaration, fromVector3Declaration, TransformDeclaration, Vector2Declaration, Vector3Declaration } from '../declaration'

const _vector2 = new Vector2()
const _vector3 = new Vector3()
const _m = new Matrix4()

type BasicOptions = Partial<{
  transform: TransformDeclaration
  color: ColorRepresentation
}>

function transformAndPush(lineHelper: LineHelper, newPoints: Vector3[], options?: BasicOptions): void {
  if (options?.transform) {
    fromTransformDeclaration(options.transform, _m)
    for (const point of newPoints) {
      point.applyMatrix4(_m)
    }
  }
  if (options?.color) {
    lineHelper.colors.set(lineHelper.points.length, new Color(options.color))
  }
  lineHelper.points.push(...newPoints)
}

function ensureColorAttribute(geometry: BufferGeometry): BufferAttribute {
  const colors = geometry.attributes.color
  if (colors) {
    return colors as BufferAttribute
  } else {
    const newColors = new BufferAttribute(new Float32Array(geometry.attributes.position.count * 3), 3)
    geometry.setAttribute('color', newColors)
    return newColors
  }
}


export class LineHelper extends LineSegments<BufferGeometry, LineBasicMaterial> {
  points: Vector3[] = []
  colors = new Map<number, Color>()

  get opacity() { return this.material.opacity }
  set opacity(value) { this.setOpacity(value) }

  /**
   * Set the "opacity" property of the material and automatically set the material
   * as "transparent" if the value is less that one.
   */
  setOpacity(value: number) {
    this.material.opacity = value
    this.material.transparent = value < 1
  }

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
    this.colors.clear()
    this.geometry.setFromPoints([new Vector3(), new Vector3()]) // Geometry needs at least 2 points
    return this
  }

  draw(): this {
    // Geometry, the easy part:
    this.geometry.setFromPoints(this.points)
    this.geometry.computeBoundingSphere()

    // Colors, the less easy part:
    this.material.vertexColors = this.colors.size > 0
    this.material.needsUpdate = true
    if (this.colors.size > 0) {
      const currentColor = new Color(this.colors.get(0) ?? 'white')
      const max = this.points.length
      const colorAttribute = ensureColorAttribute(this.geometry)
      for (let i = 0; i < max; i++) {
        const color = this.colors.get(i)
        if (color) {
          currentColor.copy(color)
        }
        colorAttribute.setXYZ(i, currentColor.r, currentColor.g, currentColor.b)
      }
    }

    return this
  }

  line(a: Vector3Declaration, b: Vector3Declaration, options?: BasicOptions): this {
    const va = fromVector3Declaration(a)
    const vb = fromVector3Declaration(b)
    transformAndPush(this, [va, vb], options)
    return this
  }

  polygon(points: Vector3Declaration[], options?: BasicOptions): this {
    const newPoints = points.map(v => fromVector3Declaration(v))
    const pairs = [] as Vector3[]
    for (let i = 0; i < newPoints.length; i++)
      pairs.push(newPoints[i], newPoints[(i + 1) % newPoints.length])
    transformAndPush(this, pairs, options)
    return this
  }

  polyline(points: Vector3Declaration[], options?: BasicOptions): this {
    const newPoints = points.map(v => fromVector3Declaration(v))
    const pairs = [] as Vector3[]
    for (let i = 0; i < newPoints.length - 1; i++)
      pairs.push(newPoints[i], newPoints[i + 1])
    transformAndPush(this, pairs, options)
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
    transformAndPush(this, points, optionsRest)
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
    transformAndPush(this, [a, b, b, c, c, d, d, a], options)
    return this
  }

  /**
   * NOTE: "Transform option" is not implemented here.
   */
  box(options: BasicOptions & Partial<{
    center: Vector3Declaration,
    size: Vector3Declaration,
    box3: Box3,
    /**
     * If true, the box will be drawn as an integer box (inclusive of the max values).
     */
    asIntBox3: boolean,
  }> = {}): this {
    let x = 0, y = 0, z = 0
    let sx = 1, sy = 1, sz = 1
    const { center, size, box3 } = options
    if (center !== undefined) {
      ({ x, y, z } = fromVector3Declaration(center, _vector3))
    }
    if (size !== undefined) {
      ({ x: sx, y: sy, z: sz } = fromVector3Declaration(size, _vector3))
    }
    if (box3 !== undefined) {
      const { min, max } = box3
      const { x: minx, y: miny, z: minz } = min
      let { x: maxx, y: maxy, z: maxz } = max
      if (options.asIntBox3) {
        maxx += 1
        maxy += 1
        maxz += 1
      }
      x = (minx + maxx) / 2
      y = (miny + maxy) / 2
      z = (minz + maxz) / 2
      sx = maxx - minx
      sy = maxy - miny
      sz = maxz - minz
    }
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
    transformAndPush(this, [a, b, c, d], options)
    return this
  }

  cross(center: Vector2Declaration, size: number, options?: BasicOptions): this {
    const half = size / 2
    const { x, y } = fromVector2Declaration(center, _vector2)
    const a = new Vector3(x - half, y - half, 0)
    const b = new Vector3(x + half, y + half, 0)
    const c = new Vector3(x - half, y + half, 0)
    const d = new Vector3(x + half, y - half, 0)
    transformAndPush(this, [a, b, c, d], options)
    return this
  }
}
