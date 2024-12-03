import { Vector3 } from 'three'

export class Indexes extends Vector3 {
  get superChunk() { return this.x }
  get chunk() { return this.y }
  get voxel() { return this.z }
}

function formatNumberWithSeparator(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '_')
}

export class WorldMetrics {
  readonly chunkSizeX: number
  readonly chunkSizeY: number
  readonly chunkSizeZ: number
  readonly chunkSizeXY: number
  readonly chunkSizeXYZ: number

  readonly superChunkSizeX: number
  readonly superChunkSizeY: number
  readonly superChunkSizeZ: number
  readonly superChunkSizeXY: number
  readonly superChunkSizeXYZ: number

  readonly superChunkVoxelSizeX: number
  readonly superChunkVoxelSizeY: number
  readonly superChunkVoxelSizeZ: number

  readonly worldSizeX: number
  readonly worldSizeY: number
  readonly worldSizeZ: number
  readonly worldSizeXY: number
  readonly worldSizeXYZ: number

  readonly worldVoxelSizeX: number
  readonly worldVoxelSizeY: number
  readonly worldVoxelSizeZ: number
  readonly worldVoxelSizeXY: number
  readonly worldVoxelSizeXYZ: number

  get chunkSize() { return this.getChunkSize() }
  get superChunkSize() { return this.getSuperChunkSize() }

  constructor(
    chunkSizeX: number,
    chunkSizeY: number,
    chunkSizeZ: number,
    superChunkSizeX: number,
    superChunkSizeY: number,
    superChunkSizeZ: number,
    worldSizeX: number,
    worldSizeY: number,
    worldSizeZ: number
  ) {
    this.chunkSizeX = chunkSizeX
    this.chunkSizeY = chunkSizeY
    this.chunkSizeZ = chunkSizeZ
    this.chunkSizeXY = chunkSizeX * chunkSizeY
    this.chunkSizeXYZ = chunkSizeX * chunkSizeY * chunkSizeZ

    this.superChunkSizeX = superChunkSizeX
    this.superChunkSizeY = superChunkSizeY
    this.superChunkSizeZ = superChunkSizeZ
    this.superChunkSizeXY = superChunkSizeX * superChunkSizeY
    this.superChunkSizeXYZ = superChunkSizeX * superChunkSizeY * superChunkSizeZ

    this.superChunkVoxelSizeX = this.superChunkSizeX * this.chunkSizeX
    this.superChunkVoxelSizeY = this.superChunkSizeY * this.chunkSizeY
    this.superChunkVoxelSizeZ = this.superChunkSizeZ * this.chunkSizeZ

    this.worldSizeX = worldSizeX
    this.worldSizeY = worldSizeY
    this.worldSizeZ = worldSizeZ
    this.worldSizeXY = worldSizeX * worldSizeY
    this.worldSizeXYZ = worldSizeX * worldSizeY * worldSizeZ

    this.worldVoxelSizeX = this.worldSizeX * this.superChunkVoxelSizeX
    this.worldVoxelSizeY = this.worldSizeY * this.superChunkVoxelSizeY
    this.worldVoxelSizeZ = this.worldSizeZ * this.superChunkVoxelSizeZ
    this.worldVoxelSizeXY = this.worldVoxelSizeX * this.worldVoxelSizeY
    this.worldVoxelSizeXYZ = this.worldVoxelSizeX * this.worldVoxelSizeY * this.worldVoxelSizeZ
  }

  clone() {
    return new WorldMetrics(
      this.chunkSizeX,
      this.chunkSizeY,
      this.chunkSizeZ,
      this.superChunkSizeX,
      this.superChunkSizeY,
      this.superChunkSizeZ,
      this.worldSizeX,
      this.worldSizeY,
      this.worldSizeZ,
    )
  }

  getChunkSize(out = new Vector3()) {
    return out.set(this.chunkSizeX, this.chunkSizeY, this.chunkSizeZ)
  }

  getSuperChunkSize(out = new Vector3()) {
    return out.set(this.superChunkSizeX, this.superChunkSizeY, this.superChunkSizeZ)
  }

  getWorldSize(out = new Vector3()) {
    return out.set(this.worldSizeX, this.worldSizeY, this.worldSizeZ)
  }

  computeSuperChunkIndex(x: number, y: number, z: number) {
    const { worldSizeX, worldSizeY, worldSizeZ, worldSizeXY } = this
    // No negative indexes
    return (
      + (x + (worldSizeX >> 1))
      + (y + (worldSizeY >> 1)) * worldSizeX
      + (z + (worldSizeZ >> 1)) * worldSizeXY
    )
  }

  toIndexes(x: number, y: number, z: number, out = new Indexes()) {
    const {
      chunkSizeX,
      chunkSizeY,
      chunkSizeZ,
      chunkSizeXY,
      superChunkSizeX,
      superChunkSizeXY,
      superChunkVoxelSizeX,
      superChunkVoxelSizeY,
      superChunkVoxelSizeZ,
      worldSizeX,
      worldSizeY,
      worldSizeZ,
      worldSizeXY,
      worldVoxelSizeX,
      worldVoxelSizeY,
      worldVoxelSizeZ,
    } = this

    const halfWorldVoxelSizeX = worldVoxelSizeX >> 1
    const halfWorldVoxelSizeY = worldVoxelSizeY >> 1
    const halfWorldVoxelSizeZ = worldVoxelSizeZ >> 1
    if (x < -halfWorldVoxelSizeX || x >= halfWorldVoxelSizeX) {
      throw new Error(`X coordinate out of bounds: ${x}, interval: (-${halfWorldVoxelSizeX} incl., ${halfWorldVoxelSizeX} excl.)`)
    }
    if (y < -halfWorldVoxelSizeY || y >= halfWorldVoxelSizeY) {
      throw new Error(`Y coordinate out of bounds: ${y}, interval: (-${halfWorldVoxelSizeY} incl., ${halfWorldVoxelSizeY} excl.)`)
    }
    if (z < -halfWorldVoxelSizeZ || z >= halfWorldVoxelSizeZ) {
      throw new Error(`Z coordinate out of bounds: ${z}, interval: (-${halfWorldVoxelSizeZ} incl., ${halfWorldVoxelSizeZ} excl.)`)
    }

    // Superchunk index
    const superChunkIndexX = Math.floor(x / superChunkVoxelSizeX)
    const superChunkIndexY = Math.floor(y / superChunkVoxelSizeY)
    const superChunkIndexZ = Math.floor(z / superChunkVoxelSizeZ)

    const localXInSuperChunk = x - superChunkIndexX * superChunkVoxelSizeX
    const localYInSuperChunk = y - superChunkIndexY * superChunkVoxelSizeY
    const localZInSuperChunk = z - superChunkIndexZ * superChunkVoxelSizeZ

    const chunkIndexX = Math.floor(localXInSuperChunk / this.chunkSizeX)
    const chunkIndexY = Math.floor(localYInSuperChunk / this.chunkSizeY)
    const chunkIndexZ = Math.floor(localZInSuperChunk / this.chunkSizeZ)

    // Local coordinates within the chunk
    const voxelIndexX = localXInSuperChunk - chunkIndexX * chunkSizeX
    const voxelIndexY = localYInSuperChunk - chunkIndexY * chunkSizeY
    const voxelIndexZ = localZInSuperChunk - chunkIndexZ * chunkSizeZ

    const voxelIndex = +voxelIndexX
      + voxelIndexY * chunkSizeX
      + voxelIndexZ * chunkSizeXY

    const chunkIndex =
      + chunkIndexX
      + chunkIndexY * superChunkSizeX
      + chunkIndexZ * superChunkSizeXY

    // No negative indexes
    const superChunkIndex =
      + (superChunkIndexX + (worldSizeX >> 1))
      + (superChunkIndexY + (worldSizeY >> 1)) * worldSizeX
      + (superChunkIndexZ + (worldSizeZ >> 1)) * worldSizeXY

    out.set(superChunkIndex, chunkIndex, voxelIndex)

    return out
  }

  fromIndexes(superChunkIndex: number, chunkIndex: number, voxelIndex: number, out = new Vector3()) {
    const {
      chunkSizeX,
      chunkSizeY,
      chunkSizeZ,
      chunkSizeXY,
      chunkSizeXYZ,
      superChunkSizeX,
      superChunkSizeXY,
      superChunkSizeXYZ,
      superChunkVoxelSizeX,
      superChunkVoxelSizeY,
      superChunkVoxelSizeZ,
      worldSizeX,
      worldSizeY,
      worldSizeZ,
      worldSizeXY,
      worldSizeXYZ,
    } = this

    if (superChunkIndex < 0 || superChunkIndex >= worldSizeXYZ) {
      const f = formatNumberWithSeparator
      throw new Error(`Superchunk index out of bounds: ${f(superChunkIndex)}, size: ${f(worldSizeXYZ)}\nReceived: ${superChunkIndex}, ${chunkIndex}, ${voxelIndex}`)
    }

    if (chunkIndex < 0 || chunkIndex >= superChunkSizeXYZ) {
      const f = formatNumberWithSeparator
      throw new Error(`Chunk index out of bounds: ${f(chunkIndex)}, size: ${f(superChunkSizeXYZ)}\nReceived: ${superChunkIndex}, ${chunkIndex}, ${voxelIndex}`)
    }

    if (voxelIndex < 0 || voxelIndex >= chunkSizeXYZ) {
      const f = formatNumberWithSeparator
      throw new Error(`Voxel index out of bounds: ${f(voxelIndex)}, size: ${f(chunkSizeXYZ)}\nReceived: ${superChunkIndex}, ${chunkIndex}, ${voxelIndex}`)
    }

    let n = 0

    n = superChunkIndex
    let superChunkIndexZ = Math.floor(n / worldSizeXY)
    n -= superChunkIndexZ * worldSizeXY
    let superChunkIndexY = Math.floor(n / worldSizeX)
    n -= superChunkIndexY * worldSizeX
    let superChunkIndexX = n

    // No negative indexes
    superChunkIndexX -= worldSizeX >> 1
    superChunkIndexY -= worldSizeY >> 1
    superChunkIndexZ -= worldSizeZ >> 1

    n = chunkIndex
    const chunkIndexZ = Math.floor(n / superChunkSizeXY)
    n -= chunkIndexZ * superChunkSizeXY
    const chunkIndexY = Math.floor(n / superChunkSizeX)
    n -= chunkIndexY * superChunkSizeX
    const chunkIndexX = n

    n = voxelIndex
    const voxelIndexZ = Math.floor(n / chunkSizeXY)
    n -= voxelIndexZ * chunkSizeXY
    const voxelIndexY = Math.floor(n / chunkSizeX)
    n -= voxelIndexY * chunkSizeX
    const voxelIndexX = n

    const x = superChunkIndexX * superChunkVoxelSizeX + chunkIndexX * chunkSizeX + voxelIndexX
    const y = superChunkIndexY * superChunkVoxelSizeY + chunkIndexY * chunkSizeY + voxelIndexY
    const z = superChunkIndexZ * superChunkVoxelSizeZ + chunkIndexZ * chunkSizeZ + voxelIndexZ

    out.set(x, y, z)

    return out
  }
}
