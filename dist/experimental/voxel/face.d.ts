import { Vector3 } from 'three';
import { Direction } from './core';
export declare class Face {
    position: Vector3;
    direction: Direction;
    tangent: Direction;
    constructor(position: Vector3, direction: Direction, tangent?: Direction);
    clone(): this;
    positionToArray<T extends number[] | Float32Array>(out: T, offset?: number): T;
    normalToArray<T extends number[] | Float32Array>(out: T, offset?: number): T;
}
//# sourceMappingURL=face.d.ts.map