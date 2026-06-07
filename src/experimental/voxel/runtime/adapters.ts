import { Chunk } from '../chunk'

export type ChunkRuntime = {
  key: string
  regionIndex: number
  chunkIndex: number
  chunk: Chunk
  dirtyMesh: boolean
  dirtyPhysics: boolean
  renderHandle: unknown
  physicsHandle: unknown
}

export type WorldRendererAdapter = {
  mountChunk(runtime: ChunkRuntime): unknown
  updateChunk(runtime: ChunkRuntime, handle: unknown): unknown
  unmountChunk(handle: unknown, runtime: ChunkRuntime): void
}

export type WorldPhysicsAdapter = {
  mountChunk(runtime: ChunkRuntime): unknown
  updateChunk(runtime: ChunkRuntime, handle: unknown): unknown
  unmountChunk(handle: unknown, runtime: ChunkRuntime): void
}

