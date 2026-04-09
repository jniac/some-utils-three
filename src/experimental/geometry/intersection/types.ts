export enum TriangleIntersectionType {
  Parallel = 0,
  Outside = 1,
  LineIntersection = 2,
  RayIntersection = 3,
  SegmentIntersection = 4,
}

export enum IntersectionMode {
  Line = 0,
  Ray = 1,
  Segment = 2,
  SymmetricSegment = 3,
}

export enum Culling {
  None = 0,
  BackFace = 1,
  FrontFace = 2,
}
