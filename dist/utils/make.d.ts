import { Color, ColorRepresentation, Matrix4 } from 'three';
import { TransformDeclaration } from '../declaration';
/**
 * Returns a matrix4 instance from the given transform declaration.
 *
 * NOTE:
 * - For performance reasons, by default the same matrix instance is returned.
 * The value must be used immediately or copied / cloned if it needs to be stored.
 * - To get a new instance, pass a new matrix as the second argument.
 */
export declare function makeMatrix4(props: TransformDeclaration, out?: Matrix4): Matrix4;
/**
 * Returns a color instance from the given color representation.
 *
 * NOTE:
 * - For performance reasons, by default the same color instance is returned.
 * The value must be used immediately or copied / cloned if it needs to be stored.
 * - To get a new instance, pass a new color as the second argument.
 */
export declare function makeColor(color: ColorRepresentation, out?: Color): Color;
//# sourceMappingURL=make.d.ts.map