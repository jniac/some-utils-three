import { BufferAttribute, BufferGeometry, ColorRepresentation, Points, PointsMaterial } from 'three';
import { Vector3Declaration } from 'some-utils-ts/declaration';
import { TransformDeclaration } from '../../declaration';
import { BaseManager } from './base';
import { Utils } from './shared';
export declare class PointsManager extends BaseManager {
    static shapes: {
        square: number;
        circle: number;
        ring: number;
        'ring-thin': number;
        plus: number;
        'plus-thin': number;
        'plus-ultra-thin': number;
        x: number;
        'x-thin': number;
        'x-ultra-thin': number;
    };
    static createParts({ pointCount: count, }?: {
        pointCount?: number | undefined;
    }): {
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
    constructor(options?: Parameters<typeof PointsManager.createParts>[0]);
    applyTransform(...transforms: TransformDeclaration[]): void;
    clear(): this;
    onTop(renderOrder?: number): this;
    points(p: Vector3Declaration[], { key, size: argSize, scale: argScale, color: argColor, shape: argShape, }?: {
        key?: any;
        size?: number | undefined;
        scale?: number | undefined;
        color?: ColorRepresentation | undefined;
        shape?: "square" | "circle" | "ring" | "ring-thin" | "plus" | "plus-thin" | "plus-ultra-thin" | "x" | "x-thin" | "x-ultra-thin" | undefined;
    }): this;
    box(value: Parameters<typeof Utils.box>[0], options?: Parameters<PointsManager['points']>[1]): this;
    point(p: Vector3Declaration, options?: Parameters<PointsManager['points']>[1]): this;
}
//# sourceMappingURL=points.d.ts.map