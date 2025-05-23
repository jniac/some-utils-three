import { Camera, Scene } from 'three';
import { Ticker } from 'some-utils-ts/ticker';
import { Destroyable } from 'some-utils-ts/types';
import { Pointer } from './pointer';
export declare enum ThreeContextType {
    WebGL = "webgl",
    WebGPU = "webgpu"
}
export type ThreeBaseContext = {
    type: ThreeContextType;
    width: number;
    height: number;
    aspect: number;
    pixelRatio: number;
    ticker: Ticker;
    pointer: Pointer;
    scene: Scene;
    camera: Camera;
    domElement: HTMLElement;
    domContainer: HTMLElement;
    skipRender: boolean;
    initialized: boolean;
    initialize: (domContainer: HTMLElement, pointerScope: HTMLElement) => Destroyable;
};
//# sourceMappingURL=types.d.ts.map