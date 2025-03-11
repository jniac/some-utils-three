import { BufferAttribute, BufferGeometry, Color, ColorRepresentation, Group, Points, PointsMaterial, Vector3 } from 'three'
import { fromVector3Declaration, Vector3Declaration } from './declaration'
import { ShaderForge } from './shader-forge'

const _v0 = new Vector3()
const _c0 = new Color()

const pointsShapes = (() => {
  let i = 0
  return {
    'square': i++,
    'circle': i++,
    'ring': i++,
    'ring-thin': i++,
    'plus': i++,
    'plus-thin': i++,
    'plus-ultra-thin': i++,
    'cross': i++,
  }
})()

class PointsManager {
  static createParts(count: number) {
    const geometry = new BufferGeometry()
    const attributes = {
      'position': new BufferAttribute(new Float32Array(count * 3), 3),
      'color': new BufferAttribute(new Float32Array(count * 3), 3),
      'aScale': new BufferAttribute(new Float32Array(count), 1),
      'aShape': new BufferAttribute(new Float32Array(count), 1),
    }
    for (const [name, attr] of Object.entries(attributes)) {
      geometry.setAttribute(name, attr)
    }
    const material = new PointsMaterial({ vertexColors: true })
    material.onBeforeCompile = shader => ShaderForge.with(shader)
      .varying({
        vShape: 'float',
      })
      .vertex.top(/* glsl */`
        attribute float aScale;
        attribute float aShape;
      `)
      .vertex.mainAfterAll(/* glsl */`
        gl_PointSize *= aScale;
        vShape = aShape;
      `)
      .fragment.top(/* glsl */`
        float sdBox(in vec2 p, in vec2 b) {
          vec2 d = abs(p) - b;
          return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
        }
      `)
      .fragment.after('color_fragment', /* glsl */`
        if (vShape == ${pointsShapes['circle']}.0) {
          float d = distance(gl_PointCoord * 2.0, vec2(1.0));
          if (d > 1.0) discard;
        }

        if (vShape == ${pointsShapes['ring']}.0) {
          float d = distance(gl_PointCoord * 2.0, vec2(1.0));
          if (d < 0.8 || d > 1.0) discard;
        }

        if (vShape == ${pointsShapes['ring-thin']}.0) {
          float d = distance(gl_PointCoord * 2.0, vec2(1.0));
          if (d < 0.9 || d > 1.0) discard;
        }

        else if (vShape == ${pointsShapes['plus']}.0) {
          float d0 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(1.0, 0.2));
          float d1 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(0.2, 1.0));
          if (d0 > 0.0 && d1 > 0.0) discard;
        }

        else if (vShape == ${pointsShapes['plus-thin']}.0) {
          float d0 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(1.0, 0.1));
          float d1 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(0.1, 1.0));
          if (d0 > 0.0 && d1 > 0.0) discard;
        }

        else if (vShape == ${pointsShapes['plus-ultra-thin']}.0) {
          float d0 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(1.0, 0.033));
          float d1 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(0.033, 1.0));
          if (d0 > 0.0 && d1 > 0.0) discard;
        }
        // diffuseColor.rgb *= vec3(gl_PointCoord, 1.0);
      `)
    const points = new Points(geometry, material)
    // points.geometry.setDrawRange(0, 0)
    return {
      count,
      geometry,
      attributes,
      points,
    }
  }

  state = { index: 0 }

  parts: ReturnType<typeof PointsManager.createParts>

  constructor(count = 1000) {
    this.parts = PointsManager.createParts(count)
  }

  clear() {
    this.state.index = 0
    this.parts.geometry.setDrawRange(0, 0)
  }

  points(p: Vector3Declaration[], {
    size: argSize = .1,
    scale: argScale = 1,
    color: argColor = 'white' as ColorRepresentation,
    shape: argShape = 'square' as keyof typeof pointsShapes,
  } = {}): this {
    const count = p.length
    const { index: i0 } = this.state
    const { position, color, aScale, aShape } = this.parts.attributes
    const { r, g, b } = _c0.set(argColor)
    const size = argScale * argSize
    const shape = pointsShapes[argShape]
    for (let i1 = 0; i1 < count; i1++) {
      const { x, y, z } = fromVector3Declaration(p[i1], _v0)
      const i = i0 + i1
      position.setXYZ(i, x, y, z)
      color.setXYZ(i, r, g, b)
      aScale.setX(i, size)
      aShape.setX(i, shape)
    }

    this.state.index = i0 + count
    this.parts.geometry.setDrawRange(0, this.state.index)

    for (const attr of Object.values(this.parts.attributes)) {
      attr.needsUpdate = true
    }

    if (this.state.index > this.parts.count) {
      throw new Error('Not implemented!')
    }

    return this
  }

  point(p: Vector3Declaration, options?: Parameters<DebugDraw['points']>[1]) {
    return this.points([p], options)
  }
}

class DebugDraw {
  group = new Group()

  parts = (() => {
    const pointsManager = new PointsManager()
    this.group.add(pointsManager.parts.points)
    return {
      pointsManager,
    }
  })()

  points(...args: Parameters<PointsManager['points']>): this {
    this.parts.pointsManager.points(...args)
    return this
  }

  point(...args: Parameters<PointsManager['point']>): this {
    this.parts.pointsManager.point(...args)
    return this
  }

  clear(): this {
    this.onTop(false)
    this.parts.pointsManager.clear()
    return this
  }

  onTop(value = true): this {
    if (value) {
      this.group.renderOrder = 999
      this.parts.pointsManager.parts.points.material.depthTest = false
      this.parts.pointsManager.parts.points.material.depthWrite = false
      this.parts.pointsManager.parts.points.material.transparent = true
    } else {
      this.group.renderOrder = 0
      this.parts.pointsManager.parts.points.material.depthTest = true
      this.parts.pointsManager.parts.points.material.depthWrite = true
      this.parts.pointsManager.parts.points.material.transparent = false
    }
    return this
  }
}

const instance = new DebugDraw()

export { instance as DebugDraw }
