import { BufferGeometry, ColorRepresentation, LineBasicMaterial, LineSegments, Material, Vector3 } from 'three';
import { Vector2Declaration } from 'some-utils-ts/declaration';
declare const defaultPointsProps: {
    lineHeight: number;
    height: number;
    width: number;
    align: Vector2Declaration;
};
declare const defaultHersheyLineProps: {
    color: ColorRepresentation;
    pivot: Vector2Declaration;
    size: number;
    helper: boolean | ColorRepresentation;
    helperOpacity: number;
};
export declare function getHersheyPoints(text: string, { lineHeight, height, width, align, size, }?: {
    lineHeight?: number | undefined;
    height?: number | undefined;
    width?: number | undefined;
    align?: Vector2Declaration | undefined;
    size?: number | undefined;
}): {
    textWidth: number;
    textHeight: number;
    points: Vector3[];
};
type HersheyLineProps = Partial<typeof defaultHersheyLineProps & typeof defaultPointsProps>;
/**
 * Usage:
 * ```
 * const text = new HersheyLine('Hello,\nworld!\n123#!?', {
 *   width: 5.5,
 *   height: 6,
 *   align: [0, 1], // top-left
 *   pivot: [0, 1], // top-left
 *   helper: 'cyan'
 * })
 * ```
 */
export declare class HersheyText<TMaterial extends Material = LineBasicMaterial> extends LineSegments<BufferGeometry, TMaterial> {
    width: number;
    height: number;
    constructor(text: string, incomingProps?: HersheyLineProps, material?: TMaterial);
}
export {};
