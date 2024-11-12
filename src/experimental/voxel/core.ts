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

export const defaultDirectionTangent: Record<Direction, Direction> = {
  [Direction.R]: Direction.B,
  [Direction.L]: Direction.F,
  [Direction.U]: Direction.R,
  [Direction.D]: Direction.L,
  [Direction.F]: Direction.R,
  [Direction.B]: Direction.L,
}

export const defaultDirectionBitangent: Record<Direction, Direction> = {
  [Direction.R]: Direction.U,
  [Direction.L]: Direction.U,
  [Direction.U]: Direction.B,
  [Direction.D]: Direction.F,
  [Direction.F]: Direction.U,
  [Direction.B]: Direction.U,
}

export const directionVectors: Record<Direction, Vector3> = {
  [Direction.R]: new Vector3(+1, 0, 0),
  [Direction.L]: new Vector3(-1, 0, 0),
  [Direction.U]: new Vector3(0, +1, 0),
  [Direction.D]: new Vector3(0, -1, 0),
  [Direction.F]: new Vector3(0, 0, +1),
  [Direction.B]: new Vector3(0, 0, -1),
}

export function oppositeDirection(dir: Direction): Direction {
  // Flip the least significant bit, brilliant!
  return dir ^ 1 as Direction
}

export function directionToVector(dir: Direction): Vector3 {
  return directionVectors[dir]
}


