import { Vector3 } from 'three'

export enum Axis {
  X = 0,
  Y = 2,
  Z = 4,
}

// Direction is a based on Axis, but the values are from 0 to 5 without holes.
export enum Direction {
  /**
   * Right (X+)
   */
  R = Axis.X,
  /**
   * Left (X-)
   */
  L = Axis.X + 1,

  /**
   * Up (Y+)
   */
  U = Axis.Y,
  /**
   * Down (Y-)
   */
  D = Axis.Y + 1,

  /**
   * Forward (Z+)
   */
  F = Axis.Z,
  /**
   * Backward (Z-)
   */
  B = Axis.Z + 1,
}

export enum DirectionFlags {
  None = 0b000000,
  All = 0b111111,

  R = 1 << Direction.R,
  L = 1 << Direction.L,
  U = 1 << Direction.U,
  D = 1 << Direction.D,
  F = 1 << Direction.F,
  B = 1 << Direction.B,
}

export const defaultDirectionTangent: Record<Direction, Direction> = [
  Direction.B,
  Direction.F,
  Direction.R,
  Direction.L,
  Direction.R,
  Direction.L,
]


export const defaultDirectionBitangent: Direction[] = [
  Direction.U,
  Direction.U,
  Direction.B,
  Direction.F,
  Direction.U,
  Direction.U,
]

export const directionVectors: Vector3[] = [
  new Vector3(+1, 0, 0), // R
  new Vector3(-1, 0, 0), // L
  new Vector3(0, +1, 0), // U
  new Vector3(0, -1, 0), // D
  new Vector3(0, 0, +1), // F
  new Vector3(0, 0, -1), // B
]

export function oppositeDirection(dir: Direction): Direction {
  // Flip the least significant bit, brilliant!
  return dir ^ 1 as Direction
}

export function directionToVector(dir: Direction): Vector3 {
  return directionVectors[dir]
}

export const CHUNK_COORDS_SIZE = 1624 // even-floor((2 ** 32) ** (1/3))
const HALF_CHUNK_COORDS_SIZE = CHUNK_COORDS_SIZE / 2

export function toChunkCoordsKey(x: number, y: number, z: number) {
  if (x < -HALF_CHUNK_COORDS_SIZE || x >= HALF_CHUNK_COORDS_SIZE) {
    throw new Error(`x is out of bounds: ${x}`)
  }
  if (y < -HALF_CHUNK_COORDS_SIZE || y >= HALF_CHUNK_COORDS_SIZE) {
    throw new Error(`y is out of bounds: ${y}`)
  }
  if (z < -HALF_CHUNK_COORDS_SIZE || z >= HALF_CHUNK_COORDS_SIZE) {
    throw new Error(`z is out of bounds: ${z}`)
  }
  return (z + HALF_CHUNK_COORDS_SIZE) * CHUNK_COORDS_SIZE * CHUNK_COORDS_SIZE + (y + HALF_CHUNK_COORDS_SIZE) * CHUNK_COORDS_SIZE + (x + HALF_CHUNK_COORDS_SIZE)
}

export function fromChunkCoordsKey(key: number, out = new Vector3()) {
  let n = key
  const z = Math.floor(n / (CHUNK_COORDS_SIZE * CHUNK_COORDS_SIZE))
  n -= z * (CHUNK_COORDS_SIZE * CHUNK_COORDS_SIZE)
  const y = Math.floor(n / CHUNK_COORDS_SIZE)
  n -= y * CHUNK_COORDS_SIZE
  const x = n
  return out.set(x - HALF_CHUNK_COORDS_SIZE, y - HALF_CHUNK_COORDS_SIZE, z - HALF_CHUNK_COORDS_SIZE)
}
