import { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { Tick } from 'some-utils-ts/ticker';
import { DestroyableObject } from 'some-utils-ts/types';
import { PassMetadata, PassType, PipelineBase } from './types';
/**
 * A basic rendering pipeline that still allows for some customization. Already includes:
 * - Main render pass
 * - Gizmo render pass
 * - Outline pass
 * - Output pass
 * - FXAA pass
 *
 * The passes are sorted by type and insertOrder.
 * Adding a pass will automatically sort the passes.
 *
 * Example: adding an AO pass:
 * ```
 * const aoPass = new GTAOPass(scene, camera)
 * pipeline.insertPass(aoPass, { type: PassType.PostProcessing })
 * ```
 *
 * NOTE: Every object in the scene trees that has an `onTick` method will have it called before rendering.
 */
export declare class BasicPipeline implements PipelineBase {
    composer: EffectComposer;
    basicPasses: {
        mainRender: RenderPass;
        gizmoRender: RenderPass;
        outline: OutlinePass;
        output: OutputPass;
        fxaa: ShaderPass;
        smaa: SMAAPass;
    };
    passMap: Map<Pass, PassMetadata>;
    get passes(): Pass[];
    constructor(renderer: WebGLRenderer, scene: Scene, gizmoScene: Scene, camera: PerspectiveCamera);
    /**
     * Sort the passes internally.
     */
    sortPasses(): this;
    getPassesByType(type: PassType): Generator<readonly [Pass, PassMetadata], void, unknown>;
    /**
     * Example: adding an AO pass:
     * ```
     * const aoPass = new GTAOPass(three.scene, three.camera)
     * pipeline.addPass(aoPass, { type: PassType.PostProcessing })
     * ```
     */
    addPass(pass: Pass, { type, insertOrder, }?: Partial<PassMetadata>): DestroyableObject;
    removePass(pass: Pass): boolean;
    setSize(width: number, height: number, pixelRatio: number): void;
    setScene(scene: Scene): void;
    render(tick: Tick): void;
    getPassesInfo(): string;
}
//# sourceMappingURL=BasicPipeline.d.ts.map