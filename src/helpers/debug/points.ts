import { BufferAttribute, BufferGeometry, ColorRepresentation, Points, PointsMaterial } from 'three'

import { Vector3Declaration } from 'some-utils-ts/declaration'

import { fromTransformDeclarations, fromVector3Declaration, TransformDeclaration } from '../../declaration'
import { ShaderForge } from '../../shader-forge'
import { BaseManager } from './base'
import { _c0, _v0, Utils } from './shared'

export class PointsManager extends BaseManager {
  static shapes = (() => {
    let i = 0
    return {
      'square': i++,
      'circle': i++,
      'ring': i++,
      'ring-thin': i++,
      'plus': i++,
      'plus-thin': i++,
      'plus-ultra-thin': i++,
      'x': i++,
      'x-thin': i++,
      'x-ultra-thin': i++,
    }
  })();

  static createParts({
    pointCount: count = 10000,
  } = {}) {
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
      .vertex.top(/* glsl */ `
        attribute float aScale;
        attribute float aShape;
      `)
      .vertex.mainAfterAll(/* glsl */ `
        gl_PointSize *= aScale;
        vShape = aShape;
      `)
      .fragment.top(/* glsl */ `
        float sdBox(in vec2 p, in vec2 b) {
          vec2 d = abs(p) - b;
          return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
        }
      `)
      .fragment.after('color_fragment', /* glsl */ `
        float regular = .2;
        float thin = .1;
        float ultraThin = .033;

        if (vShape == ${PointsManager.shapes['circle']}.0) {
          float d = distance(gl_PointCoord * 2.0, vec2(1.0));
          if (d > 1.0) discard;
        }

        if (vShape == ${PointsManager.shapes['ring']}.0) {
          float d = distance(gl_PointCoord * 2.0, vec2(1.0));
          if (d < 0.8 || d > 1.0) discard;
        }

        if (vShape == ${PointsManager.shapes['ring-thin']}.0) {
          float d = distance(gl_PointCoord * 2.0, vec2(1.0));
          if (d < 0.9 || d > 1.0) discard;
        }

        else if (vShape == ${PointsManager.shapes['plus']}.0) {
          float d0 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(1.0, regular));
          float d1 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(regular, 1.0));
          if (d0 > 0.0 && d1 > 0.0) discard;
        }

        else if (vShape == ${PointsManager.shapes['plus-thin']}.0) {
          float d0 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(1.0, thin));
          float d1 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(thin, 1.0));
          if (d0 > 0.0 && d1 > 0.0) discard;
        }

        else if (vShape == ${PointsManager.shapes['plus-ultra-thin']}.0) {
          float d0 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(1.0, ultraThin));
          float d1 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(ultraThin, 1.0));
          if (d0 > 0.0 && d1 > 0.0) discard;
        }

        else if (vShape == ${PointsManager.shapes['x']}.0) {
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          float c = 0.70710678;
          p = mat2(c, -c, c, c) * p;
          float d0 = sdBox(p, vec2(1.0, regular));
          float d1 = sdBox(p, vec2(regular, 1.0));
          if (d0 > 0.0 && d1 > 0.0) discard;
        }

        else if (vShape == ${PointsManager.shapes['x-thin']}.0) {
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          float c = 0.70710678;
          p = mat2(c, -c, c, c) * p;
          float d0 = sdBox(p, vec2(1.0, thin));
          float d1 = sdBox(p, vec2(thin, 1.0));
          if (d0 > 0.0 && d1 > 0.0) discard;
        }

        else if (vShape == ${PointsManager.shapes['x-ultra-thin']}.0) {
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          float c = 0.70710678;
          p = mat2(c, -c, c, c) * p;
          float d0 = sdBox(p, vec2(1.0, ultraThin));
          float d1 = sdBox(p, vec2(ultraThin, 1.0));
          if (d0 > 0.0 && d1 > 0.0) discard;
        }

        // diffuseColor.rgb *= vec3(gl_PointCoord, 1.0);
      `)
    const points = new Points(geometry, material)
    points.frustumCulled = false
    // points.geometry.setDrawRange(0, 0)
    return {
      count,
      geometry,
      attributes,
      points,
    }
  }

  state = { index: 0 };

  parts: ReturnType<typeof PointsManager.createParts>

  constructor(options?: Parameters<typeof PointsManager.createParts>[0]) {
    super()
    this.parts = PointsManager.createParts(options)
  }

  override applyTransform(...transforms: TransformDeclaration[]) {
    this.parts.geometry.applyMatrix4(fromTransformDeclarations(transforms))
  }

  clear(): this {
    super.clear()
    this.state.index = 0
    this.parts.geometry.setDrawRange(0, 0)
    return this
  }

  onTop(renderOrder = 1000) {
    const { points } = this.parts
    if (renderOrder !== 0) {
      points.renderOrder = renderOrder
      points.material.depthTest = false
      points.material.depthWrite = false
      points.material.transparent = true
    } else {
      points.renderOrder = 0
      points.material.depthTest = true
      points.material.depthWrite = true
      points.material.transparent = false
    }
    return this
  }

  points(pointsArg: Vector3Declaration[] | Float32Array, {
    key = undefined as any,
    size: argSize = .1,
    scale: argScale = 1,
    color: argColor = 'white' as ColorRepresentation,
    shape: argShape = 'square' as keyof typeof PointsManager.shapes,
  } = {}): this {
    const { transformMatrix } = this
    const isBuffer = pointsArg instanceof Float32Array

    const useKey = key !== undefined
    const count =
      isBuffer ? pointsArg.length / 3 : pointsArg.length

    const { index: i0 } = useKey
      ? this.ensureKeyEntry(key, this.state.index, count)
      : this.state

    const { position, color, aScale, aShape } = this.parts.attributes
    const { r, g, b } = _c0.set(argColor)
    const size = argScale * argSize
    const shape = PointsManager.shapes[argShape]
    for (let i1 = 0; i1 < count; i1++) {
      const { x, y, z } = isBuffer
        ? _v0.fromArray(pointsArg, i1 * 3).applyMatrix4(transformMatrix)
        : fromVector3Declaration(pointsArg[i1], _v0).applyMatrix4(transformMatrix)
      const i = i0 + i1
      position.setXYZ(i, x, y, z)
      color.setXYZ(i, r, g, b)
      aScale.setX(i, size)
      aShape.setX(i, shape)
    }

    this.state.index = useKey
      ? Math.max(this.state.index, i0 + count) // ensure the index is always increasing
      : i0 + count
    this.parts.geometry.setDrawRange(0, this.state.index)

    for (const attr of Object.values(this.parts.attributes)) {
      attr.needsUpdate = true
    }

    if (this.state.index > this.parts.count) {
      throw new Error('Overflow Handling Not implemented')
    }

    return this
  }

  box(value: Parameters<typeof Utils.box>[0], options?: Parameters<PointsManager['points']>[1]) {
    const { boxPoints } = Utils.box(value)
    return this.points(boxPoints, options)
  }

  point(p: Vector3Declaration, options?: Parameters<PointsManager['points']>[1]) {
    return this.points([p], options)
  }
}
