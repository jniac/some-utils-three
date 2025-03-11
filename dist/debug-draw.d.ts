import { BufferAttribute, BufferGeometry, ColorRepresentation, Group, Points, PointsMaterial } from 'three';
import { Vector3Declaration } from './declaration';
declare class PointsManager {
    static createParts(count: number): {
        count: number;
        geometry: BufferGeometry<import("three").NormalBufferAttributes>;
        attributes: {
            position: BufferAttribute;
            color: BufferAttribute;
            aScale: BufferAttribute;
            aShape: BufferAttribute;
        };
        points: Points<BufferGeometry<import("three").NormalBufferAttributes>, PointsMaterial, import("three").Object3DEventMap>;
    };
    state: {
        index: number;
    };
    parts: ReturnType<typeof PointsManager.createParts>;
    constructor(count?: number);
    clear(): void;
    points(p: Vector3Declaration[], { size: argSize, scale: argScale, color: argColor, shape: argShape, }?: {
        size?: number | undefined;
        scale?: number | undefined;
        color?: ColorRepresentation | undefined;
        shape?: "square" | "circle" | "ring" | "ring-thin" | "plus" | "plus-thin" | "plus-ultra-thin" | "cross" | undefined;
    }): this;
    point(p: Vector3Declaration, options?: Parameters<DebugDraw['points']>[1]): this;
}
declare class DebugDraw {
    group: Group<import("three").Object3DEventMap>;
    parts: {
        pointsManager: PointsManager;
    };
    points(...args: Parameters<PointsManager['points']>): this;
    point(...args: Parameters<PointsManager['point']>): this;
    clear(): this;
    onTop(value?: boolean): this;
}
declare const instance: DebugDraw;
export { instance as DebugDraw };
