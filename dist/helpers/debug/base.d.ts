import { Matrix4 } from 'three';
import { TransformDeclaration } from '../../declaration';
export declare class BaseManager {
    keyMap: Map<any, {
        index: number;
        count: number;
    }>;
    ensureKeyEntry(key: any, index: number, count: number): {
        index: number;
        count: number;
    };
    transformMatrix: Matrix4;
    applyTransform(...transforms: TransformDeclaration[]): void;
}
//# sourceMappingURL=base.d.ts.map