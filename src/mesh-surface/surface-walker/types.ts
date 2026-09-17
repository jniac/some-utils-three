
export type MutableVector2Like = {
  x: number
  y: number
}

export type MutableVector3Like = {
  x: number
  y: number
  z: number
}

export type SurfacePoint = {
  triangleIndex: number
  x: number
  y: number
}

export enum WalkStatus {
  BoundaryHit,
  MaxIterations,
  MaxDistance
}

export type PathSegment = {
  triangleIndex: number
  u0: number
  v0: number
  u1: number
  v1: number
}

