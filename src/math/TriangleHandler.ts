import { BufferGeometry, Vector3, Vector3Like } from 'three'

export class TriangleHandler {
  ax = 0
  ay = 0
  az = 0

  bx = 0
  by = 0
  bz = 0

  cx = 0
  cy = 0
  cz = 0

  fromGeometry(geometry: BufferGeometry, triangleIndex: number): this {
    const position = geometry.attributes.position
    let i0: number, i1: number, i2: number

    if (geometry.index) {
      i0 = geometry.index.getX(triangleIndex * 3 + 0)
      i1 = geometry.index.getX(triangleIndex * 3 + 1)
      i2 = geometry.index.getX(triangleIndex * 3 + 2)
    } else {
      i0 = triangleIndex * 3 + 0
      i1 = triangleIndex * 3 + 1
      i2 = triangleIndex * 3 + 2
    }

    this.ax = position.getX(i0)
    this.ay = position.getY(i0)
    this.az = position.getZ(i0)

    this.bx = position.getX(i1)
    this.by = position.getY(i1)
    this.bz = position.getZ(i1)

    this.cx = position.getX(i2)
    this.cy = position.getY(i2)
    this.cz = position.getZ(i2)

    return this
  }

  normal(out = new Vector3()) {
    const { ax, ay, az, bx, by, bz, cx, cy, cz } = this

    const abx = bx - ax
    const aby = by - ay
    const abz = bz - az

    const acx = cx - ax
    const acy = cy - ay
    const acz = cz - az

    return out.set(
      aby * acz - abz * acy,
      abz * acx - abx * acz,
      abx * acy - aby * acx,
    ).normalize()
  }

  pointToLocal(point: Vector3Like, out = new Vector3()) {
    return this.#toLocal(
      point.x - this.ax,
      point.y - this.ay,
      point.z - this.az,
      out,
    )
  }

  pointToWorld(point: Vector3Like, out = new Vector3()) {
    this.#toWorld(point, out)
    out.x += this.ax
    out.y += this.ay
    out.z += this.az
    return out
  }

  vectorToLocal(vector: Vector3Like, out = new Vector3()) {
    return this.#toLocal(vector.x, vector.y, vector.z, out)
  }

  vectorToWorld(vector: Vector3Like, out = new Vector3()) {
    return this.#toWorld(vector, out)
  }

  #toLocal(x: number, y: number, z: number, out: Vector3) {
    const { ax, ay, az, bx, by, bz, cx, cy, cz } = this

    const abx = bx - ax
    const aby = by - ay
    const abz = bz - az

    const acx = cx - ax
    const acy = cy - ay
    const acz = cz - az

    const nx = aby * acz - abz * acy
    const ny = abz * acx - abx * acz
    const nz = abx * acy - aby * acx

    const abSq = abx * abx + aby * aby + abz * abz
    const abAc = abx * acx + aby * acy + abz * acz
    const acSq = acx * acx + acy * acy + acz * acz
    const xAb = x * abx + y * aby + z * abz
    const xAc = x * acx + y * acy + z * acz
    const determinant = abSq * acSq - abAc * abAc

    return out.set(
      (acSq * xAb - abAc * xAc) / determinant,
      (abSq * xAc - abAc * xAb) / determinant,
      (x * nx + y * ny + z * nz) / determinant,
    )
  }

  #toWorld(vector: Vector3Like, out: Vector3) {
    const { ax, ay, az, bx, by, bz, cx, cy, cz } = this

    const abx = bx - ax
    const aby = by - ay
    const abz = bz - az

    const acx = cx - ax
    const acy = cy - ay
    const acz = cz - az

    const nx = aby * acz - abz * acy
    const ny = abz * acx - abx * acz
    const nz = abx * acy - aby * acx

    const x = vector.x
    const y = vector.y
    const z = vector.z

    return out.set(
      x * abx + y * acx + z * nx,
      x * aby + y * acy + z * ny,
      x * abz + y * acz + z * nz,
    )
  }
}
