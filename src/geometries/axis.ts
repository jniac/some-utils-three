import { BufferAttribute, BufferGeometry, CircleGeometry, Color, ColorRepresentation, ConeGeometry, CylinderGeometry, SphereGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const defaultAxisOptions = {
  /** 
   * The axis of the axis. Determines its orientations.
   * @default 'x'.
   */
  axis: <'x' | 'y' | 'z'>'x',
  /**
   * The length of the axis.
   * @default 1.
   */
  length: 1,
  /**
   * The number of the radial segments.
   * @default 12.
   */
  radialSegments: 12,
  /**
   * The radius of the axis.
   * @default 0.01
   */
  radius: .01,
  /**
   * The ratio of the cone to the length of the axis.
   * @default 0.1
   */
  coneRatio: .1,
  /**
   * The scale of the radius.
   * @default 1
   */
  radiusScale: 1,
  /**
   * Whether to use vertex colors.
   * @default true
   */
  vertexColor: true,
  /**
   * The base cap of the axis.
   * @default 'flat'
   */
  baseCap: <'none' | 'flat' | 'sphere'>'flat',
  /**
   * The color of the axis.
   * @default 'white'
   */
  color: <ColorRepresentation>'white',
  /**
   * The alignment of the axis.
   * @default 0
   */
  align: 0,
}

const _color = new Color()

function createAxisGeometry(options?: Partial<typeof defaultAxisOptions>) {
  const {
    axis,
    length,
    radius,
    radialSegments,
    coneRatio,
    radiusScale,
    vertexColor,
    baseCap,
    color,
    align,
  } = { ...defaultAxisOptions, ...options }

  const r = radius * radiusScale

  const coneHeight = length * coneRatio
  const cone = new ConeGeometry(r * 3, coneHeight, radialSegments)
  const cyl = new CylinderGeometry(r, r, 1, radialSegments, 1, true)

  const cylLength = length - coneHeight
  const coneDistance = length - coneHeight * .5
  const cylDistance = cylLength * .5

  cone
    .rotateZ(-Math.PI / 2)
    .translate(coneDistance, 0, 0)

  cyl
    .scale(1, cylLength, 1)
    .rotateZ(-Math.PI / 2)
    .translate(cylDistance, 0, 0)

  const cap = baseCap === 'none'
    ? new BufferGeometry()
    : baseCap === 'flat'
      ? new CircleGeometry(r, radialSegments).rotateY(-Math.PI / 2)
      : new SphereGeometry(r, radialSegments, 3, 0, Math.PI * 2, 0, Math.PI * .5).rotateZ(Math.PI / 2).rotateX(Math.PI / 2)

  const geometry = mergeGeometries([cone, cyl, cap])

  if (align !== 0) {
    geometry.translate(-length * align, 0, 0)
  }

  switch (axis) {
    case 'y':
      geometry.rotateZ(Math.PI / 2)
      break
    case 'z':
      geometry.rotateY(-Math.PI / 2)
      break
  }

  if (vertexColor) {
    const count = geometry.attributes.position.count
    const colorAttribute = new BufferAttribute(new Float32Array(count * 3), 3)
    geometry.setAttribute('color', colorAttribute)
    _color.set(color)
    for (let i = 0; i < count; i++) {
      colorAttribute.setXYZ(i, _color.r, _color.g, _color.b)
    }
  }

  return geometry
}

export class AxisGeometry extends BufferGeometry {
  constructor(options?: Partial<typeof defaultAxisOptions>) {
    super()
    const geometry = createAxisGeometry(options)
    this.copy(geometry)
    geometry.dispose()
  }
}

const defaultAxesOptions = {
  xColor: '#ff3333',
  yColor: '#33cc66',
  zColor: '#3366ff',
}

type AxesOptions = typeof defaultAxesOptions & Omit<typeof defaultAxisOptions, 'color'>

export class AxesGeometry extends BufferGeometry {
  static get defaultOptions() { return { ...defaultAxesOptions } }

  constructor(options?: Partial<AxesOptions>) {
    super()

    const {
      xColor,
      yColor,
      zColor,
      ...axisOptions
    } = { ...defaultAxesOptions, ...options }

    const x = createAxisGeometry({ ...axisOptions, axis: 'x', color: xColor })
    const y = createAxisGeometry({ ...axisOptions, axis: 'y', color: yColor })
    const z = createAxisGeometry({ ...axisOptions, axis: 'z', color: zColor })

    const geometry = mergeGeometries([x, y, z])

    this.copy(geometry)
    geometry.dispose()
  }
}