import { BufferAttribute, BufferGeometry, ColorRepresentation, Group, LineSegments, Object3D, Points, PointsMaterial } from 'three';
import { RectangleDeclaration } from 'some-utils-ts/math/geom/rectangle';
import { Vector3Declaration } from '../../declaration';
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
        shape?: "circle" | "cross" | "ring" | "ring-thin" | "plus" | "plus-thin" | "plus-ultra-thin" | "square" | undefined;
    }): this;
    point(p: Vector3Declaration, options?: Parameters<DebugHelper['points']>[1]): this;
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
    line(p0: Vector3Declaration, p1: Vector3Declaration, options?: Parameters<DebugHelper['segments']>[1]): this;
    polyline(p: Vector3Declaration[], options?: Parameters<DebugHelper['segments']>[1]): this;
    polygon(p: Vector3Declaration[], options?: Parameters<DebugHelper['segments']>[1]): this;
    static boxDefaultOptions: {
        inset: number;
    };
    box(value: {
        min: Vector3Declaration;
        max: Vector3Declaration;
    }, options?: Partial<typeof LinesManager.boxDefaultOptions> & Parameters<DebugHelper['segments']>[1]): this;
    static rectDefaultOptions: {
        inset: number;
    };
    rect(value: RectangleDeclaration, options?: Partial<typeof LinesManager.rectDefaultOptions> & Parameters<DebugHelper['segments']>[1]): this;
}
declare const defaultLinePointsOptions: {
    color: ColorRepresentation | undefined;
    size: number;
    shape: keyof typeof PointsManager.shapes;
};
type LinePointsOptions = {
    points?: boolean | Partial<typeof defaultLinePointsOptions>;
};
declare class DebugHelper extends Group {
    parts: {
        pointsManager: PointsManager;
        linesManager: LinesManager;
    };
    points(...args: Parameters<PointsManager['points']>): this;
    point(...args: Parameters<PointsManager['point']>): this;
    segments(...args: Parameters<LinesManager['segments']>): this;
    line(...args: Parameters<LinesManager['line']>): this;
    polyline(data: Parameters<LinesManager['polyline']>[0], options?: Parameters<LinesManager['polyline']>[1] & LinePointsOptions): this;
    polylines(data: Parameters<DebugHelper['polyline']>[0][], options?: Parameters<DebugHelper['polyline']>[1]): this;
    polygon(data: Parameters<LinesManager['polygon']>[0], options?: Parameters<LinesManager['polygon']>[1] & LinePointsOptions): this;
    polygons(data: Parameters<DebugHelper['polygon']>[0][], options?: Parameters<DebugHelper['polygon']>[1]): this;
    box(...args: Parameters<LinesManager['box']>): this;
    rect(...args: Parameters<LinesManager['rect']>): this;
    clear(): this;
    onTop(value?: boolean): this;
    addTo(parent: Object3D | null): this;
}
/**
 * Static instance of DebugHelper for convenience. Can be used as a global debug draw.
 */
declare const debugHelper: DebugHelper;
export { debugHelper, DebugHelper };
