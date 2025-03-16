import { BufferAttribute, BufferGeometry, ColorRepresentation, Group, LineSegments, Object3D, Points, PointsMaterial } from 'three';
import { RectangleDeclaration } from 'some-utils-ts/math/geom/rectangle';
import { Vector3Declaration } from '../../declaration';
import { TextHelper } from '../text';
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
    static defaultOptions: {
        color: ColorRepresentation;
    };
    segmentsArray(p: Float32Array, options?: Partial<typeof LinesManager.defaultOptions>): this;
    segments(p: Vector3Declaration[], options?: Partial<typeof LinesManager.defaultOptions>): this;
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
    static circleQualityPresets: {
        low: number;
        medium: number;
        high: number;
        ultra: number;
    };
    circle({ center, axis, radius, quality, segments, }?: {
        center?: Vector3Declaration | undefined;
        axis?: Vector3Declaration | undefined;
        radius?: number | undefined;
        quality?: "low" | "medium" | "high" | "ultra" | undefined;
        segments?: number | undefined;
    }, options?: Parameters<DebugHelper['segments']>[1]): this;
}
declare class TextsManager {
    static createParts(count: number): {
        count: number;
        textHelper: TextHelper;
    };
    state: {
        index: number;
    };
    parts: ReturnType<typeof TextsManager.createParts>;
    constructor(count?: number);
    clear(): void;
    texts(points: Vector3Declaration[], { texts, color, size, backgroundColor, }?: {
        texts?: string[] | ((i: number) => string) | undefined;
        color?: ColorRepresentation | undefined;
        size?: number | undefined;
        backgroundColor?: ColorRepresentation | undefined;
    }): this;
    text(p: Vector3Declaration, text: string, options: Omit<Parameters<TextsManager['texts']>[1], 'texts'>): this;
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
        textsManager: TextsManager;
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
    circle(...args: Parameters<LinesManager['circle']>): this;
    rect(...args: Parameters<LinesManager['rect']>): this;
    texts(...args: Parameters<TextsManager['texts']>): this;
    text(...args: Parameters<TextsManager['text']>): this;
    clear(): this;
    onTop(value?: boolean): this;
    globalExpose(name?: string): this;
    addTo(parent: Object3D | null): this;
}
/**
 * Static instance of DebugHelper for convenience. Can be used as a global debug draw.
 */
declare const debugHelper: DebugHelper;
export { debugHelper, DebugHelper };
