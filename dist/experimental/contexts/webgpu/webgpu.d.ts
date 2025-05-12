import { Camera, OrthographicCamera, PerspectiveCamera, PostProcessing, Scene, WebGPURenderer } from 'three/webgpu';
import { Ticker } from 'some-utils-ts/ticker';
import { Pointer } from '../pointer';
import { ThreeBaseContext, ThreeContextType } from '../types';
export declare class ThreeWebGPUContext implements ThreeBaseContext {
    type: ThreeContextType;
    width: number;
    height: number;
    pixelRatio: number;
    ticker: Ticker;
    pointer: Pointer;
    renderer: WebGPURenderer;
    perspectiveCamera: PerspectiveCamera;
    orhtographicCamera: OrthographicCamera;
    scene: Scene;
    postProcessing: PostProcessing;
    scenePass: import("three/tsl").ShaderNodeObject<import("three/webgpu").PassNode>;
    camera: Camera;
    domContainer: HTMLElement;
    domElement: HTMLElement;
    skipRender: boolean;
    private internal;
    get aspect(): number;
    constructor();
    setSize(size: Partial<{
        width: number;
        height: number;
        pixelRatio: number;
    }>): this;
    initialized: boolean;
    /**
     * Initialize the ThreeWebglContext.
     * @param domContainer The container element for the renderer
     * @param pointerScope The element to listen for pointer events on, defaults to the domContainer but sometimes you might want to listen for pointer events on a different element (eg: document.body).
     * @returns
     */
    initialize(domContainer: HTMLElement, pointerScope?: HTMLElement): this;
    renderFrame(): void;
    destroyed: boolean;
    destroy: () => void;
}
//# sourceMappingURL=webgpu.d.ts.map