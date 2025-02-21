import { Box3, Vector3, Vector3Like } from 'three';
import { Direction } from './core';
import { Face } from './face';
import { World } from './world';
import { WorldIndexes } from './world-metrics';
export declare const defaultVoxelIsFullDelegate: (data: DataView) => boolean;
type WorldMountState = {
    world: World;
    superChunkIndex: number;
    chunkIndex: number;
    position: Vector3;
    adjacentChunksIndexes: readonly WorldIndexes[];
};
/**
 * Represents a chunk of voxels.
 *
 * Chunk are not necessarily cubes, they can have different sizes in each dimension.
 */
export declare class Chunk {
    readonly sizeX: number;
    readonly sizeY: number;
    readonly sizeZ: number;
    readonly sizeXY: number;
    readonly sizeXYZ: number;
    readonly voxelStateByteSize: number;
    readonly voxelState: ArrayBuffer;
    get size(): Vector3;
    mountState: WorldMountState | null;
    constructor(size?: number | Vector3Like, voxelStateByteSize?: number);
    mount(world: World, superChunkIndex: number, chunkIndex: number): void;
    unmount(): void;
    getAdjacentChunk(direction: Direction): Chunk | null;
    getSize(out?: Vector3): Vector3;
    getVoxelStateAtIndex(index: number): DataView;
    /**
     * Returns the voxel state at the given coordinates. Coordinates should be within
     * the bounds of the chunk [(0, 0, 0), (sizeX, sizeY, sizeZ)].
     */
    getVoxelState(p: Vector3Like): DataView;
    getVoxelState(x: number, y: number, z: number): DataView;
    voxelStates(): Generator<DataView<ArrayBuffer>, void, unknown>;
    computeBounds({ voxelIsFullDelegate, out, }?: {
        voxelIsFullDelegate?: ((data: DataView) => boolean) | undefined;
        out?: Box3 | undefined;
    }): Box3;
    /**
     * Returns the voxel state at the given coordinates. If the coordinates are out
     * of bounds, returns null.
    */
    tryGetVoxelState(p: Vector3Like): DataView | null;
    tryGetVoxelState(x: number, y: number, z: number): DataView | null;
    /**
     * NOTE: the face object is reused for each iteration, so it should not be modified, nor stored.
     */
    voxelFaces({ offset: { x: offx, y: offy, z: offz }, voxelIsFullDelegate, 
    /**
     * If true, adjacent chunks will be ignored when checking if a face is visible.
     *
     * Useful when you want to render a single chunk in isolation.
     *
     * Defaults to false.
     */
    ignoreAdjacentChunks, }?: {
        offset?: Vector3Like | undefined;
        voxelIsFullDelegate?: ((data: DataView) => boolean) | undefined;
        ignoreAdjacentChunks?: boolean | undefined;
    }): Generator<Face, void, unknown>;
}
export {};
