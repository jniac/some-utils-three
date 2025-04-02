import { Vector2Declaration } from 'some-utils-ts/declaration';
import { ColorRepresentation, Vector2 } from 'three';
import { TransformDeclaration } from '../../declaration';
export declare const orientations: {
    readonly oriented: 0;
    readonly billboard: 1;
};
export type Orientation = (typeof orientations)[keyof typeof orientations];
export declare function solveOrientation(orientation: string | number): Orientation;
export declare const optionsDefaults: {
    textCount: number;
    lineLength: number;
    lineCount: number;
    charSize: Vector2;
    textSize: number;
    textOffset: Vector2Declaration;
    orientation: (keyof typeof orientations) | Orientation;
    textDefaults: SetTextOption;
};
export type Options = Partial<typeof optionsDefaults>;
/**
 * Byte size of the info:
 * #0:
 * - Lines count (1 byte)
 * - empty (3 bytes)
 * #1:
 * - Text Color (3 bytes)
 * - Text Opacity (1 byte)
 * #2:
 * - Background Color (3 bytes)
 * - Background Opacity (1 byte)
 * #3:
 * - size (4 bytes)
 *
 * Should be a multiple of 4.
 */
export declare const DATA_STRIDE_HEADER_BYTE_SIZE: number;
export type SetColorOptions = Partial<{
    /**
     * Defines the color of the text and background. Usefull when using the same
     * color for both with different opacity.
     */
    color: ColorRepresentation;
    /**
     * Defines the opacity of the text and background. Usefull when using the same
     * opacity for both with different color.
     */
    opacity: number;
    /**
     * The color of the text.
     */
    textColor: ColorRepresentation;
    /**
     * The opacity of the text.
     * @default 1
     */
    textOpacity: number;
    /**
     * The color of the background.
     */
    backgroundColor: ColorRepresentation;
    /**
     * The opacity of the background.
     * @default 0
     */
    backgroundOpacity: number;
}>;
export type SetTextOption = TransformDeclaration & SetColorOptions & Partial<{
    /**
     * Whether to trim the text before setting it.
     * @default false
     */
    trim: boolean;
    /**
     * The size of the text.
     * @default 1
     */
    size: number;
    /**
     * The size of the text.
     * @default 1
     */
    scale: number;
}>;
