import { BufferAttribute, BufferGeometry, LineBasicMaterial, LineSegments, Vector3, WebGLProgramParametersWithUniforms } from 'three'

import { ShaderForge } from 'some-utils-three/shader-forge'
import { getMinusX, getMinusY, getMinusZ, getPlusX, getPlusY, getPlusZ } from './xyz'

export class BoxLineHelper extends LineSegments<BufferGeometry, LineBasicMaterial> {
  constructor(options?: {
    divisions?: number,
    interiorOpacity?: number,
    onBeforeCompile?: (shader: WebGLProgramParametersWithUniforms) => void,
    letters?: boolean,
  }) {
    const {
      divisions = 10,
      interiorOpacity = 0.2,
      letters = false,
    } = options ?? {}
    const getLerpPoints = (p0: Vector3, p1: Vector3, count: number) => {
      return Array.from({ length: count }, (_, i) => [
        new Vector3().lerpVectors(p0, p1, i / count),
        new Vector3().lerpVectors(p0, p1, (i + 1) / count),
      ]).flat()
    }
    const edges = [
      // x edges
      ...getLerpPoints(new Vector3(-1, -1, -1), new Vector3(+1, -1, -1), divisions),
      ...getLerpPoints(new Vector3(-1, +1, -1), new Vector3(+1, +1, -1), divisions),
      ...getLerpPoints(new Vector3(-1, +1, +1), new Vector3(+1, +1, +1), divisions),
      ...getLerpPoints(new Vector3(-1, -1, +1), new Vector3(+1, -1, +1), divisions),

      // y edges
      ...getLerpPoints(new Vector3(-1, -1, -1), new Vector3(-1, +1, -1), divisions),
      ...getLerpPoints(new Vector3(+1, -1, -1), new Vector3(+1, +1, -1), divisions),
      ...getLerpPoints(new Vector3(+1, -1, +1), new Vector3(+1, +1, +1), divisions),
      ...getLerpPoints(new Vector3(-1, -1, +1), new Vector3(-1, +1, +1), divisions),

      // z edges
      ...getLerpPoints(new Vector3(-1, -1, -1), new Vector3(-1, -1, +1), divisions),
      ...getLerpPoints(new Vector3(+1, -1, -1), new Vector3(+1, -1, +1), divisions),
      ...getLerpPoints(new Vector3(+1, +1, -1), new Vector3(+1, +1, +1), divisions),
      ...getLerpPoints(new Vector3(-1, +1, -1), new Vector3(-1, +1, +1), divisions),
    ]
    const lettersPoints = !letters ? [] : [
      ...getPlusX(.1, { x: 1.1 }),
      ...getPlusY(.1, { y: 1.1 }),
      ...getPlusZ(.1, { z: 1.1 }),
      ...getMinusX(.1, { x: -1.1 }),
      ...getMinusY(.1, { y: -1.1 }),
      ...getMinusZ(.1, { z: -1.1 }),
    ]
    const interiorEdges = [
      // x interior edges
      ...getLerpPoints(new Vector3(-1, -1, 0), new Vector3(+1, -1, 0), divisions),
      ...getLerpPoints(new Vector3(-1, +1, 0), new Vector3(+1, +1, 0), divisions),
      ...getLerpPoints(new Vector3(-1, 0, -1), new Vector3(+1, 0, -1), divisions),
      ...getLerpPoints(new Vector3(-1, 0, +1), new Vector3(+1, 0, +1), divisions),

      // y interior edges
      ...getLerpPoints(new Vector3(0, -1, -1), new Vector3(0, +1, -1), divisions),
      ...getLerpPoints(new Vector3(0, -1, +1), new Vector3(0, +1, +1), divisions),
      ...getLerpPoints(new Vector3(-1, -1, 0), new Vector3(-1, +1, 0), divisions),
      ...getLerpPoints(new Vector3(+1, -1, 0), new Vector3(+1, +1, 0), divisions),

      // z interior edges
      ...getLerpPoints(new Vector3(-1, 0, -1), new Vector3(-1, 0, +1), divisions),
      ...getLerpPoints(new Vector3(+1, 0, -1), new Vector3(+1, 0, +1), divisions),
      ...getLerpPoints(new Vector3(0, -1, -1), new Vector3(0, -1, +1), divisions),
      ...getLerpPoints(new Vector3(0, +1, -1), new Vector3(0, +1, +1), divisions),
    ]
    const boxGeometry = new BufferGeometry().setFromPoints([
      ...edges,
      ...lettersPoints,
      ...interiorEdges,
    ])
    const opacityAttribute = new BufferAttribute(new Float32Array(boxGeometry.getAttribute('position').count), 1)
    const half = edges.length + lettersPoints.length
    opacityAttribute.array.fill(1, 0, half)
    opacityAttribute.array.fill(interiorOpacity, half)
    boxGeometry.setAttribute('aOpacity', opacityAttribute)

    const boxMaterial = new LineBasicMaterial({ color: '#ff0', transparent: true })
    boxMaterial.onBeforeCompile = shader => {
      ShaderForge.with(shader)
        .varying({ vOpacity: 'float' })
        .vertex.top(/* glsl */`
          attribute float aOpacity;
        `)
        .vertex.mainAfterAll(/* glsl */`
          vOpacity = aOpacity;
        `)
        .fragment.after('map_fragment', /* glsl */`
          diffuseColor.a *= vOpacity;
        `)
      options?.onBeforeCompile?.(shader)
    }

    super(boxGeometry, boxMaterial)
  }
}
