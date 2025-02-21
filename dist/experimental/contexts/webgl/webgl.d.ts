import { Object3D, PerspectiveCamera, Scene, Vector2, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Tick, Ticker } from 'some-utils-ts/ticker';
import { Destroyable } from 'some-utils-ts/types';
import { Vector3Declaration } from '../../../declaration';
import { UnifiedLoader } from '../../../loaders/unified-loader';
import { Pointer } from '../pointer';
import { ThreeBaseContext, ThreeContextType } from '../types';
import { BasicPipeline } from './pipelines/BasicPipeline';
/**
 * A context that provides a WebGLRenderer, a Scene, a Camera, and a Ticker.
 */
export declare class ThreeWebGLContext implements ThreeBaseContext {
    private static instances;
    static current(): ThreeWebGLContext;
    type: ThreeContextType;
    width: number;
    height: number;
    pixelRatio: number;
    renderer: WebGLRenderer;
    perspectiveCamera: PerspectiveCamera;
    orhtographicCamera: PerspectiveCamera;
    scene: Scene;
    gizmoScene: Scene;
    pointer: Pointer;
    skipRender: boolean;
    ticker: Ticker;
    pipeline: BasicPipeline;
    /** The current camera (perspective or ortho). */
    camera: PerspectiveCamera;
    private internal;
    get aspect(): number;
    get size(): Vector2;
    get fullSize(): Vector2;
    onTick: (...args: import("some-utils-ts/ticker").OnTickParameters) => import("some-utils-ts/types").DestroyableObject;
    onDestroy: (...items: Destroyable[]) => number;
    loader: UnifiedLoader;
    constructor();
    setScene(scene: Scene): void;
    useOrbitControls({ position, target, element, }?: {
        position?: Vector3Declaration | null | undefined;
        target?: Vector3Declaration | null | undefined;
        element?: string | HTMLElement | null | undefined;
    }): OrbitControls;
    initialized: boolean;
    initialize(domContainer: HTMLElement, pointerScope?: HTMLElement): this;
    destroyed: boolean;
    destroy: () => void;
    setSize(size: Partial<{
        width: number;
        height: number;
        pixelRatio: number;
    }>): this;
    renderFrame: (tick: Tick) => void;
    findAll(query: string | RegExp | ((object: any) => boolean)): Generator<Object3D<import("three").Object3DEventMap>, void, unknown>;
    find(query: string | RegExp | ((object: any) => boolean)): Object3D<import("three").Object3DEventMap> | null;
    isPartOfScene(object: Object3D | null): boolean;
}
