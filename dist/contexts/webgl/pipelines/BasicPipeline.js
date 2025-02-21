import { Vector2 } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { PassType } from 'xxx';
function isRenderPass(pass) {
    return pass.isRenderPass;
}
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
export class BasicPipeline {
    composer;
    basicPasses;
    passMap;
    get passes() { return this.composer.passes; }
    constructor(renderer, scene, gizmoScene, camera) {
        const composer = new EffectComposer(renderer);
        const passMap = new Map();
        const mainRender = new RenderPass(scene, camera);
        mainRender.clearAlpha = 0;
        passMap.set(mainRender, { type: PassType.Render, insertOrder: 0 });
        composer.addPass(mainRender);
        const gizmoRender = new RenderPass(gizmoScene, camera);
        passMap.set(gizmoRender, { type: PassType.GizmoRender, insertOrder: 0 });
        gizmoRender.clear = false;
        gizmoRender.clearDepth = false;
        composer.addPass(gizmoRender);
        const outline = new OutlinePass(new Vector2(), scene, camera);
        passMap.set(outline, { type: PassType.GizmoRender, insertOrder: 0 });
        composer.addPass(outline);
        const output = new OutputPass();
        passMap.set(output, { type: PassType.Output, insertOrder: 0 });
        composer.addPass(output);
        // FXAA: Fast Approximate Anti-Aliasing
        // https://github.com/mrdoob/three.js/blob/master/examples/webgl_postprocessing_fxaa.html#L144C5-L145C1
        // FXAA is engineered to be applied towards the end of engine post processing after conversion to low dynamic range and conversion to the sRGB color space for display.
        const fxaa = new ShaderPass(FXAAShader);
        passMap.set(fxaa, { type: PassType.Antialiasing, insertOrder: 0 });
        composer.addPass(fxaa);
        this.composer = composer;
        this.basicPasses = {
            mainRender,
            gizmoRender,
            outline,
            output,
            fxaa,
        };
        this.passMap = passMap;
    }
    /**
     * Sort the passes internally.
     */
    sortPasses() {
        const passes = [...this.passMap];
        for (const [pass] of passes) {
            this.composer.removePass(pass);
        }
        passes.sort((a, b) => {
            const ma = a[1];
            const mb = b[1];
            if (ma.type !== mb.type) {
                return ma.type - mb.type;
            }
            return ma.insertOrder - mb.insertOrder;
        });
        for (const [pass] of passes) {
            this.composer.addPass(pass);
        }
        return this;
    }
    *getPassesByType(type) {
        for (const [pass, metadata] of this.passMap) {
            if (metadata.type === type) {
                yield [pass, metadata];
            }
        }
    }
    /**
     * Example: adding an AO pass:
     * ```
     * const aoPass = new GTAOPass(three.scene, three.camera)
     * pipeline.addPass(aoPass, { type: PassType.PostProcessing })
     * ```
     */
    addPass(pass, { type = PassType.Render, insertOrder = undefined, } = {}) {
        if (insertOrder === undefined) {
            const existingPasses = [...this.getPassesByType(type)];
            insertOrder = (existingPasses.at(-1)?.[1]?.insertOrder ?? -1) + 1;
        }
        this.passMap.set(pass, { type, insertOrder });
        this.sortPasses();
        const destroy = () => this.removePass(pass);
        return { destroy };
    }
    removePass(pass) {
        if (!this.passMap.has(pass)) {
            console.warn('The pass is not in the pipeline.');
            return false;
        }
        this.passMap.delete(pass);
        this.composer.removePass(pass);
        return true;
    }
    setSize(width, height, pixelRatio) {
        this.composer.setSize(width, height);
        this.composer.setPixelRatio(pixelRatio);
        this.basicPasses.fxaa.uniforms['resolution'].value.set(1 / pixelRatio / width, 1 / pixelRatio / height);
    }
    setScene(scene) {
        const previousScene = this.basicPasses.mainRender.scene;
        for (const pass of this.composer.passes) {
            if (isRenderPass(pass)) {
                if (pass.scene === previousScene) {
                    pass.scene = scene;
                }
            }
        }
    }
    render(tick) {
        for (const pass of this.composer.passes) {
            if (isRenderPass(pass)) {
                pass.scene.traverseVisible(object => {
                    if ('onTick' in object) {
                        object.onTick(tick);
                    }
                });
            }
        }
        this.composer.render(tick.deltaTime);
    }
    getPassesInfo() {
        const lines = [`${this.constructor.name} passes info:`];
        const { composer, passMap } = this;
        for (const [passIndex, pass] of composer.passes.entries()) {
            const metadata = passMap.get(pass);
            if (!metadata) {
                lines.push(`- ${passIndex}: NO METADATA for ${pass.constructor.name}`);
            }
            else {
                lines.push(`- ${passIndex}: ${PassType[metadata.type]} (insertOrder: ${metadata.insertOrder}) ${pass.constructor.name}`);
            }
        }
        return lines.join('\n');
    }
}
