import { BufferAttribute, BufferGeometry, ColorRepresentation, Group, LineSegments, Object3D, Points, PointsMaterial } from 'three';
import { RectangleDeclaration } from 'some-utils-ts/math/geom/rectangle';
import { Vector3Declaration } from './declaration';
declare class PointsManager {
    static shapes: {
        square: number;
        circle: number;
        ring: number;
        'ring-thin': number;
        plus: number;
        'plus-thin': number;
        'plus-ultra-thin': number;
        cross: number;
    };
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
    onTop(value?: boolean): this;
    points(p: Vector3Declaration[], { size: argSize, scale: argScale, color: argColor, shape: argShape, }?: {
        size?: number | undefined;
        scale?: number | undefined;
        color?: ColorRepresentation | undefined;
        shape?: "square" | "circle" | "ring" | "ring-thin" | "plus" | "plus-thin" | "plus-ultra-thin" | "cross" | undefined;
    }): this;
    point(p: Vector3Declaration, options?: Parameters<DebugDraw['points']>[1]): this;
}
declare class LinesManager {
    #private;
    static createParts(count: number): {
        count: number;
        geometry: BufferGeometry<import("three").NormalBufferAttributes>;
        attributes: {
            position: BufferAttribute;
            color: BufferAttribute;
        };
        lines: LineSegments<BufferGeometry<import("three").NormalBufferAttributes>, PointsMaterial, import("three").Object3DEventMap>;
    };
    state: {
        index: number;
    };
    parts: ReturnType<typeof LinesManager.createParts>;
    constructor(count?: number);
    clear(): void;
    onTop(value?: boolean): this;
    segments(p: Vector3Declaration[], { color: argColor, }?: {
        color?: ColorRepresentation | undefined;
    }): this;
    line(p0: Vector3Declaration, p1: Vector3Declaration, options?: Parameters<DebugDraw['segments']>[1]): this;
    polyline(p: Vector3Declaration[], options?: Parameters<DebugDraw['segments']>[1]): this;
    static boxDefaultOptions: {
        inset: number;
    };
    box(value: {
        min: Vector3Declaration;
        max: Vector3Declaration;
    }, options?: Partial<typeof LinesManager.boxDefaultOptions> & Parameters<DebugDraw['segments']>[1]): this;
    static rectDefaultOptions: {
        inset: number;
    };
    rect(value: RectangleDeclaration, options?: Partial<typeof LinesManager.rectDefaultOptions> & Parameters<DebugDraw['segments']>[1]): this;
}
declare class DebugDraw {
    group: Group<import("three").Object3DEventMap>;
    parts: {
        pointsManager: PointsManager;
        linesManager: LinesManager;
    };
    points(...args: Parameters<PointsManager['points']>): this;
    point(...args: Parameters<PointsManager['point']>): this;
    segments(...args: Parameters<LinesManager['segments']>): this;
    line(...args: Parameters<LinesManager['line']>): this;
    polyline(...args: Parameters<LinesManager['polyline']>): this;
    box(...args: Parameters<LinesManager['box']>): this;
    rect(...args: Parameters<LinesManager['rect']>): this;
    clear(): this;
    onTop(value?: boolean): this;
    addTo(parent: Object3D): this;
}
declare const instance: DebugDraw;
export { instance as DebugDraw };
