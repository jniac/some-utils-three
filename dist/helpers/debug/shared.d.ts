import { Vector3Declaration } from 'some-utils-ts/declaration';
import { Color, Vector3 } from 'three';
import { TransformDeclaration } from '../../declaration';
export declare const _v0: Vector3;
export declare const _v1: Vector3;
export declare const _v2: Vector3;
export declare const _v3: Vector3;
export declare const _v4: Vector3;
export declare const _v5: Vector3;
export declare const _v6: Vector3;
export declare const _c0: Color;
export declare class Utils {
    static boxPoints: Vector3[];
    static boxDefaults: {
        inset: number;
        transform: TransformDeclaration | undefined;
    };
    static boxMinMaxDefaults: {
        min: Vector3Declaration;
        max: Vector3Declaration;
    };
    static boxCenterSizeDefaults: {
        center: Vector3Declaration;
        size: Vector3Declaration;
    };
    static box(value: Partial<typeof Utils.boxDefaults> & (Partial<typeof Utils.boxMinMaxDefaults> | Partial<typeof Utils.boxCenterSizeDefaults>)): typeof Utils;
}
//# sourceMappingURL=shared.d.ts.map