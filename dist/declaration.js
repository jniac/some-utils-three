import { Euler, Matrix4, Quaternion, Vector2, Vector3, Vector4 } from 'three';
import * as agnostic from 'some-utils-ts/declaration';
import { fromEulerDeclaration } from './declaration/euler.js';
import { isMatrix4, isObject3D } from './is.js';
export * from './declaration/euler.js';
export * from './declaration/vector.js';
export * from './is.js';
export { fromAngleDeclaration, isVector2Declaration, isVector3Declaration, isVector4Declaration, toAngleDeclarationString, toVector2Declaration, toVector3Declaration, toVector4Declaration } from 'some-utils-ts/declaration';
export function fromVector2Declaration(arg, out = new Vector2()) {
    return agnostic.fromVector2Declaration(arg, out);
}
export function fromVector3Declaration(arg, out = new Vector3()) {
    return agnostic.fromVector3Declaration(arg, out);
}
export function fromVector4Declaration(arg, out = new Vector4()) {
    return agnostic.fromVector4Declaration(arg, out);
}
export const fromTransformDeclaration = (() => {
    const _position = new Vector3();
    const _rotation = new Euler();
    const _scale = new Vector3();
    const _quaternion = new Quaternion();
    function fromTransformDeclaration(props, out) {
        const { x = 0, y = 0, z = 0, position = { x, y, z }, rotationX = 0, rotationY = 0, rotationZ = 0, rotationOrder = 'XYZ', rotation = { x: rotationX, y: rotationY, z: rotationZ, order: rotationOrder }, scaleX = 1, scaleY = 1, scaleZ = 1, scaleScalar = 1, scale = { x: scaleX, y: scaleY, z: scaleZ }, } = props;
        if (isMatrix4(out)) {
            fromVector3Declaration(position, _position);
            fromEulerDeclaration(rotation, _rotation);
            fromVector3Declaration(scale, _scale).multiplyScalar(scaleScalar);
            _quaternion.setFromEuler(_rotation);
            return out.compose(_position, _quaternion, _scale);
        }
        if (isObject3D(out)) {
            fromVector3Declaration(position, out.position);
            fromEulerDeclaration(rotation, out.rotation);
            fromVector3Declaration(scale, out.scale).multiplyScalar(scaleScalar);
            return out;
        }
        throw new Error('Invalid out argument');
    }
    return fromTransformDeclaration;
})();
const _m0 = new Matrix4();
const _m1 = new Matrix4();
/**
 * Combines multiple transform declarations into a single matrix.
 *
 * NOTE: The returned matrix, if not provided, is reused for performance reasons.
 * Clone it if you need to keep it for later use.
 */
export function fromTransformDeclarations(transforms, out = _m0) {
    out.identity();
    const iterator = transforms[Symbol.iterator]();
    const first = iterator.next();
    if (first.done)
        return out; // Return identity matrix if no transforms
    fromTransformDeclaration(first.value, out);
    for (let entry = iterator.next(); !entry.done; entry = iterator.next()) {
        fromTransformDeclaration(entry.value, _m1);
        out.multiply(_m1);
    }
    return out;
}
//# sourceMappingURL=declaration.js.map