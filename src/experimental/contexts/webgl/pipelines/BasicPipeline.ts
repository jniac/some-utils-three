import { PerspectiveCamera, Scene, Vector2, WebGLRenderer } from 'three'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'


import { PassType, PipelineBase } from './PipelineBase'

type Props = {
  useStencil: boolean
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
export class BasicPipeline extends PipelineBase {
  basicPasses: {
    mainRender: RenderPass
    gizmoRender: RenderPass
    outline: OutlinePass
    output: OutputPass
    fxaa: ShaderPass
    smaa: SMAAPass
  }

  constructor(
    renderer: WebGLRenderer,
    scene: Scene,
    gizmoScene: Scene,
    camera: PerspectiveCamera,
    props: Props
  ) {
    super(renderer, {
      stencilBuffer: props.useStencil,
    })

    const mainRender = new RenderPass(scene, camera)
    mainRender.clearAlpha = 0
    this.passMap.set(mainRender, { type: PassType.Render, insertOrder: 0 })
    this.composer.addPass(mainRender)

    const gizmoRender = new RenderPass(gizmoScene, camera)
    gizmoRender.clear = false
    gizmoRender.clearDepth = false
    this.passMap.set(gizmoRender, { type: PassType.GizmoRender, insertOrder: 0 })
    this.composer.addPass(gizmoRender)

    const outline = new OutlinePass(new Vector2(), scene, camera)
    this.passMap.set(outline, { type: PassType.GizmoRender, insertOrder: 0 })
    this.composer.addPass(outline)

    const output = new OutputPass()
    this.passMap.set(output, { type: PassType.Output, insertOrder: 0 })
    this.composer.addPass(output)

    // FXAA: Fast Approximate Anti-Aliasing
    // https://github.com/mrdoob/three.js/blob/master/examples/webgl_postprocessing_fxaa.html#L144C5-L145C1
    // FXAA is engineered to be applied towards the end of engine post processing after conversion to low dynamic range and conversion to the sRGB color space for display.
    const fxaa = new ShaderPass(FXAAShader)
    this.passMap.set(fxaa, { type: PassType.Antialiasing, insertOrder: 0 })
    this.composer.addPass(fxaa)

    // const smaa = new SMAAPass(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio)
    const smaa = new SMAAPass()
    smaa.enabled = false
    this.passMap.set(smaa, { type: PassType.Antialiasing, insertOrder: 0 })
    this.composer.addPass(smaa)

    this.basicPasses = {
      mainRender,
      gizmoRender,
      outline,
      output,
      fxaa,
      smaa,
    }
  }

  override setSize(width: number, height: number, pixelRatio: number): void {
    super.setSize(width, height, pixelRatio)
    this.basicPasses.fxaa.uniforms['resolution'].value.set(1 / pixelRatio / width, 1 / pixelRatio / height)
    this.basicPasses.smaa.setSize(width * pixelRatio, height * pixelRatio) // Required? not sure since it implements "setSize"
  }
}
