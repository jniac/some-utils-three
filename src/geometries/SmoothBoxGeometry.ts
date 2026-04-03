import {
  BoxGeometry,
  BufferGeometry,
  Vector3,
} from 'three'

type Axis = 'x' | 'y' | 'z'

const _tempNormal = new Vector3()

function getComponent(v: Vector3, axis: Axis): number {
  return axis === 'x' ? v.x : axis === 'y' ? v.y : v.z
}

function setComponent(v: Vector3, axis: Axis, value: number) {
  if (axis === 'x') v.x = value
  else if (axis === 'y') v.y = value
  else v.z = value
}

function getUv(
  faceDirVector: Vector3,
  normal: Vector3,
  uvAxis: Axis,
  projectionAxis: Axis,
  radius: number,
  sideLength: number,
): number {
  const totArcLength = (2 * Math.PI * radius) / 4

  const centerLength = Math.max(sideLength - 2 * radius, 0)
  const halfArc = Math.PI / 4

  _tempNormal.copy(normal)
  setComponent(_tempNormal, projectionAxis, 0)
  _tempNormal.normalize()

  const arcUvRatio = 0.5 * totArcLength / (totArcLength + centerLength)

  const arcAngleRatio =
    1.0 - (_tempNormal.angleTo(faceDirVector) / halfArc)

  if (Math.sign(getComponent(_tempNormal, uvAxis)) === 1) {
    return arcAngleRatio * arcUvRatio
  } else {
    const lenUv = centerLength / (totArcLength + centerLength)
    return lenUv + arcUvRatio + arcUvRatio * (1.0 - arcAngleRatio)
  }
}

function spow(base: number, exp: number): number {
  const sign = Math.sign(base)
  return sign * Math.pow(sign * base, exp)
}

type SmoothBoxGeometryParameters = {
  width: number
  height: number
  depth: number
  segments: number
  radius: number
  roundPower: number
}

/**
 * Based on three [SmoothBoxGeometry.js](https://github.com/mrdoob/three.js/blob/master/examples/jsm/geometries/SmoothBoxGeometry.js)
 * with one improvement: the roundness can be controlled by adjusting the `roundPower` 
 * parameter. This allows for more natural-looking rounded boxes, as the normal's 
 * transitions between faces and corners are not producing linear shading artifacts.
 * 
 * Notes:
 * - `roundPower` provides a way to control how "round" the corners of the box are.
 * - `roundPower = 1`: the corners will be perfectly round, forming a quarter of a circle.
 * - `roundPower > 1`: the corners will be more smoothed out, looking more like natural eroded edges.
 */
export class SmoothBoxGeometry extends BufferGeometry {
  parameters: SmoothBoxGeometryParameters

  type = 'SmoothBoxGeometry'

  constructor(
    width = 1,
    height = 1,
    depth = 1,
    segments = 2,
    radius = 0.1,
    roundPower = 1.25,
  ) {
    const totalSegments = segments * 2 + 1

    radius = Math.min(width / 2, height / 2, depth / 2, radius)

    super()

    this.parameters = {
      width,
      height,
      depth,
      segments,
      radius,
      roundPower,
    }

    if (totalSegments === 1) return

    const source = new BoxGeometry(1, 1, 1, totalSegments, totalSegments, totalSegments)
      .toNonIndexed()

    this.index = null
    this.attributes.position = source.attributes.position
    this.attributes.normal = source.attributes.normal
    this.attributes.uv = source.attributes.uv

    const position = new Vector3()
    const normal = new Vector3()

    const box = new Vector3(width, height, depth)
      .divideScalar(2)
      .subScalar(radius)

    const positions = this.attributes.position.array as Float32Array
    const normals = this.attributes.normal.array as Float32Array
    const uvs = this.attributes.uv.array as Float32Array

    const faceTris = positions.length / 6
    const faceDirVector = new Vector3()
    const halfSegmentSize = 0.5 / totalSegments

    for (let i = 0, j = 0; i < positions.length; i += 3, j += 2) {

      position.fromArray(positions, i)

      normal.copy(position)
      normal.x -= Math.sign(normal.x) * halfSegmentSize
      normal.y -= Math.sign(normal.y) * halfSegmentSize
      normal.z -= Math.sign(normal.z) * halfSegmentSize
      normal.normalize()

      const pow = 1 / roundPower

      positions[i + 0] =
        box.x * Math.sign(position.x) + spow(normal.x, pow) * radius
      positions[i + 1] =
        box.y * Math.sign(position.y) + spow(normal.y, pow) * radius
      positions[i + 2] =
        box.z * Math.sign(position.z) + spow(normal.z, pow) * radius

      normals[i + 0] = normal.x
      normals[i + 1] = normal.y
      normals[i + 2] = normal.z

      const side = Math.floor(i / faceTris)

      switch (side) {

        case 0: // right
          faceDirVector.set(1, 0, 0)
          uvs[j + 0] = getUv(faceDirVector, normal, 'z', 'y', radius, depth)
          uvs[j + 1] = 1.0 - getUv(faceDirVector, normal, 'y', 'z', radius, height)
          break

        case 1: // left
          faceDirVector.set(-1, 0, 0)
          uvs[j + 0] = 1.0 - getUv(faceDirVector, normal, 'z', 'y', radius, depth)
          uvs[j + 1] = 1.0 - getUv(faceDirVector, normal, 'y', 'z', radius, height)
          break

        case 2: // top
          faceDirVector.set(0, 1, 0)
          uvs[j + 0] = 1.0 - getUv(faceDirVector, normal, 'x', 'z', radius, width)
          uvs[j + 1] = getUv(faceDirVector, normal, 'z', 'x', radius, depth)
          break

        case 3: // bottom
          faceDirVector.set(0, -1, 0)
          uvs[j + 0] = 1.0 - getUv(faceDirVector, normal, 'x', 'z', radius, width)
          uvs[j + 1] = 1.0 - getUv(faceDirVector, normal, 'z', 'x', radius, depth)
          break

        case 4: // front
          faceDirVector.set(0, 0, 1)
          uvs[j + 0] = 1.0 - getUv(faceDirVector, normal, 'x', 'y', radius, width)
          uvs[j + 1] = 1.0 - getUv(faceDirVector, normal, 'y', 'x', radius, height)
          break

        case 5: // back
          faceDirVector.set(0, 0, -1)
          uvs[j + 0] = getUv(faceDirVector, normal, 'x', 'y', radius, width)
          uvs[j + 1] = 1.0 - getUv(faceDirVector, normal, 'y', 'x', radius, height)
          break
      }
    }
  }

  static fromJSON(data: {
    width: number
    height: number
    depth: number
    segments: number
    radius: number
    roundPower: number
  }): SmoothBoxGeometry {
    return new SmoothBoxGeometry(
      data.width,
      data.height,
      data.depth,
      data.segments,
      data.radius,
      data.roundPower,
    )
  }
}