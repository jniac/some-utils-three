import { BufferGeometry, Group, Line, LineBasicMaterial, Matrix4, Uniform, Vector4 } from 'three';
declare class AbstractFalloff<Props> extends Group {
    props: Props;
    setupUniforms({ value: matrix }: Uniform<Matrix4>, { value: vector }: Uniform<Vector4>): void;
    init(props: Props): void;
    setup(): void;
    set(props: Partial<Props>): void;
}
declare const defaultCircleFalloffProps: {
    radius: number;
    falloff: number;
};
export declare class CircleFalloff extends AbstractFalloff<typeof defaultCircleFalloffProps> {
    static glsl: string;
    parts: {
        circle0: Line<BufferGeometry<import("three").NormalBufferAttributes>, LineBasicMaterial, import("three").Object3DEventMap>;
        circle1: Line<BufferGeometry<import("three").NormalBufferAttributes>, LineBasicMaterial, import("three").Object3DEventMap>;
    };
    get radius(): number;
    set radius(value: number);
    get falloff(): number;
    set falloff(value: number);
    constructor(props?: Partial<typeof CircleFalloff.prototype.props>);
    setupUniforms(matrix: Uniform<Matrix4>, vector: Uniform<Vector4>): void;
    setup(): void;
}
declare const defaultManhattanBox2FalloffProps: {
    width: number;
    height: number;
    falloff: number;
};
export declare class ManhattanBox2Falloff extends AbstractFalloff<typeof defaultManhattanBox2FalloffProps> {
    static glsl: string;
    parts: {
        box0: Line<BufferGeometry<import("three").NormalBufferAttributes>, LineBasicMaterial, import("three").Object3DEventMap>;
        box1: Line<BufferGeometry<import("three").NormalBufferAttributes>, LineBasicMaterial, import("three").Object3DEventMap>;
    };
    constructor(props?: Partial<typeof ManhattanBox2Falloff.prototype.props>);
    setupUniforms(matrix: Uniform<Matrix4>, vector: Uniform<Vector4>): void;
    setup(): void;
}
export {};
//# sourceMappingURL=falloffs.d.ts.map