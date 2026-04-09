import { InstancedMesh, Matrix4, Mesh, Vector3 } from 'three'
import { GeometryIntersection, rayGeometryAllIntersections, rayGeometryFirstIntersection, rayGeometryIntersectionDefaultOptions } from './intersection-geometry'

/**
 * Since Vector.transformDirection normalizes the vector, we need here a version of it that doesn't normalize.
 */
function transformAsMatrix3(v: Vector3, m: Matrix4): void {
  const { x, y, z } = v
  const e = m.elements
  v.set(
    e[0] * x + e[4] * y + e[8] * z,
    e[1] * x + e[5] * y + e[9] * z,
    e[2] * x + e[6] * y + e[10] * z,
  )
}

const rayMeshIntersection_cache = {
  m: new Matrix4(),
  mi: new Matrix4(),
  localOrigin: new Vector3(),
  localDirection: new Vector3(),

  // For instanced meshes
  i_m: new Matrix4(),
  i_mi: new Matrix4(),
  i_localOrigin: new Vector3(),
  i_localDirection: new Vector3(),

  e1: new Vector3(),
  e2: new Vector3(),
}

class MeshIntersection extends GeometryIntersection {
  mesh!: Mesh
  instanceId = -1

  constructor(mesh: Mesh, base: GeometryIntersection, instanceId = -1) {
    super()
    super.copy(base)
    this.mesh = mesh
    this.instanceId = instanceId
  }

  override copy(other: this): this {
    super.copy(other)
    this.mesh = other.mesh
    return this
  }

  override clone(): MeshIntersection {
    return new MeshIntersection(this.mesh, this)
  }

  override getPoint(out?: Vector3): Vector3 {
    // Regular Mesh:
    if (this.mesh instanceof InstancedMesh === false) {
      return super.getPoint(out).applyMatrix4(this.mesh.matrixWorld)
    }

    // InstancedMesh:
    else {
      const { i_m } = rayMeshIntersection_cache
      this.mesh.getMatrixAt(this.instanceId, i_m)
      return super.getPoint(out).applyMatrix4(i_m).applyMatrix4(this.mesh.matrixWorld)
    }
  }

  override getNormal(out?: Vector3): Vector3 {
    const { e1, e2 } = rayMeshIntersection_cache

    // Regular Mesh:
    if (this.mesh instanceof InstancedMesh === false) {
      transformAsMatrix3(e1.copy(this.e1), this.mesh.matrixWorld)
      transformAsMatrix3(e2.copy(this.e2), this.mesh.matrixWorld)
      return (out ?? new Vector3()).copy(e1).cross(e2).normalize()
    }

    // InstancedMesh:
    else {
      const { i_m } = rayMeshIntersection_cache
      this.mesh.getMatrixAt(this.instanceId, i_m)
      transformAsMatrix3(e1.copy(this.e1), i_m)
      transformAsMatrix3(e1, this.mesh.matrixWorld)
      transformAsMatrix3(e2.copy(this.e2), i_m)
      transformAsMatrix3(e2, this.mesh.matrixWorld)
      return (out ?? new Vector3()).copy(e1).cross(e2).normalize()
    }
  }
}

function rayMeshFirstIntersection(
  origin: Vector3,
  direction: Vector3,
  mesh: Mesh,
  options?: Partial<typeof rayGeometryIntersectionDefaultOptions>,
): MeshIntersection | null {
  const { m, mi, localOrigin, localDirection } = rayMeshIntersection_cache

  mesh.updateMatrixWorld()

  m.copy(mesh.matrixWorld)
  mi.copy(m).invert()
  localOrigin.copy(origin).applyMatrix4(mi)
  transformAsMatrix3(localDirection.copy(direction), mi)

  // Regular Mesh: just test against the geometry
  if (mesh instanceof InstancedMesh === false) {
    const I = rayGeometryFirstIntersection(localOrigin, localDirection, mesh.geometry, options)
    if (I) {
      return new MeshIntersection(mesh, I)
    }
    return null
  }

  // InstancedMesh: we need to test against each instance's transform
  else {
    const { i_m, i_mi, i_localOrigin, i_localDirection } = rayMeshIntersection_cache
    const instanceCount = mesh.count
    let closestIntersection: MeshIntersection | null = null
    for (let instanceId = 0; instanceId < instanceCount; instanceId++) {
      mesh.getMatrixAt(instanceId, i_m)
      i_mi.copy(i_m).invert()
      i_localOrigin.copy(localOrigin).applyMatrix4(i_mi)
      transformAsMatrix3(i_localDirection.copy(localDirection), i_mi)
      const I = rayGeometryFirstIntersection(i_localOrigin, i_localDirection, mesh.geometry, options)
      if (I) {
        const intersection = new MeshIntersection(mesh, I, instanceId)
        if (!closestIntersection || intersection.t < closestIntersection.t) {
          closestIntersection = intersection
        }
      }
    }
    return closestIntersection
  }
}

function rayMeshAllIntersections(
  origin: Vector3,
  direction: Vector3,
  mesh: Mesh,
  options?: Partial<typeof rayGeometryIntersectionDefaultOptions>,
) {
  const { m, mi, localOrigin, localDirection } = rayMeshIntersection_cache

  mesh.updateMatrixWorld()

  m.copy(mesh.matrixWorld)
  mi.copy(m).invert()
  localOrigin.copy(origin).applyMatrix4(mi)
  transformAsMatrix3(localDirection.copy(direction), mi)

  // Regular Mesh: just test against the geometry
  if (mesh instanceof InstancedMesh === false) {
    const results = rayGeometryAllIntersections(localOrigin, localDirection, mesh.geometry, options)
    return results.map(result => new MeshIntersection(mesh, result))
  }

  // InstancedMesh: we need to test against each instance's transform
  else {
    const { i_m, i_mi, i_localOrigin, i_localDirection } = rayMeshIntersection_cache
    const results: MeshIntersection[] = []
    const instanceCount = mesh.count
    for (let instanceId = 0; instanceId < instanceCount; instanceId++) {
      mesh.getMatrixAt(instanceId, i_m)
      i_mi.copy(i_m).invert()
      i_localOrigin.copy(localOrigin).applyMatrix4(i_mi)
      transformAsMatrix3(i_localDirection.copy(localDirection), i_mi)
      results.push(...rayGeometryAllIntersections(i_localOrigin, i_localDirection, mesh.geometry, options)
        .map(I => new MeshIntersection(mesh, I, instanceId)))
    }
    return results
  }
}

export {
  MeshIntersection,
  rayMeshAllIntersections,
  rayMeshFirstIntersection
}

