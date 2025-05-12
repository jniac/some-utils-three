import { Color, CubeTexture, IUniform, Matrix3, Matrix4, Quaternion, Texture, Vector2, Vector3, Vector4 } from 'three';
type UniformValueType = number | Vector2 | Vector3 | Color | Vector4 | Quaternion | Matrix3 | Matrix4 | Texture | CubeTexture;
type UniformDeclaration = IUniform<UniformValueType[]> | IUniform<UniformValueType> | UniformValueType[] | UniformValueType;
/**
 * Little wrapper around a uniform value. Used to generate the declaration string.
 */
export declare class UniformWrapper<T> implements IUniform<T> {
    static from<T = any>(name: string, value: any): UniformWrapper<T>;
    name: string;
    target: {
        value: T;
    };
    get value(): T;
    constructor(name: string, target: {
        value: T;
    });
    computeDeclaration(): string;
}
export type Uniforms = Record<string, UniformDeclaration>;
export {};
//# sourceMappingURL=uniforms.d.ts.map