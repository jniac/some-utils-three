import { Euler, Matrix4, Object3D, Quaternion, Vector3 } from 'three';
import { Vector3Declaration } from 'some-utils-ts/declaration';
import { EulerDeclaration } from './euler';
declare class QTransform {
    position: Vector3;
    rotation: Quaternion;
    scale: Vector3;
    visible: boolean | undefined;
    getEuler(out?: Euler): Euler;
    get euler(): Euler;
    set euler(value: Euler);
}
declare function isTransform(value: any): value is QTransform;
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
declare function fromTransformDeclaration(props: TransformDeclaration, out: QTransform): QTransform;
declare function fromTransformDeclaration(props: TransformDeclaration, out: Matrix4): Matrix4;
declare function fromTransformDeclaration<T extends Object3D>(props: TransformDeclaration, out: T): T;
export { fromTransformDeclaration, isTransform, QTransform as Transform, TransformDeclaration };
//# sourceMappingURL=qtransform.d.ts.map