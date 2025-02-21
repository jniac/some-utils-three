import { Vector3 } from 'three';
export declare enum Axis {
    X = 0,
    Y = 2,
    Z = 4
}
export declare enum Direction {
    /**
     * Right (X+)
     */
    R = 0,
    /**
     * Left (X-)
     */
    L = 1,
    /**
     * Up (Y+)
     */
    U = 2,
    /**
     * Down (Y-)
     */
    D = 3,
    /**
     * Forward (Z+)
     */
    F = 4,
    /**
     * Backward (Z-)
     */
    B = 5
}
export declare enum DirectionFlags {
    None = 0,
    All = 63,
    R = 1,
    L = 2,
    U = 4,
    D = 8,
    F = 16,
    B = 32
}
export declare const defaultDirectionTangent: Record<Direction, Direction>;
export declare const defaultDirectionBitangent: Direction[];
export declare const directionVectors: Vector3[];
export declare function oppositeDirection(dir: Direction): Direction;
export declare function directionToVector(dir: Direction): Vector3;
export declare const CHUNK_COORDS_SIZE = 1624;
export declare function toChunkCoordsKey(x: number, y: number, z: number): number;
export declare function fromChunkCoordsKey(key: number, out?: Vector3): Vector3;
