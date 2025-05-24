import { Euler, Quaternion, Vector3 } from 'three';
import { isMatrix4, isObject3D } from '../is.js';
import { fromEulerDeclaration } from './euler.js';
import { fromVector3Declaration } from './vector.js';
function doLerpTransforms(a, b, t, out) {
    out.position.lerpVectors(a.position, b.position, t);
    out.quaternion.slerpQuaternions(a.quaternion, b.quaternion, t);
    out.scale.lerpVectors(a.scale, b.scale, t);
    out.visible = t < .5 ? a.visible : b.visible;
}
class Transform {
    position = new Vector3();
    quaternion = new Quaternion();
    scale = new Vector3(1, 1, 1);
    visible = undefined;
    getRotation(out = new Euler()) {
        return out.setFromQuaternion(this.quaternion);
    }
    get rotation() {
        return this.getRotation();
    }
    set rotation(value) {
        this.quaternion.setFromEuler(value);
    }
    lerp(b, t) {
        doLerpTransforms(this, b, t, this);
        return this;
    }
    lerpTransforms(a, b, t) {
        doLerpTransforms(a, b, t, this);
        return this;
    }
    applyToMatrix4(out) {
        const { position, quaternion, scale } = this;
        return out.compose(position, quaternion, scale);
    }
}
function isTransform(value) {
    return value instanceof Transform;
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
    if (out === undefined || isTransform(out)) {
        out ??= new Transform();
        fromVector3Declaration(position, out.position);
        fromEulerDeclaration(rotation, out.rotation);
        fromVector3Declaration(scale, out.scale).multiplyScalar(scaleScalar);
        if (props.visible !== undefined)
            out.visible = props.visible;
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
export { fromTransformDeclaration, isTransform, Transform };
//# sourceMappingURL=transform.js.map