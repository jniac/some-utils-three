import { Vector3Declaration } from 'some-utils-ts/declaration'
import { BufferAttribute, BufferGeometry } from 'three'
import { fromVector3Declaration } from '../declaration'

const defaultOptions = {
  amount: 1,
  direction: <Vector3Declaration>[0, 0, -1],
}

type Segment = {
  id: number
  index0: number
  index1: number
}

/**
 * This works but must be improved.
 * 
 * What it does:
 * - Automatically detect "open" edges and create extrusion geometry for them.
 * 
 * Limitations:
 * - The source must be an indexed geometry, but there are no reasons for this.
 *   Any geometry must be allowed.
 * - The extruded geometry is indexed and it shares normals per vertex which has
 *   huge implications for shading: absolute smoothing!
 * 
 * Next:
 * - A "MeshGraph" structure to represent the geometry and its relationships may
 *   be used in the future to generate more accurate extrusion geometries.
 */
export function createExtrusionGeometry(geometry: BufferGeometry, userOptions: Partial<typeof defaultOptions> = {}) {
  if (!geometry.index)
    throw new Error('Geometry must be indexed')

  const options = { ...defaultOptions, ...userOptions }
  const triangleCount = geometry.index.count / 3
  const computeSegmentId = (index0: number, index1: number) => {
    return (index0 < index1
      ? index0 * triangleCount + index1
      : index1 * triangleCount + index0)
  }

  const segmentMap = new Map<number, [segment: Segment, count: number]>()
  const addSegment = (index0: number, index1: number) => {
    const id = computeSegmentId(index0, index1)
    const segment: Segment = { id, index0, index1 }
    const entry = segmentMap.get(id)
    if (entry) {
      entry[1]++
    } else {
      segmentMap.set(id, [segment, 1])
    }
  }
  for (let i = 0; i < geometry.index.count; i += 3) {
    const index0 = geometry.index.getX(i)
    const index1 = geometry.index.getX(i + 1)
    const index2 = geometry.index.getX(i + 2)
    addSegment(index0, index1)
    addSegment(index1, index2)
    addSegment(index2, index0)
  }

  const segments =
    segmentMap.values()
      .filter(([, count]) => count === 1)
      .map(([segment]) => segment)
      .toArray()

  const segmentIndexes = Array.from(new Set(segments.flatMap(s => [s.index0, s.index1])))
  const segmentIndexCount = segmentIndexes.length
  const extrusionGeometry = new BufferGeometry()

  const extrusionPosition = new Float32Array(segmentIndexCount * 3 * 2)
  const { x: dx, y: dy, z: dz } = fromVector3Declaration(options.direction).multiplyScalar(options.amount)
  for (let i = 0; i < segmentIndexCount; i++) {
    const srcIndex = segmentIndexes[i]
    const x = geometry.attributes.position.array[srcIndex * 3 + 0]
    const y = geometry.attributes.position.array[srcIndex * 3 + 1]
    const z = geometry.attributes.position.array[srcIndex * 3 + 2]

    extrusionPosition[i * 3 + 0] = x
    extrusionPosition[i * 3 + 1] = y
    extrusionPosition[i * 3 + 2] = z

    extrusionPosition[(i + segmentIndexCount) * 3 + 0] = x + dx
    extrusionPosition[(i + segmentIndexCount) * 3 + 1] = y + dy
    extrusionPosition[(i + segmentIndexCount) * 3 + 2] = z + dz
  }

  const extrusionIndex = new Uint16Array(segments.length * 6)
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    extrusionIndex[i * 6 + 0] = segmentIndexes.indexOf(segment.index0)
    extrusionIndex[i * 6 + 1] = segmentIndexes.indexOf(segment.index1) + segmentIndexCount
    extrusionIndex[i * 6 + 2] = segmentIndexes.indexOf(segment.index1)
    extrusionIndex[i * 6 + 3] = segmentIndexes.indexOf(segment.index0)
    extrusionIndex[i * 6 + 4] = segmentIndexes.indexOf(segment.index0) + segmentIndexCount
    extrusionIndex[i * 6 + 5] = segmentIndexes.indexOf(segment.index1) + segmentIndexCount
  }

  extrusionGeometry.setAttribute('position', new BufferAttribute(extrusionPosition, 3))
  extrusionGeometry.setAttribute('uv', new BufferAttribute(new Float32Array(extrusionPosition.length / 3 * 2), 2))
  extrusionGeometry.setIndex(new BufferAttribute(extrusionIndex, 1))
  extrusionGeometry.computeVertexNormals()

  return extrusionGeometry
}