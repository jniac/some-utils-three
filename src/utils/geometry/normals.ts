import { BufferGeometry, Vector2, Vector3 } from 'three'

/**
 * Flips the normals of a BufferGeometry.
 * 
 * If the geometry is indexed, only the index is modified, otherwise each attribute
 * is modified.
 */
export function flipNormals(geometry: BufferGeometry): BufferGeometry {
  if (geometry.index) {
    // Inverse triangle's winding order
    const arr = geometry.index.array
    for (let i = 0, max = arr.length; i < max; i += 3) {
      const i0 = arr[i + 0]
      const i1 = arr[i + 1]
      arr[i + 0] = i1
      arr[i + 1] = i0
    }
    geometry.index.needsUpdate = true
  }

  else {
    // Inverse item's order (positions, normals, uvs, ...)
    const count = geometry.attributes.position.count
    for (const attr of Object.values(geometry.attributes)) {
      const { array, itemSize } = attr
      attr.needsUpdate = true
      switch (itemSize) {
        case 3: {
          const p0 = new Vector3()
          const p1 = new Vector3()
          for (let i = 0; i < count; i += 3) {
            p0.fromArray(array, (i + 0) * itemSize)
            p1.fromArray(array, (i + 1) * itemSize)
            p0.toArray(array, (i + 1) * itemSize)
            p1.toArray(array, (i + 0) * itemSize)
          }
          break
        }
        case 2: {
          const p0 = new Vector2()
          const p1 = new Vector2()
          for (let i = 0; i < count; i += 3) {
            p0.fromArray(array, (i + 0) * itemSize)
            p1.fromArray(array, (i + 1) * itemSize)
            p0.toArray(array, (i + 1) * itemSize)
            p1.toArray(array, (i + 0) * itemSize)
          }
        }
      }
    }
  }

  // Inverse normals directions
  if (geometry.attributes.normal) {
    const n = geometry.attributes.normal
    for (let i = 0; i < n.count; i++) {
      n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i))
    }
    n.needsUpdate = true
  }

  return geometry
}
