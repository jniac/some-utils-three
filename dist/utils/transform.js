import { Euler, Matrix3, Vector3 } from 'three';
import { fromEulerDeclaration, fromVector3Declaration } from '../declaration.js';
const defaultTransform = {
    position: new Vector3(0, 0, 0),
    rotation: new Euler(0, 0, 0, 'XYZ'),
    scale: new Vector3(1, 1, 1),
    visible: true,
};
const defaultTransformProps = {
    x: 0,
    y: 0,
    z: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    rotationOrder: 'XYZ',
    rotationUnit: 'rad',
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    scaleScalar: 1,
    // Extra:
    /**
     * If defined, the object will be moved as if the pivot was at the origin.
     *
     * NOTE: The pivot is expressed in the object's local space.
     *
     * Defaults to `undefined`.
     */
    pivot: undefined,
    /**
     * Applies only if defined.
     *
     * Defaults to `undefined`.
     */
    visible: undefined,
    /**
     * Applies only if defined.
     *
     * Defaults to `undefined`.
     */
    name: undefined,
    /**
     * Applies only if defined.
     *
     * Defaults to `undefined`.
     */
    parent: undefined,
    /**
     * If defined, all the properties will be copied to the object's `userData`.
     *
     * Defaults to `undefined`.
     */
    userData: undefined,
};
const _matrix3 = new Matrix3();
const _vector3 = new Vector3();
export function applyTransform(target, props) {
    const { x, y, z, position = new Vector3(x, y, z), rotationX, rotationY, rotationZ, rotationOrder, rotationUnit, rotation, scaleX, scaleY, scaleZ, scaleScalar, scale = new Vector3(scaleX, scaleY, scaleZ).multiplyScalar(scaleScalar), pivot, visible, name, parent, userData, } = { ...defaultTransformProps, ...props };
    fromVector3Declaration(position, target.position);
    fromEulerDeclaration(rotation ?? [rotationX, rotationY, rotationZ, rotationOrder, rotationUnit], target.rotation);
    fromVector3Declaration(scale, target.scale);
    if (pivot !== undefined) {
        target.updateMatrix();
        _matrix3.setFromMatrix4(target.matrix);
        fromVector3Declaration(pivot, _vector3).applyMatrix3(_matrix3);
        target.position.sub(_vector3);
    }
    if (visible !== undefined) {
        target.visible = visible;
    }
    if (name !== undefined) {
        target.name = name;
    }
    if (parent !== undefined) {
        if (parent !== target.parent) {
            if (parent === null) {
                target.removeFromParent();
            }
            else {
                parent.add(target);
            }
        }
    }
    if (userData !== undefined) {
        Object.assign(target.userData, userData);
    }
    return target;
}
export function getTransform(target) {
    return {
        position: target.position.clone(),
        rotation: target.rotation.clone(),
        scale: target.scale.clone(),
        visible: target.visible,
    };
}
