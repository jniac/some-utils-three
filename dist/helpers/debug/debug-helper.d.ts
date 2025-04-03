import { BufferAttribute, BufferGeometry, ColorRepresentation, Group, LineBasicMaterial, LineSegments, Matrix4, Object3D, Points, PointsMaterial, Vector3 } from 'three';
import { LineBasicNodeMaterial } from 'three/webgpu';
import { RectangleDeclaration } from 'some-utils-ts/math/geom/rectangle';
import { OneOrMany } from 'some-utils-ts/types';
import { TransformDeclaration, Vector3Declaration } from '../../declaration';
import { SetTextOption, TextHelper } from '../text';
declare class Utils {
    static boxPoints: {
        p0: Vector3;
        p1: Vector3;
        p2: Vector3;
        p3: Vector3;
        p4: Vector3;
        p5: Vector3;
        p6: Vector3;
        p7: Vector3;
    };
    static boxDefaults: {
        inset: number;
        min: Vector3Declaration;
        max: Vector3Declaration;
        transform: TransformDeclaration | undefined;
    };
    static box(value: Partial<typeof Utils.boxDefaults>): typeof Utils;
}
declare class BaseManager {
    transformMatrix: Matrix4;
    applyTransform(...transforms: TransformDeclaration[]): void;
}
declare class PointsManager extends BaseManager {
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
    clear(): void;
    onTop(renderOrder?: number): this;
    points(p: Vector3Declaration[], { size: argSize, scale: argScale, color: argColor, shape: argShape, }?: {
        size?: number | undefined;
        scale?: number | undefined;
        color?: ColorRepresentation | undefined;
        shape?: "circle" | "ring" | "ring-thin" | "plus" | "plus-thin" | "plus-ultra-thin" | "square" | "cross" | undefined;
    }): this;
    box(value: Parameters<typeof Utils.box>[0], options?: Parameters<PointsManager['points']>[1]): this;
    point(p: Vector3Declaration, options?: Parameters<PointsManager['points']>[1]): this;
}
declare class LinesManager extends BaseManager {
    #private;
    static createParts({ nodeMaterial, lineCount: count, defaultColor, defaultOpacity, }?: {
        nodeMaterial?: boolean | undefined;
        lineCount?: number | undefined;
        defaultColor?: ColorRepresentation | undefined;
        defaultOpacity?: number | undefined;
    }): {
        count: number;
        defaults: {
            color: ColorRepresentation;
            opacity: number;
        };
        geometry: BufferGeometry<import("three").NormalBufferAttributes>;
        attributes: {
            position: BufferAttribute;
            color: BufferAttribute;
            aOpacity: BufferAttribute;
        };
        lines: LineSegments<BufferGeometry<import("three").NormalBufferAttributes>, LineBasicNodeMaterial | LineBasicMaterial, import("three").Object3DEventMap>;
    };
    state: {
        index: number;
    };
    parts: ReturnType<typeof LinesManager.createParts>;
    constructor(options?: Parameters<typeof LinesManager.createParts>[0]);
    applyTransform(...transforms: TransformDeclaration[]): void;
    clear(): void;
    onTop(renderOrder?: number): this;
    static defaultArrowOptions: {
        size: number;
        position: OneOrMany<"end" | "start" | "middle" | number>;
        skipSmallSegments: boolean;
        skipSmallSegmentsThreshold: "size" | number;
        type: "single" | "double" | "triple";
        scale: number;
    };
    static arrowPositionToNumber(position: typeof LinesManager.defaultArrowOptions['position'], length: number, size: number, arrowIndex: number, arrowRepeat: number): number;
    static defaultOptions: {
        color: undefined | ColorRepresentation;
        opacity: number;
        arrow: boolean | OneOrMany<Partial<typeof LinesManager.defaultArrowOptions>>;
    };
    segmentsArray(array: Float32Array, options?: Partial<typeof LinesManager.defaultOptions>): this;
    segments(p: Vector3Declaration[], options?: Partial<typeof LinesManager.defaultOptions>): this;
    line(p0: Vector3Declaration, p1: Vector3Declaration, options?: Parameters<DebugHelper['segments']>[1]): this;
    polyline(p: Vector3Declaration[], options?: Parameters<DebugHelper['segments']>[1]): this;
    polygon(p: Vector3Declaration[], options?: Parameters<DebugHelper['segments']>[1]): this;
    box(value: Parameters<typeof Utils.box>[0], options?: Parameters<DebugHelper['segments']>[1]): this;
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
    static regularGridDefaults: {
        size: number;
        subdivisions: number[];
        opacity: number | number[];
        color: ColorRepresentation | ColorRepresentation[];
    };
    regularGrid(options?: Partial<typeof LinesManager.regularGridDefaults>): this;
}
declare class TextsManager extends BaseManager {
    static createParts(options?: ConstructorParameters<typeof TextHelper>[0]): {
        count: number;
        textHelper: TextHelper;
    };
    state: {
        index: number;
    };
    parts: ReturnType<typeof TextsManager.createParts>;
    constructor(options?: Parameters<typeof TextsManager.createParts>[0]);
    applyTransform(...transforms: TransformDeclaration[]): void;
    clear(): this;
    onTop(renderOrder?: number): this;
    static textDefaults: {
        texts: ((i: number) => string) | string[];
    };
    texts(points: Vector3Declaration[], options?: Partial<typeof TextsManager.textDefaults> & SetTextOption): this;
    text(p: Vector3Declaration, text: string, options?: SetTextOption): this;
    textAt(index: number, text: string, options?: SetTextOption): this;
}
declare const defaultLinePointsOptions: {
    color: ColorRepresentation | undefined;
    size: number;
    shape: keyof typeof PointsManager.shapes;
    scale: number;
};
type LinePointsOptions = {
    points?: boolean | Partial<typeof defaultLinePointsOptions>;
};
declare class DebugHelper extends Group {
    static createParts(instance: DebugHelper, options?: Partial<{
        nodeMaterial: boolean;
        texts: ConstructorParameters<typeof TextsManager>[0];
        lines: ConstructorParameters<typeof LinesManager>[0];
        points: ConstructorParameters<typeof PointsManager>[0];
    }>): {
        pointsManager: PointsManager;
        linesManager: LinesManager;
        textsManager: TextsManager;
    };
    parts: ReturnType<typeof DebugHelper.createParts>;
    constructor(options?: Parameters<typeof DebugHelper.createParts>[1]);
    points(...args: Parameters<PointsManager['points']>): this;
    point(...args: Parameters<PointsManager['point']>): this;
    segments(...args: Parameters<LinesManager['segments']>): this;
    line(...args: Parameters<LinesManager['line']>): this;
    polyline(data: Parameters<LinesManager['polyline']>[0], options?: Parameters<LinesManager['polyline']>[1] & LinePointsOptions): this;
    polylines(data: Parameters<DebugHelper['polyline']>[0][], options?: Parameters<DebugHelper['polyline']>[1]): this;
    polygon(polygonArg: Parameters<LinesManager['polygon']>[0], options?: Parameters<LinesManager['polygon']>[1] & LinePointsOptions): this;
    polygons(data: Parameters<DebugHelper['polygon']>[0][], options?: Parameters<DebugHelper['polygon']>[1]): this;
    box(boxArg: Parameters<LinesManager['box']>[0], options?: Parameters<LinesManager['box']>[1] & LinePointsOptions): this;
    circle(...args: Parameters<LinesManager['circle']>): this;
    rect(...args: Parameters<LinesManager['rect']>): this;
    regularGrid(...args: Parameters<LinesManager['regularGrid']>): this;
    texts(...args: Parameters<TextsManager['texts']>): this;
    text(...args: Parameters<TextsManager['text']>): this;
    textAt(...args: Parameters<TextsManager['textAt']>): this;
    applyTransform(...transforms: TransformDeclaration[]): this;
    clear(): this;
    onTop(renderOrder?: number): this;
    globalExpose(name?: string): this;
    addTo(parent: Object3D | null): this;
}
/**
 * Static instance of DebugHelper for convenience. Can be used as a global debug draw.
 */
declare const debugHelper: DebugHelper;
export { debugHelper, DebugHelper };
