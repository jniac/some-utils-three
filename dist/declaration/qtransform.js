import { Euler, Quaternion, Vector3 } from 'three';
import { isMatrix4, isObject3D } from '../is.js';
import { fromEulerDeclaration } from './euler.js';
import { fromVector3Declaration } from './vector.js';
class QTransform {
    position = new Vector3();
    rotation = new Quaternion();
    scale = new Vector3(1, 1, 1);
    visible = undefined;
    getEuler(out = new Euler()) {
        return out.setFromQuaternion(this.rotation);
    }
    get euler() {
        return this.getEuler();
    }
    set euler(value) {
        this.rotation.setFromEuler(value);
    }
}
function isTransform(value) {
    return value instanceof QTransform;
}
const _position = new Vector3();
const _rotation = new Euler();
const _scale = new Vector3();
const _quaternion = new Quaternion();
const defaultTransformDeclaration = {
    x: 0,
    y: 0,
    z: 0,
    position: undefined,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    rotationOrder: 'XYZ',
    rotation: undefined,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    scaleScalar: 1,
    scale: undefined,
    visible: undefined,
};
function fromTransformDeclaration(props, out) {
    const { x = 0, y = 0, z = 0, position = { x, y, z }, rotationX = 0, rotationY = 0, rotationZ = 0, rotationOrder = 'XYZ', rotation = { x: rotationX, y: rotationY, z: rotationZ, order: rotationOrder }, scaleX = 1, scaleY = 1, scaleZ = 1, scaleScalar = 1, scale = { x: scaleX, y: scaleY, z: scaleZ }, } = props;
    if (isTransform(props)) {
        fromVector3Declaration(props.position, _position);
        fromEulerDeclaration(props.rotation, _rotation);
        fromVector3Declaration(props.scale, _scale).multiplyScalar(scaleScalar);
    }
    else if (isMatrix4(out)) {
        fromVector3Declaration(position, _position);
        fromEulerDeclaration(rotation, _rotation);
        fromVector3Declaration(scale, _scale).multiplyScalar(scaleScalar);
        _quaternion.setFromEuler(_rotation);
        return out.compose(_position, _quaternion, _scale);
    }
    else if (isObject3D(out)) {
        fromVector3Declaration(position, out.position);
        fromEulerDeclaration(rotation, out.rotation);
        fromVector3Declaration(scale, out.scale).multiplyScalar(scaleScalar);
        return out;
    }
    throw new Error('Invalid out argument');
}
const _transform0 = createTransform();
const _transform1 = createTransform();
function lerpTransforms(a, b, t, out) {
    fromTransformDeclaration(a, _transform0);
    fromTransformDeclaration(b, _transform1);
    _position.lerpVectors(_transform0.position, _transform1.position, t);
    _rotation.slerpQuaternions(_quaternion.setFromEuler(_transform0.rotation), _quaternion.setFromEuler(_transform1.rotation), t);
    _scale.lerpVectors(_transform0.scale, _transform1.scale, t);
    if (isMatrix4(out)) {
        return out.compose(_position, _quaternion, _scale);
    }
    if (isObject3D(out)) {
        out.position.copy(_position);
        out.quaternion.copy(_quaternion);
        out.scale.copy(_scale);
        return out;
    }
    return Object.assign(out, {
        position: _position.clone(),
        rotation: _rotation.clone(),
        scale: _scale.clone(),
    });
}
export { fromTransformDeclaration, isTransform, QTransform as Transform };
//# sourceMappingURL=qtransform.js.map