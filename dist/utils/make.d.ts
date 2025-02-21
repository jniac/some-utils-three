import { Color, ColorRepresentation, Matrix4 } from 'three';
import { TransformDeclaration } from '../declaration';
/**
 * Returns a matrix4 instance from the given transform declaration.
 *
 * NOTE: For performance reasons, the same instance is returned. The value must
 * be used immediately or copied / cloned if it needs to be stored.
 */
export declare function makeMatrix4(props: TransformDeclaration): Matrix4;
/**
 * Returns a color instance from the given color representation.
 *
 * NOTE: For performance reasons, the same instance is returned. The value must
 * be used immediately or copied / cloned if it needs to be stored.
 */
export declare function makeColor(color: ColorRepresentation): Color;
