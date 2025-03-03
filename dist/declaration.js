import { Euler, Quaternion, Vector2, Vector3, Vector4 } from 'three';
import * as agnostic from 'some-utils-ts/declaration';
import { angleScalars, fromAngleDeclaration, } from 'some-utils-ts/declaration';
import { isEuler, isMatrix4, isObject3D } from './is.js';
export * from './is.js';
export { fromAngleDeclaration, isVector2Declaration, isVector3Declaration, isVector4Declaration, toAngleDeclarationString, toVector2Declaration, toVector3Declaration, toVector4Declaration } from 'some-utils-ts/declaration';
function formatNumber(x, fractionDigits) {
    return x
        .toFixed(fractionDigits)
        .replace(/\.([0-9]+[1-9])?0+$/, (_, m0) => m0?.length > 0 ? `.${m0}` : '');
}
function isAngleUnit(arg) {
    return typeof arg === 'string' && /^(rad|deg|turn)$/.test(arg);
}
function isEulerOrder(arg) {
    return typeof arg === 'string' && /^(XYZ|XZY|YXZ|YZX|ZXY|ZYX)$/.test(arg);
}
export function fromVector2Declaration(arg, out = new Vector2()) {
    return agnostic.fromVector2Declaration(arg, out);
}
export function fromVector3Declaration(arg, out = new Vector3()) {
    return agnostic.fromVector3Declaration(arg, out);
}
export function fromVector4Declaration(arg, out = new Vector4()) {
    return agnostic.fromVector4Declaration(arg, out);
}
const defaultFromEulerDeclarationOptions = { defaultOrder: 'XYZ' };
export function fromEulerDeclaration(...args) {
    const parseArgs = () => {
        if (args.length === 1)
            return [args[0], defaultFromEulerDeclarationOptions, new Euler()];
        if (args.length === 2) {
            return isEuler(args[1])
                ? [args[0], defaultFromEulerDeclarationOptions, args[1]]
                : [args[0], args[1], new Euler()];
        }
        if (args.length === 3)
            return args;
        throw new Error('Invalid number of arguments');
    };
    const [arg, { defaultOrder }, out] = parseArgs();
    if (isEuler(arg)) {
        return out.copy(arg);
    }
    if (Array.isArray(arg)) {
        const [x, y, z, arg0, arg1] = arg;
        const unit = isAngleUnit(arg0) ? arg0 : isAngleUnit(arg1) ? arg1 : 'rad';
        const order = isEulerOrder(arg0) ? arg0 : isEulerOrder(arg1) ? arg1 : defaultOrder;
        return out.set(fromAngleDeclaration(x, unit), fromAngleDeclaration(y, unit), fromAngleDeclaration(z, unit), order);
    }
    const { x, y, z, order = defaultOrder, unit = 'rad' } = arg;
    return out.set(fromAngleDeclaration(x, unit), fromAngleDeclaration(y, unit), fromAngleDeclaration(z, unit), order);
}
export function toEulerDeclarationString(arg, unit = 'deg') {
    const { x, y, z, order } = fromEulerDeclaration(arg);
    const scalar = angleScalars[unit];
    const fd = {
        rad: 3,
        deg: 1,
        turn: 4,
    }[unit];
    const xStr = formatNumber(x / scalar, fd);
    const yStr = formatNumber(y / scalar, fd);
    const zStr = formatNumber(z / scalar, fd);
    return `[${xStr}, ${yStr}, ${zStr}, '${unit}', '${order}']`;
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
