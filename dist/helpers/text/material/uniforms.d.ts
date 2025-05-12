import { Matrix4, Vector2 } from 'three';
import { TextHelperAtlas } from '../atlas';
import { TextHelperData } from '../data';
import { Options } from '../types';
export type TextUniforms = ReturnType<typeof createTextUniforms>;
export declare function createTextUniforms(userOptions: Options, data: TextHelperData, atlas: TextHelperAtlas): {
    uCameraMatrix: {
        value: Matrix4;
    };
    uOrientation: {
        value: import("../types").Orientation;
    };
    uTextOffset: {
        value: Vector2;
    };
    uPlaneSize: {
        value: Vector2;
    };
    uCharSize: {
        value: Vector2;
    };
    uLineLength: {
        value: number;
    };
    uLineCount: {
        value: number;
    };
    uAtlasCharGrid: {
        value: Vector2;
    };
    uDataStrideHeader: {
        value: number;
    };
    uDataStride: {
        value: number;
    };
    uDataTexture: {
        value: import("three").DataTexture;
    };
    uDataTextureSize: {
        value: Vector2;
    };
    uBoxBorderWidth: {
        value: number;
    };
};
//# sourceMappingURL=uniforms.d.ts.map