import { BufferAttribute, BufferGeometry, ColorRepresentation, Group, Object3D, Points, PointsMaterial } from 'three';
import { TransformDeclaration, Vector3Declaration } from '../../declaration';
import { SetTextOption, TextHelper } from '../text';
import { BaseManager } from './base';
import { LinesManager } from './lines';
import { Utils } from './shared';
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
    points(p: Vector3Declaration[], { key, size: argSize, scale: argScale, color: argColor, shape: argShape, }?: {
        key?: any;
        size?: number | undefined;
        scale?: number | undefined;
        color?: ColorRepresentation | undefined;
        shape?: "square" | "circle" | "ring" | "ring-thin" | "plus" | "plus-thin" | "plus-ultra-thin" | "cross" | undefined;
    }): this;
    box(value: Parameters<typeof Utils.box>[0], options?: Parameters<PointsManager['points']>[1]): this;
    point(p: Vector3Declaration, options?: Parameters<PointsManager['points']>[1]): this;
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
//# sourceMappingURL=debug-helper.d.ts.map