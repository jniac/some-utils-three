import { Color, Matrix4 } from 'three';
import { fromTransformDeclaration } from '../declaration.js';
const _matrix4 = new Matrix4();
/**
 * Returns a matrix4 instance from the given transform declaration.
 *
 * NOTE: For performance reasons, the same instance is returned. The value must
 * be used immediately or copied / cloned if it needs to be stored.
 */
export function makeMatrix4(props) {
    return fromTransformDeclaration(props, _matrix4);
}
const _color = new Color();
/**
 * Returns a color instance from the given color representation.
 *
 * NOTE: For performance reasons, the same instance is returned. The value must
 * be used immediately or copied / cloned if it needs to be stored.
 */
export function makeColor(color) {
    return _color.set(color);
}
//# sourceMappingURL=make.js.map