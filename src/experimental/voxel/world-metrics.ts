import { Vector3 } from 'three'

export class WorldIndexes extends Vector3 {
  get region() { return this.x }
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

  readonly regionSizeX: number
  readonly regionSizeY: number
  readonly regionSizeZ: number
  readonly regionSizeXY: number
  readonly regionSizeXYZ: number

  readonly regionVoxelSizeX: number
  readonly regionVoxelSizeY: number
  readonly regionVoxelSizeZ: number

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
  get regionSize() { return this.getRegionSize() }

  constructor(
    chunkSizeX: number,
    chunkSizeY: number,
    chunkSizeZ: number,
    regionSizeX: number,
    regionSizeY: number,
    regionSizeZ: number,
    worldSizeX: number,
    worldSizeY: number,
    worldSizeZ: number
  ) {
    this.chunkSizeX = chunkSizeX
    this.chunkSizeY = chunkSizeY
    this.chunkSizeZ = chunkSizeZ
    this.chunkSizeXY = chunkSizeX * chunkSizeY
    this.chunkSizeXYZ = chunkSizeX * chunkSizeY * chunkSizeZ

    this.regionSizeX = regionSizeX
    this.regionSizeY = regionSizeY
    this.regionSizeZ = regionSizeZ
    this.regionSizeXY = regionSizeX * regionSizeY
    this.regionSizeXYZ = regionSizeX * regionSizeY * regionSizeZ

    this.regionVoxelSizeX = this.regionSizeX * this.chunkSizeX
    this.regionVoxelSizeY = this.regionSizeY * this.chunkSizeY
    this.regionVoxelSizeZ = this.regionSizeZ * this.chunkSizeZ

    this.worldSizeX = worldSizeX
    this.worldSizeY = worldSizeY
    this.worldSizeZ = worldSizeZ
    this.worldSizeXY = worldSizeX * worldSizeY
    this.worldSizeXYZ = worldSizeX * worldSizeY * worldSizeZ

    this.worldVoxelSizeX = this.worldSizeX * this.regionVoxelSizeX
    this.worldVoxelSizeY = this.worldSizeY * this.regionVoxelSizeY
    this.worldVoxelSizeZ = this.worldSizeZ * this.regionVoxelSizeZ
    this.worldVoxelSizeXY = this.worldVoxelSizeX * this.worldVoxelSizeY
    this.worldVoxelSizeXYZ = this.worldVoxelSizeX * this.worldVoxelSizeY * this.worldVoxelSizeZ
  }

  clone() {
    return new WorldMetrics(
      this.chunkSizeX,
      this.chunkSizeY,
      this.chunkSizeZ,
      this.regionSizeX,
      this.regionSizeY,
      this.regionSizeZ,
      this.worldSizeX,
      this.worldSizeY,
      this.worldSizeZ,
    )
  }

  getChunkSize(out = new Vector3()) {
    return out.set(this.chunkSizeX, this.chunkSizeY, this.chunkSizeZ)
  }

  getRegionSize(out = new Vector3()) {
    return out.set(this.regionSizeX, this.regionSizeY, this.regionSizeZ)
  }

  getWorldSize(out = new Vector3()) {
    return out.set(this.worldSizeX, this.worldSizeY, this.worldSizeZ)
  }

  computeRegionIndex(x: number, y: number, z: number) {
    const { worldSizeX, worldSizeY, worldSizeZ, worldSizeXY } = this
    // No negative indexes
    return (
      + (x + (worldSizeX >> 1))
      + (y + (worldSizeY >> 1)) * worldSizeX
      + (z + (worldSizeZ >> 1)) * worldSizeXY
    )
  }

  toIndexes(x: number, y: number, z: number, out = new WorldIndexes()) {
    const {
      chunkSizeX,
      chunkSizeY,
      chunkSizeZ,
      chunkSizeXY,
      regionSizeX,
      regionSizeXY,
      regionVoxelSizeX,
      regionVoxelSizeY,
      regionVoxelSizeZ,
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
    const regionIndexX = Math.floor(x / regionVoxelSizeX)
    const regionIndexY = Math.floor(y / regionVoxelSizeY)
    const regionIndexZ = Math.floor(z / regionVoxelSizeZ)

    const localXInRegion = x - regionIndexX * regionVoxelSizeX
    const localYInRegion = y - regionIndexY * regionVoxelSizeY
    const localZInRegion = z - regionIndexZ * regionVoxelSizeZ

    const chunkIndexX = Math.floor(localXInRegion / this.chunkSizeX)
    const chunkIndexY = Math.floor(localYInRegion / this.chunkSizeY)
    const chunkIndexZ = Math.floor(localZInRegion / this.chunkSizeZ)

    // Local coordinates within the chunk
    const voxelIndexX = localXInRegion - chunkIndexX * chunkSizeX
    const voxelIndexY = localYInRegion - chunkIndexY * chunkSizeY
    const voxelIndexZ = localZInRegion - chunkIndexZ * chunkSizeZ

    const voxelIndex =
      + voxelIndexX
      + voxelIndexY * chunkSizeX
      + voxelIndexZ * chunkSizeXY

    const chunkIndex =
      + chunkIndexX
      + chunkIndexY * regionSizeX
      + chunkIndexZ * regionSizeXY

    // No negative indexes
    const regionIndex =
      + (regionIndexX + (worldSizeX >> 1))
      + (regionIndexY + (worldSizeY >> 1)) * worldSizeX
      + (regionIndexZ + (worldSizeZ >> 1)) * worldSizeXY

    out.set(regionIndex, chunkIndex, voxelIndex)

    return out
  }

  fromIndexes(regionIndex: number, chunkIndex: number, voxelIndex: number, out = new Vector3()) {
    const {
      chunkSizeX,
      chunkSizeY,
      chunkSizeZ,
      chunkSizeXY,
      chunkSizeXYZ,
      regionSizeX,
      regionSizeXY,
      regionSizeXYZ,
      regionVoxelSizeX,
      regionVoxelSizeY,
      regionVoxelSizeZ,
      worldSizeX,
      worldSizeY,
      worldSizeZ,
      worldSizeXY,
      worldSizeXYZ,
    } = this

    if (regionIndex < 0 || regionIndex >= worldSizeXYZ) {
      const f = formatNumberWithSeparator
      throw new Error(`Region index out of bounds: ${f(regionIndex)}, size: ${f(worldSizeXYZ)}\nReceived: ${regionIndex}, ${chunkIndex}, ${voxelIndex}`)
    }

    if (chunkIndex < 0 || chunkIndex >= regionSizeXYZ) {
      const f = formatNumberWithSeparator
      throw new Error(`Chunk index out of bounds: ${f(chunkIndex)}, size: ${f(regionSizeXYZ)}\nReceived: ${regionIndex}, ${chunkIndex}, ${voxelIndex}`)
    }

    if (voxelIndex < 0 || voxelIndex >= chunkSizeXYZ) {
      const f = formatNumberWithSeparator
      throw new Error(`Voxel index out of bounds: ${f(voxelIndex)}, size: ${f(chunkSizeXYZ)}\nReceived: ${regionIndex}, ${chunkIndex}, ${voxelIndex}`)
    }

    let n = 0

    n = regionIndex
    let regionIndexZ = Math.floor(n / worldSizeXY)
    n -= regionIndexZ * worldSizeXY
    let regionIndexY = Math.floor(n / worldSizeX)
    n -= regionIndexY * worldSizeX
    let regionIndexX = n

    // No negative indexes
    regionIndexX -= worldSizeX >> 1
    regionIndexY -= worldSizeY >> 1
    regionIndexZ -= worldSizeZ >> 1

    n = chunkIndex
    const chunkIndexZ = Math.floor(n / regionSizeXY)
    n -= chunkIndexZ * regionSizeXY
    const chunkIndexY = Math.floor(n / regionSizeX)
    n -= chunkIndexY * regionSizeX
    const chunkIndexX = n

    n = voxelIndex
    const voxelIndexZ = Math.floor(n / chunkSizeXY)
    n -= voxelIndexZ * chunkSizeXY
    const voxelIndexY = Math.floor(n / chunkSizeX)
    n -= voxelIndexY * chunkSizeX
    const voxelIndexX = n

    const x = regionIndexX * regionVoxelSizeX + chunkIndexX * chunkSizeX + voxelIndexX
    const y = regionIndexY * regionVoxelSizeY + chunkIndexY * chunkSizeY + voxelIndexY
    const z = regionIndexZ * regionVoxelSizeZ + chunkIndexZ * chunkSizeZ + voxelIndexZ

    out.set(x, y, z)

    return out
  }

  getAdjacentChunkIndexes(regionIndex: number, chunkIndex: number) {
    const {
      chunkSizeX,
      chunkSizeY,
      chunkSizeZ,
    } = this

    const { x, y, z } = this.fromIndexes(regionIndex, chunkIndex, 0)

    return [
      this.toIndexes(x + chunkSizeX, y, z), // Right
      this.toIndexes(x - chunkSizeX, y, z), // Left
      this.toIndexes(x, y + chunkSizeY, z), // Top
      this.toIndexes(x, y - chunkSizeY, z), // Bottom
      this.toIndexes(x, y, z + chunkSizeZ), // Front
      this.toIndexes(x, y, z - chunkSizeZ), // Back
    ] as const
  }
}
