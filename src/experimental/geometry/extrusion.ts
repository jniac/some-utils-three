import { BufferAttribute, BufferGeometry, Matrix3, Matrix4, Vector2, Vector3 } from 'three'

interface ExtrusionBuffers {
  position: Float32Array
  normal: Float32Array
  uv: Float32Array
  index: Uint16Array | Uint32Array
}

const _shared = {
  _v2: new Vector2(),
  _v3: new Vector3(),
  _n3: new Vector3(),
  _p0: new Vector3(),
  _p1: new Vector3(),
}

function setupExtrudeIndices(
  index: Uint16Array | Uint32Array,
  options: {
    shapeLength: number
    shapeIsClosed: boolean
    pathLength: number
    pathIsClosed: boolean
  },
  flipWinding: boolean,
) {
  const {
    shapeLength,
    shapeIsClosed,
    pathLength,
    pathIsClosed,
  } = options

  const shapeVertCount = shapeIsClosed ? shapeLength + 1 : shapeLength
  const pathVertCount = pathIsClosed ? pathLength + 1 : pathLength

  let i = 0
  if (flipWinding === false) {
    for (let p = 0; p < pathVertCount - 1; p++) {
      for (let s = 0; s < shapeVertCount - 1; s++) {
        const i0 = p * shapeVertCount + s
        const i1 = i0 + 1
        const i2 = i0 + shapeVertCount
        const i3 = i2 + 1

        index[i++] = i0
        index[i++] = i1
        index[i++] = i2

        index[i++] = i1
        index[i++] = i3
        index[i++] = i2
      }
    }
  } else {
    for (let p = 0; p < pathVertCount - 1; p++) {
      for (let s = 0; s < shapeVertCount - 1; s++) {
        const i0 = p * shapeVertCount + s
        const i1 = i0 + 1
        const i2 = i0 + shapeVertCount
        const i3 = i2 + 1

        index[i++] = i0
        index[i++] = i2
        index[i++] = i1

        index[i++] = i1
        index[i++] = i2
        index[i++] = i3
      }
    }
  }
}

function initExtrudeBuffers(options: {
  shapeLength: number
  shapeIsClosed: boolean
  pathLength: number
  pathIsClosed: boolean
}): ExtrusionBuffers {
  const {
    shapeLength,
    shapeIsClosed,
    pathLength,
    pathIsClosed,
  } = options

  const shapeVertCount = shapeIsClosed ? shapeLength + 1 : shapeLength
  const pathVertCount = pathIsClosed ? pathLength + 1 : pathLength

  const totalVertices = shapeVertCount * pathVertCount
  const totalQuads = (shapeVertCount - 1) * (pathVertCount - 1)
  const indexCount = totalQuads * 6

  const position = new Float32Array(totalVertices * 3)
  const normal = new Float32Array(totalVertices * 3)
  const uv = new Float32Array(totalVertices * 2)

  const index =
    totalVertices > 65535
      ? new Uint32Array(indexCount)
      : new Uint16Array(indexCount)


  return { position, normal, uv, index }
}

function setupExtrudeBuffers(options: {
  buffers: ExtrusionBuffers

  shape: IterableOrGenerator<Vector2>
  shapeLength: number
  shapeIsClosed: boolean

  path: IterableOrGenerator<Matrix4>
  pathLength: number
  pathIsClosed: boolean
}) {
  const {
    buffers,

    shape: shapeArg,
    shapeLength,
    shapeIsClosed,

    path: pathArg,
    pathLength,
    pathIsClosed,
  } = options

  const {
    position,
    normal,
    uv,
  } = buffers

  const {
    _v2,
    _v3,
    _n3,
    _p0,
    _p1,
  } = _shared

  const shapeIter =
    typeof shapeArg === 'function' ? shapeArg(shapeLength) : shapeArg
  const pathIter =
    typeof pathArg === 'function' ? pathArg(pathLength) : pathArg

  // Rebuild shape points
  const shapePoints: Vector2[] = []
  const it = shapeIter[Symbol.iterator]()
  for (let i = 0; i < shapeLength; i++) {
    shapePoints.push(it.next().value.clone())
  }
  if (shapeIsClosed) {
    shapePoints.push(shapePoints[0].clone())
  }

  const shapeCount = shapePoints.length

  // Build shape normals (2D)
  const shapeNormals: Vector2[] = []
  for (let i = 0; i < shapePoints.length; i++) {
    const prev = shapePoints[
      i === 0
        ? shapeIsClosed
          ? shapePoints.length - 2
          : 0
        : i - 1
    ]
    const next = shapePoints[
      i === shapePoints.length - 1
        ? shapeIsClosed
          ? 1
          : shapePoints.length - 1
        : i + 1
    ]

    const edge = _v2.subVectors(prev, next)
    shapeNormals.push(new Vector2(-edge.y, edge.x).normalize())
  }

  // Shape lengths
  let shapePerimeter = 0
  const shapeLengths = [shapePerimeter]
  for (let i = 1; i < shapePoints.length; i++) {
    shapePerimeter += shapePoints[i].distanceTo(shapePoints[i - 1])
    shapeLengths.push(shapePerimeter)
  }

  const uValues = shapeLengths.map(l => l / shapePerimeter)

  const firstMatrix = new Matrix4()
  const pit = pathIter[Symbol.iterator]()

  const uvPathLength = pathIsClosed ? pathLength : pathLength - 1

  let flipWinding = false

  for (let p = 0; p < pathLength; p++) {
    const { value: m } = pit.next()
    if (p === 0)
      firstMatrix.copy(m)
    if (p === 1) {
      _p0.setFromMatrixPosition(m).sub(_p1.setFromMatrixPosition(firstMatrix))
      _p1.setFromMatrixColumn(firstMatrix, 2)
      flipWinding = _p0.dot(_p1) < 0
    }

    const nm = new Matrix3().getNormalMatrix(m)

    for (let s = 0; s < shapeCount; s++) {
      const vi = p * shapeCount + s
      const po = vi * 3
      const uo = vi * 2

      _v3.set(shapePoints[s].x, shapePoints[s].y, 0).applyMatrix4(m)
      position[po + 0] = _v3.x
      position[po + 1] = _v3.y
      position[po + 2] = _v3.z

      _n3.set(shapeNormals[s].x, shapeNormals[s].y, 0)
        .applyMatrix3(nm)
        .normalize()
      normal[po + 0] = _n3.x
      normal[po + 1] = _n3.y
      normal[po + 2] = _n3.z

      uv[uo] = uValues[s]
      uv[uo + 1] = p / uvPathLength
    }
  }

  // --- closed path duplicate ring
  if (pathIsClosed) {
    const nm = new Matrix3().getNormalMatrix(firstMatrix)

    for (let s = 0; s < shapeCount; s++) {
      const vi = pathLength * shapeCount + s
      const po = vi * 3
      const uo = vi * 2

      _v3.set(shapePoints[s].x, shapePoints[s].y, 0).applyMatrix4(firstMatrix)
      position[po + 0] = _v3.x
      position[po + 1] = _v3.y
      position[po + 2] = _v3.z

      _n3.set(shapeNormals[s].x, shapeNormals[s].y, 0)
        .applyMatrix3(nm)
        .normalize()
      normal[po + 0] = _n3.x
      normal[po + 1] = _n3.y
      normal[po + 2] = _n3.z

      uv[uo] = s / (shapeCount - 1)
      uv[uo + 1] = 1
    }
  }

  setupExtrudeIndices(buffers.index, options, flipWinding)
}

type IterableOrGenerator<T> = Iterable<T> | ((count: number) => Generator<T>)

type UserExtrusionOptions = {
  shape: IterableOrGenerator<Vector2>
  shapeLength?: number
  shapeIsClosed?: boolean

  path: number | IterableOrGenerator<Matrix4>
  pathLength?: number
  pathIsClosed?: boolean
}

function extrudeShapeAlongPath(userOptions: UserExtrusionOptions): ExtrusionBuffers {
  let {
    shape,
    shapeLength,
    shapeIsClosed = true,

    path,
    pathLength,
    pathIsClosed = false,
  } = userOptions

  if (typeof path === 'number') {
    pathLength = 2
    path = [new Matrix4(), new Matrix4().setPosition(0, 0, path)]
  }

  const shapeToArray = () => {
    const array = <Vector2[]>[]
    for (const v of typeof shape === 'function' ? shape(shapeLength ?? 8) : shape)
      array.push(v.clone()) // Clone! The current instance might be reused between iterations... (generator)
    return array
  }

  const pathToArray = (path: IterableOrGenerator<Matrix4>) => {
    const array = <Matrix4[]>[]
    for (const m of typeof path === 'function' ? path(pathLength ?? 2) : path)
      array.push(m.clone()) // Clone! The current instance might be reused between iterations... (generator)
    return array
  }

  if (shapeLength === undefined) {
    const array = Array.isArray(shape) ? shape : shapeToArray()
    shape = array
    shapeLength = array.length
  }

  if (pathLength === undefined) {
    const array = Array.isArray(path) ? path : pathToArray(path)
    path = array
    pathLength = array.length
  }

  const options = {
    shape,
    shapeLength,
    shapeIsClosed,
    path,
    pathLength,
    pathIsClosed,
  }

  const buffers = initExtrudeBuffers(options)
  setupExtrudeBuffers({ buffers, ...options })

  return buffers
}

class ShapeExtrusionGeometry extends BufferGeometry {
  constructor(options: UserExtrusionOptions) {
    super()
    const buffers = extrudeShapeAlongPath(options)
    this.setAttribute('position', new BufferAttribute(buffers.position, 3))
    this.setAttribute('normal', new BufferAttribute(buffers.normal, 3))
    this.setAttribute('uv', new BufferAttribute(buffers.uv, 2))
    this.setIndex(new BufferAttribute(buffers.index, 1))
  }
}

export {
  extrudeShapeAlongPath,
  ShapeExtrusionGeometry,
  type ExtrusionBuffers
}
