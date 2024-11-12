import { Vector3 } from 'three'
import { Direction, defaultDirectionTangent } from './core'

let _i = 0
let _x = 0, _y = 0, _z = 0
let _array: Float32Array | number[] = []

const _position = {
  A() {
    _array[_i++] = _x
    _array[_i++] = _y
    _array[_i++] = _z
    return _position
  },
  B() {
    _array[_i++] = _x
    _array[_i++] = _y
    _array[_i++] = _z + 1
    return _position
  },
  C() {
    _array[_i++] = _x
    _array[_i++] = _y + 1
    _array[_i++] = _z
    return _position
  },
  D() {
    _array[_i++] = _x
    _array[_i++] = _y + 1
    _array[_i++] = _z + 1
    return _position
  },
  E() {
    _array[_i++] = _x + 1
    _array[_i++] = _y
    _array[_i++] = _z
    return _position
  },
  F() {
    _array[_i++] = _x + 1
    _array[_i++] = _y
    _array[_i++] = _z + 1
    return _position
  },
  G() {
    _array[_i++] = _x + 1
    _array[_i++] = _y + 1
    _array[_i++] = _z
    return _position
  },
  H() {
    _array[_i++] = _x + 1
    _array[_i++] = _y + 1
    _array[_i++] = _z + 1
    return _position
  },
}

const _normal = {
  R() {
    _array[_i++] = +1
    _array[_i++] = 0
    _array[_i++] = 0
    return _normal
  },
  L() {
    _array[_i++] = -1
    _array[_i++] = 0
    _array[_i++] = 0
    return _normal
  },
  U() {
    _array[_i++] = 0
    _array[_i++] = +1
    _array[_i++] = 0
    return _normal
  },
  D() {
    _array[_i++] = 0
    _array[_i++] = -1
    _array[_i++] = 0
    return _normal
  },
  F() {
    _array[_i++] = 0
    _array[_i++] = 0
    _array[_i++] = +1
    return _normal
  },
  B() {
    _array[_i++] = 0
    _array[_i++] = 0
    _array[_i++] = -1
    return _normal
  },
  R6() {
    return _normal.R().R().R().R().R().R()
  },
  L6() {
    return _normal.L().L().L().L().L().L()
  },
  U6() {
    return _normal.U().U().U().U().U().U()
  },
  D6() {
    return _normal.D().D().D().D().D().D()
  },
  F6() {
    return _normal.F().F().F().F().F().F()
  },
  B6() {
    return _normal.B().B().B().B().B().B()
  },
}

export class VoxelSpaceFace {
  position: Vector3
  direction: Direction
  tangent: Direction

  constructor(
    position: Vector3,
    direction: Direction,
    tangent: Direction = defaultDirectionTangent[direction]
  ) {
    this.position = position
    this.direction = direction
    this.tangent = tangent
  }

  positionToArray<T extends number[] | Float32Array>(out: T, offset = 0): T {
    const { position, direction } = this
    _array = out
    _i = offset
    _x = position.x
    _y = position.y
    _z = position.z
    switch (direction) {
      case Direction.R: {
        _position
          .E().G().F()
          .F().G().H()
        break
      }
      case Direction.L: {
        _position
          .A().B().D()
          .A().D().C()
        break
      }
      case Direction.U: {
        _position
          .D().H().G()
          .D().G().C()
        break
      }
      case Direction.D: {
        _position
          .A().E().F()
          .A().F().B()
        break
      }
      case Direction.F: {
        _position
          .B().F().H()
          .B().H().D()
        break
      }
      case Direction.B: {
        _position
          .A().C().E()
          .E().C().G()
        break
      }
    }
    return out
  }

  normalToArray<T extends number[] | Float32Array>(out: T, offset = 0): T {
    const { direction } = this
    _array = out
    _i = offset
    switch (direction) {
      case Direction.R: {
        _normal.R6()
        break
      }
      case Direction.L: {
        _normal.L6()
        break
      }
      case Direction.U: {
        _normal.U6()
        break
      }
      case Direction.D: {
        _normal.D6()
        break
      }
      case Direction.F: {
        _normal.F6()
        break
      }
      case Direction.B: {
        _normal.B6()
        break
      }
    }
    return out
  }
}
