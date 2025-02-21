import { Box3, Vector3Like } from 'three';
import { Chunk } from './chunk';
import { WorldIndexes, WorldMetrics } from './world-metrics';
declare const defaultWorldProps: {
    metrics: WorldMetrics;
    voxelStateByteSize: number;
};
export declare class World {
    metrics: WorldMetrics;
    voxelStateByteSize: number;
    superChunks: Map<number, Map<number, Chunk>>;
    emptyVoxelState: DataView;
    constructor(props?: Partial<typeof defaultWorldProps>);
    computeChunkCount(): number;
    enumerateChunks(): Generator<{
        superChunkIndex: number;
        chunkIndex: number;
        chunk: Chunk;
    }, void, unknown>;
    computeVoxelBounds({ voxelIsFullDelegate, out, }?: {
        voxelIsFullDelegate?: ((data: DataView) => boolean) | undefined;
        out?: Box3 | undefined;
    }): Box3;
    computeChunkBounds({ out, }?: {
        out?: Box3 | undefined;
    }): Box3;
    /**
     * Returns the chunk at the given "chunk" coordinates. If the chunk does not exist,
     * null is returned.
     *
     * NOTE: To get the "surrounding" chunk of a position, use {@link tryGetSurroundingChunkAt}.
     */
    tryGetChunk(p: Vector3Like): Chunk | null;
    tryGetChunk(x: number, y: number, z: number): Chunk | null;
    /**
     * Returns the "surrounding" chunk of the given position. If the chunk does not
     * exist, null is returned.
     */
    tryGetSurroundingChunkAt(x: number, y: number, z: number): Chunk | null;
    tryGetSurroundingChunkAt(p: Vector3Like): Chunk | null;
    tryGetChunkByIndexes(superChunkIndex: number, chunkIndex: number, voxelIndex?: number): Chunk | null;
    tryGetChunkByIndexes(indexes: WorldIndexes): Chunk | null;
    /**
     * Returns the voxel state at the given coordinates. Coordinates should be within
     * the bounds of the chunk.
     */
    getVoxelState(p: Vector3Like): DataView;
    getVoxelState(x: number, y: number, z: number): DataView;
    setVoxelState(p: Vector3Like, state: DataView): boolean;
    setVoxelState(x: number, y: number, z: number, state: DataView): boolean;
    /**
     * Enumerates all voxel faces of the chunks that intersect with the given bounds.
     */
    chunkVoxelFaces(bounds: Box3, { voxelIsFullDelegate, }?: {
        voxelIsFullDelegate?: ((data: DataView) => boolean) | undefined;
    }): Generator<import("./face").Face, void, unknown>;
}
export {};
