import { Vector3 } from 'three';
export declare class WorldIndexes extends Vector3 {
    get superChunk(): number;
    get chunk(): number;
    get voxel(): number;
}
export declare class WorldMetrics {
    readonly chunkSizeX: number;
    readonly chunkSizeY: number;
    readonly chunkSizeZ: number;
    readonly chunkSizeXY: number;
    readonly chunkSizeXYZ: number;
    readonly superChunkSizeX: number;
    readonly superChunkSizeY: number;
    readonly superChunkSizeZ: number;
    readonly superChunkSizeXY: number;
    readonly superChunkSizeXYZ: number;
    readonly superChunkVoxelSizeX: number;
    readonly superChunkVoxelSizeY: number;
    readonly superChunkVoxelSizeZ: number;
    readonly worldSizeX: number;
    readonly worldSizeY: number;
    readonly worldSizeZ: number;
    readonly worldSizeXY: number;
    readonly worldSizeXYZ: number;
    readonly worldVoxelSizeX: number;
    readonly worldVoxelSizeY: number;
    readonly worldVoxelSizeZ: number;
    readonly worldVoxelSizeXY: number;
    readonly worldVoxelSizeXYZ: number;
    get chunkSize(): Vector3;
    get superChunkSize(): Vector3;
    constructor(chunkSizeX: number, chunkSizeY: number, chunkSizeZ: number, superChunkSizeX: number, superChunkSizeY: number, superChunkSizeZ: number, worldSizeX: number, worldSizeY: number, worldSizeZ: number);
    clone(): WorldMetrics;
    getChunkSize(out?: Vector3): Vector3;
    getSuperChunkSize(out?: Vector3): Vector3;
    getWorldSize(out?: Vector3): Vector3;
    computeSuperChunkIndex(x: number, y: number, z: number): number;
    toIndexes(x: number, y: number, z: number, out?: WorldIndexes): WorldIndexes;
    fromIndexes(superChunkIndex: number, chunkIndex: number, voxelIndex: number, out?: Vector3): Vector3;
    getAdjacentChunkIndexes(superChunkIndex: number, chunkIndex: number): readonly [WorldIndexes, WorldIndexes, WorldIndexes, WorldIndexes, WorldIndexes, WorldIndexes];
}
