import { ColorRepresentation, Group, Object3D } from 'three';
import { TransformDeclaration, Vector3Declaration } from '../../declaration';
import { SetTextOption, TextHelper } from '../text';
import { BaseManager } from './base';
import { LinesManager } from './lines';
import { PointsManager } from './points';
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
    userData: {
        helper: boolean;
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