import { BufferAttribute, BufferGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { createExtrusionGeometry } from './extrusion'

const defaultOptions = {
  width: 1,
  height: 1,
  depth: .1,
  borderWidth: .1,
  borderAlign: <number | 'inside' | 'outside'>.5,
  cornerRadius: 0,
  cornerSegments: 8,
}

function setupSimpleFrameGeometry(geometry: BufferGeometry, options: typeof defaultOptions) {
  const { width: w, height: h, borderWidth: bw, borderAlign } = options
  const ba = borderAlign === 'inside' ? 0 : borderAlign === 'outside' ? 1 : borderAlign
  const w2 = w / 2
  const h2 = h / 2
  const bw_in = bw * (1 - ba)
  const bw_out = bw * ba

  const minX = -w2 - bw_out
  const minY = -h2 - bw_out
  const maxX = w2 + bw_out
  const maxY = h2 + bw_out

  const frontPosition = new Float32Array([
    // Inner rectangle
    -w2 + bw_in, -h2 + bw_in, 0,
    w2 - bw_in, -h2 + bw_in, 0,
    w2 - bw_in, h2 - bw_in, 0,
    -w2 + bw_in, h2 - bw_in, 0,

    // Outer rectangle
    minX, minY, 0,
    maxX, minY, 0,
    maxX, maxY, 0,
    minX, maxY, 0,
  ])

  const frontNormal = new Float32Array([
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
  ])

  geometry.setAttribute('position', new BufferAttribute(frontPosition, 3))

  const uv = new Float32Array(frontPosition.length / 3 * 2)
  geometry.setAttribute('uv', new BufferAttribute(uv, 2))
  for (let i = 0; i < frontPosition.length / 3; i++) {
    uv[i * 2 + 0] = (frontPosition[i * 3 + 0] - minX) / (maxX - minX)
    uv[i * 2 + 1] = (frontPosition[i * 3 + 1] - minY) / (maxY - minY)
  }

  const index = new Uint16Array([
    0, 4, 1, 1, 4, 5,
    1, 5, 2, 2, 5, 6,
    2, 6, 3, 3, 6, 7,
    3, 7, 0, 0, 7, 4,
  ])
  geometry.setIndex(new BufferAttribute(index, 1))

  geometry.computeVertexNormals()

  if (options.depth > 0) {
    const extrusionGeometry = createExtrusionGeometry(geometry, {
      amount: options.depth,
      direction: [0, 0, -1],
    })
    geometry.copy(mergeGeometries([geometry, extrusionGeometry]))
  }
}

/**
 * FrameGeometry is a geometry that represents a rectangular frame with a border.
 */
export class FrameGeometry extends BufferGeometry {
  options: typeof defaultOptions

  constructor(options: Partial<typeof defaultOptions> = {}) {
    super()
    this.options = { ...defaultOptions, ...options }
    if (this.options.cornerRadius === 0) {
      setupSimpleFrameGeometry(this, this.options)
    } else {
      throw new Error('Corner radius not implemented')
    }
  }
}
