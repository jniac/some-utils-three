import { BufferAttribute, BufferGeometry, ColorRepresentation, GreaterDepth, Group, LineBasicMaterial, LineSegments, Vector2 } from 'three'

import { ShaderForge } from 'some-utils-three/shader-forge'
import { fromVector2Declaration, Vector2Declaration } from 'some-utils-ts/declaration'

class DashedLineMaterial extends LineBasicMaterial {
  constructor({
    color = <ColorRepresentation>'white',
  } = {}) {
    super({ color })
    this.onBeforeCompile = shader => ShaderForge.with(shader)
      .varying({
        vPosition2: 'vec2',
        vDash: 'vec2',
      })
      .vertex.top(/* glsl */`
        attribute vec2 dash;
      `)
      .vertex.mainAfterAll(/* glsl */`
        vPosition2 = position.xy;
        vDash = dash;
      `)
      .fragment.after('color_fragment', /* glsl */`
        float dashSize = vDash.x;
        float dashRatio = vDash.y;
        float x = mod(vPosition2.x / dashSize + 0.5 * (dashRatio), 1.0);
        float y = mod(vPosition2.y / dashSize + 0.5 * (dashRatio), 1.0);
        if (x > dashRatio || y > dashRatio) {
          discard;
        }
      `)
  }

  override customProgramCacheKey(): string {
    return 'DashedLineMaterial'
  }
}

const defaultLineGridProps = {
  step: <Vector2Declaration>1,
  size: <Vector2Declaration>10,
  color: <ColorRepresentation>'white',
  dashSize: .1,
  dashRatio: .5,
  border: false,
}

export type LineGridProps = typeof defaultLineGridProps

/**
 * A dashed grid, centered on the origin and lying on the XY plane.
 */
export class DashedGrid extends Group {
  props: LineGridProps

  positionArray: Float32Array
  positionAttribute: BufferAttribute
  dashArray: Float32Array
  dashAttribute: BufferAttribute

  line: LineSegments<BufferGeometry, DashedLineMaterial>
  occludedLine: LineSegments<BufferGeometry, DashedLineMaterial>

  userData = {
    helper: true,
    ignoreRaycast: true,
  }

  state = {
    step: new Vector2(),
    size: new Vector2(),
  }

  constructor(userProps?: Partial<LineGridProps>, MAX_LINES = 100 + 100) {
    super()

    const props = { ...defaultLineGridProps, ...userProps }
    this.props = props

    const geometry = new BufferGeometry()

    const positionArray = new Float32Array(MAX_LINES * 2 * 3)
    const positionAttribute = new BufferAttribute(positionArray, 3)
    geometry.setAttribute('position', positionAttribute)

    const dashArray = new Float32Array(MAX_LINES * 2 * 2) // dash-size and dash-ratio for each vertex
    const dashAttribute = new BufferAttribute(dashArray, 2)
    geometry.setAttribute('dash', dashAttribute)

    this.positionArray = positionArray
    this.positionAttribute = positionAttribute

    this.dashArray = dashArray
    this.dashAttribute = dashAttribute

    const material = new DashedLineMaterial({ color: props.color })

    this.line = new LineSegments(geometry, material)
    this.occludedLine = new LineSegments(geometry, material.clone())
    this.occludedLine.material.depthFunc = GreaterDepth
    this.occludedLine.material.transparent = true
    this.occludedLine.material.opacity = .15

    this.add(this.line, this.occludedLine)

    this.update()
  }

  setProps(props: Partial<LineGridProps>): this {
    Object.assign(this.props, props)

    const { color } = props
    if (color !== undefined) {
      this.line.material.color.set(color)
      this.occludedLine.material.color.set(color)
    }

    return this
  }

  update() {
    const { positionArray: parr, dashArray: darr } = this
    const { step, size } = this.state
    fromVector2Declaration(this.props.step, step)
    fromVector2Declaration(this.props.size, size)
    const { border, dashSize, dashRatio } = this.props

    parr.fill(0)

    let pi = 0
    let di = 0

    const ex = Math.floor(size.x / 2 / step.x)
    for (let ix = -ex; ix <= ex; ix++) {
      parr[pi++] = ix * step.x
      parr[pi++] = -size.y / 2
      parr[pi++] = 0

      parr[pi++] = ix * step.x
      parr[pi++] = +size.y / 2
      parr[pi++] = 0

      darr[di++] = dashSize
      darr[di++] = dashRatio

      darr[di++] = dashSize
      darr[di++] = dashRatio
    }

    const ey = Math.floor(size.y / 2 / step.y)
    for (let iy = -ey; iy <= ey; iy++) {
      parr[pi++] = -size.x / 2
      parr[pi++] = iy * step.y
      parr[pi++] = 0

      parr[pi++] = +size.x / 2
      parr[pi++] = iy * step.y
      parr[pi++] = 0

      darr[di++] = dashSize
      darr[di++] = dashRatio

      darr[di++] = dashSize
      darr[di++] = dashRatio
    }

    if (border) {
      parr[pi++] = -size.x / 2
      parr[pi++] = -size.y / 2
      parr[pi++] = 0

      darr[di++] = 1
      darr[di++] = 1

      for (let j = 0; j < 2; j++) {
        parr[pi++] = +size.x / 2
        parr[pi++] = -size.y / 2
        parr[pi++] = 0

        darr[di++] = 1
        darr[di++] = 1
      }

      for (let j = 0; j < 2; j++) {
        parr[pi++] = +size.x / 2
        parr[pi++] = +size.y / 2
        parr[pi++] = 0

        darr[di++] = 1
        darr[di++] = 1
      }

      for (let j = 0; j < 2; j++) {
        parr[pi++] = -size.x / 2
        parr[pi++] = +size.y / 2
        parr[pi++] = 0

        darr[di++] = 1
        darr[di++] = 1
      }

      parr[pi++] = -size.x / 2
      parr[pi++] = -size.y / 2
      parr[pi++] = 0

      darr[di++] = 1
      darr[di++] = 1
    }

    this.positionAttribute.needsUpdate = true
    this.dashAttribute.needsUpdate = true

    this.occludedLine.material.color.copy(this.line.material.color)

    this.line.geometry.setDrawRange(0, pi / 3)
  }
}