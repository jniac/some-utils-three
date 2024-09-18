import { Matrix4, Vector3 } from 'three'

export const computeTangentMatrixFromNormal = (() => {
  const defaultUp = new Vector3(0, 1, 0)
  const secondUp = new Vector3(0, 0, -1)
  const defaultPosition = new Vector3()
  const tangent = new Vector3()
  const bitangent = new Vector3()
  return function (out: Matrix4, normal: Vector3, up = defaultUp, position = defaultPosition): void {
    tangent.crossVectors(up, normal)

    // If the normal and up vectors are parallel, use a different up vector
    if (tangent.lengthSq() < 1e-6) {
      tangent.crossVectors(secondUp, normal)
    }

    tangent.normalize()
    bitangent.crossVectors(normal, tangent).normalize()

    out.set(
      tangent.x, bitangent.x, normal.x, position.x,
      tangent.y, bitangent.y, normal.y, position.y,
      tangent.z, bitangent.z, normal.z, position.z,
      0, 0, 0, 1,
    )
  }
})()