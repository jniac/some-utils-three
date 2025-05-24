import { Euler, Matrix4, Object3D, Quaternion, Vector3 } from 'three';
import { Vector3Declaration } from 'some-utils-ts/declaration';
import { EulerDeclaration } from './euler';
declare class Transform {
    position: Vector3;
    quaternion: Quaternion;
    scale: Vector3;
    visible: boolean | undefined;
    getRotation(out?: Euler): Euler;
    get rotation(): Euler;
    set rotation(value: Euler);
    lerp(b: Transform, t: number): this;
    lerpTransforms(a: Transform, b: Transform, t: number): this;
    applyToMatrix4(out: Matrix4): Matrix4;
}
declare function isTransform(value: any): value is Transform;
declare const defaultTransformDeclaration: {
    x: number;
    y: number;
    z: number;
    position: Vector3Declaration | undefined;
    rotationX: number;
    rotationY: number;
    rotationZ: number;
    rotationOrder: Euler["order"];
    rotation: EulerDeclaration | undefined;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
    scaleScalar: number;
    scale: Vector3Declaration | undefined;
    visible: boolean | undefined;
};
type TransformDeclaration = Partial<typeof defaultTransformDeclaration>;
declare function fromTransformDeclaration(props: TransformDeclaration, out?: Transform): Transform;
declare function fromTransformDeclaration(props: TransformDeclaration, out: Matrix4): Matrix4;
declare function fromTransformDeclaration<T extends Object3D>(props: TransformDeclaration, out: T): T;
export { fromTransformDeclaration, isTransform, Transform, TransformDeclaration };
//# sourceMappingURL=transform.d.ts.map