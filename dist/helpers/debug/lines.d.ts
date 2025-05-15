import { LineBasicNodeMaterial } from 'three/webgpu';
import { Vector3Declaration } from 'some-utils-ts/declaration';
import { RectangleDeclaration } from 'some-utils-ts/math/geom/rectangle';
import { OneOrMany } from 'some-utils-ts/types';
import { BufferAttribute, BufferGeometry, ColorRepresentation, LineBasicMaterial, LineSegments } from 'three';
import { TransformDeclaration } from '../../declaration';
import { BaseManager } from './base';
import { Utils } from './shared';
type PositionDeclaration = 'end' | 'start' | 'middle' | number;
declare const defaultArrowOptions: {
    /**
     * Arrow size in world units.
     */
    size: number;
    /**
     * If true, the arrow size is proportional to the segment length.
     */
    proportionalSize: boolean;
    /**
     * Arrow position in the segment.
     * - `start`: at the start of the segment
     * - `end`: at the end of the segment
     * - `middle`: at the middle of the segment
     * - `number`: at a specific position in the segment (0 to 1)
     */
    position: OneOrMany<PositionDeclaration>;
    /**
     * Skip arrow if the segment is too small.
     */
    skip: undefined | true | "less-than-size" | number;
    /**
     * Type of the arrow. Useful for visualization.
     * - `single`: single arrow ">"
     * - `double`: double arro ">>"
     * - `triple`: triple arrow ">>>"
     */
    type: "single" | "double" | "triple";
    /**
     * Global scale of the arrow (not taken into account for the skip option, applied after).
     */
    scale: number;
};
type ArrowOptions = Partial<typeof defaultArrowOptions>;
type ArrowOptionsArg = boolean | OneOrMany<ArrowOptions>;
declare const defaultLineOptions: {
    /**
     * If a "key" is provided, the new segments will replace the previous ones with
     * the same key.
     *
     * This is useful to update some segments while keeping the others as they are.
     *
     * Note: the count of segments must be the same as the previous ones.
     */
    key: any;
    /**
     * Line color.
     */
    color: undefined | ColorRepresentation;
    /**
     * Line opacity.
     */
    opacity: number;
    /**
     * Arrow options.
     */
    arrow: ArrowOptionsArg;
};
type LineOptions = Partial<typeof defaultLineOptions>;
export declare class LinesManager extends BaseManager {
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
    segmentsArray(array: Float32Array, options?: LineOptions): this;
    segments(p: Vector3Declaration[], options?: LineOptions): this;
    line(p0: Vector3Declaration, p1: Vector3Declaration, options?: LineOptions): this;
    polyline(p: Vector3Declaration[], options?: LineOptions): this;
    polygon(p: Vector3Declaration[], options?: LineOptions): this;
    box(value: Parameters<typeof Utils.box>[0], options?: LineOptions): this;
    static rectDefaultOptions: {
        inset: number;
    };
    rect(value: RectangleDeclaration, options?: Partial<typeof LinesManager.rectDefaultOptions> & LineOptions): this;
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
    }, options?: LineOptions): this;
    static regularGridDefaults: {
        plane: "xy" | "xz" | "yz";
        size: number;
        subdivisions: number[];
        opacity: number | number[];
        color: ColorRepresentation | ColorRepresentation[];
    };
    regularGrid(options?: Partial<typeof LinesManager.regularGridDefaults>): this;
}
export {};
//# sourceMappingURL=lines.d.ts.map