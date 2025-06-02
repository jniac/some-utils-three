import { BufferGeometry } from 'three'

/**
 * Flips the normals of a BufferGeometry.
 * 
 * Note: If the geometry has an index, it will be converted to a non-indexed geometry.
 */
export function flipNormals(geometry: BufferGeometry): BufferGeometry {
  if (geometry.index)
    geometry = geometry.toNonIndexed()

  const pos = geometry.attributes.position
  for (let i = 0; i < pos.count; i += 3) {
    for (const attr of Object.values(geometry.attributes)) {
      const x1 = attr.getX(i + 1), y1 = attr.getY(i + 1), z1 = attr.getZ(i + 1)
      const x2 = attr.getX(i + 2), y2 = attr.getY(i + 2), z2 = attr.getZ(i + 2)
      attr.setXYZ(i + 1, x2, y2, z2)
      attr.setXYZ(i + 2, x1, y1, z1)
    }
  }

  if (geometry.attributes.normal) {
    const n = geometry.attributes.normal
    for (let i = 0; i < n.count; i++) {
      n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i))
    }
    n.needsUpdate = true
  }

  for (const attr of Object.values(geometry.attributes)) {
    attr.needsUpdate = true
  }

  return geometry
}
