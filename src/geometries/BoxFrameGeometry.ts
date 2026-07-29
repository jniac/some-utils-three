import { BufferAttribute, BufferGeometry } from 'three'

/**
 * Like a "frame" geometry, but with a box shape (6 faces) and a border width.
 */
export class BoxFrameGeometry extends BufferGeometry {
  static defaultParameters = {
    width: 1,
    height: 1,
    depth: 1,
    borderWidth: 0.05,
    borderAlign: 0,
  };

  parameters: typeof BoxFrameGeometry.defaultParameters

  constructor(userParameters: Partial<typeof BoxFrameGeometry.defaultParameters> = {}) {
    super()
    this.parameters = { ...BoxFrameGeometry.defaultParameters, ...userParameters }
    const { width, height, depth, borderWidth, borderAlign } = this.parameters
    const w2 = width / 2
    const h2 = height / 2
    const d2 = depth / 2
    const w_o = w2 + borderWidth * borderAlign // width outer
    const h_o = h2 + borderWidth * borderAlign // height outer
    const d_o = d2 + borderWidth * borderAlign // depth outer
    const w_i = w2 - borderWidth * (1 - borderAlign) // width inner
    const h_i = h2 - borderWidth * (1 - borderAlign) // height inner
    const d_i = d2 - borderWidth * (1 - borderAlign) // depth inner
    const vertices = new Float32Array([
      // front face
      -w_o, -h_o, d_o,
      +w_o, -h_o, d_o,
      +w_o, +h_o, d_o,
      -w_o, +h_o, d_o,

      -w_i, -h_i, d_o,
      +w_i, -h_i, d_o,
      +w_i, +h_i, d_o,
      -w_i, +h_i, d_o,

      // back face
      -w_o, -h_o, -d_o,
      +w_o, -h_o, -d_o,
      +w_o, +h_o, -d_o,
      -w_o, +h_o, -d_o,

      -w_i, -h_i, -d_o,
      +w_i, -h_i, -d_o,
      +w_i, +h_i, -d_o,
      -w_i, +h_i, -d_o,

      // top face
      -w_o, h_o, +d_o,
      +w_o, h_o, +d_o,
      +w_o, h_o, -d_o,
      -w_o, h_o, -d_o,

      -w_i, h_o, +d_i,
      +w_i, h_o, +d_i,
      +w_i, h_o, -d_i,
      -w_i, h_o, -d_i,

      // bottom face
      -w_o, -h_o, +d_o,
      +w_o, -h_o, +d_o,
      +w_o, -h_o, -d_o,
      -w_o, -h_o, -d_o,

      -w_i, -h_o, +d_i,
      +w_i, -h_o, +d_i,
      +w_i, -h_o, -d_i,
      -w_i, -h_o, -d_i,

      // right face
      w_o, -h_o, +d_o,
      w_o, +h_o, +d_o,
      w_o, +h_o, -d_o,
      w_o, -h_o, -d_o,

      w_o, -h_i, +d_i,
      w_o, +h_i, +d_i,
      w_o, +h_i, -d_i,
      w_o, -h_i, -d_i,

      // left face
      -w_o, -h_o, +d_o,
      -w_o, +h_o, +d_o,
      -w_o, +h_o, -d_o,
      -w_o, -h_o, -d_o,

      -w_o, -h_i, +d_i,
      -w_o, +h_i, +d_i,
      -w_o, +h_i, -d_i,
      -w_o, -h_i, -d_i,
    ])
    const indices = new Uint16Array([
      // front face
      0, 1, 4,
      1, 5, 4,
      1, 2, 5,
      2, 6, 5,
      2, 3, 6,
      3, 7, 6,
      3, 0, 7,
      0, 4, 7,

      // back face
      8, 12, 9,
      9, 12, 13,
      9, 13, 10,
      10, 13, 14,
      10, 14, 11,
      11, 14, 15,
      11, 15, 8,
      8, 15, 12,

      // top face
      16, 17, 20,
      17, 21, 20,
      17, 18, 21,
      18, 22, 21,
      18, 19, 22,
      19, 23, 22,
      19, 16, 23,
      16, 20, 23,

      // bottom face
      24, 28, 25,
      25, 28, 29,
      25, 29, 26,
      26, 29, 30,
      26, 30, 27,
      27, 30, 31,
      27, 31, 24,
      24, 31, 28,

      // right face
      32, 36, 33,
      33, 36, 37,
      33, 37, 34,
      34, 37, 38,
      34, 38, 35,
      35, 38, 39,
      35, 39, 32,
      32, 39, 36,

      // left face
      40, 41, 44,
      41, 45, 44,
      41, 42, 45,
      42, 46, 45,
      42, 43, 46,
      43, 47, 46,
      43, 40, 47,
      40, 44, 47,
    ])
    this.setAttribute('position', new BufferAttribute(vertices, 3))
    this.setIndex(new BufferAttribute(indices, 1))
    this.computeVertexNormals()
  }
}
