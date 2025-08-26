import { Mesh, Vector2, Vector3 } from 'three'

class Vertex {
  static #nextId = 0

  readonly uid = Vertex.#nextId++

  position = new Vector3()

  edges: Segment[] = [];

  *siblings(): Generator<Vertex> {
    for (const edge of this.edges) {
      yield edge.vertexA === this ? edge.vertexB : edge.vertexA
    }
  }
}

class Segment {
  static #nextId = 0

  readonly uid = Segment.#nextId++

  vertexA: Vertex
  vertexB: Vertex

  triangles: Triangle[] = []

  constructor(vertexA: Vertex, vertexB: Vertex) {
    this.vertexA = vertexA
    this.vertexB = vertexB
  }
}

class Triangle {
  static #nextId = 0

  readonly uid = Triangle.#nextId++

  vertexA: Vertex
  vertexB: Vertex
  vertexC: Vertex

  normalA = new Vector3()
  normalB = new Vector3()
  normalC = new Vector3()

  uvA = new Vector2()
  uvB = new Vector2()
  uvC = new Vector2()

  constructor(vertexA: Vertex, vertexB: Vertex, vertexC: Vertex) {
    this.vertexA = vertexA
    this.vertexB = vertexB
    this.vertexC = vertexC
  }
}

/**
 * WIIIIIP!
 *
 * Just a draft for the moment.
 */
export class MeshGraph {
  vertices = new Map<number, Vertex>()
  segments: Segment[] = []
  triangles: Triangle[] = []

  from(value: Mesh) {
    throw new Error('Not implemented')
  }

  constructor() {
    throw new Error('Not implemented')
  }
}