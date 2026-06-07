export type ChunkKey = `${number}:${number}`

export function createChunkKey(regionIndex: number, chunkIndex: number): ChunkKey {
  return `${regionIndex}:${chunkIndex}`
}

