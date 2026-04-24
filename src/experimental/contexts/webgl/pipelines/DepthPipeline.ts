import { DepthTexture, PerspectiveCamera, Scene, Vector2, WebGLRenderer } from 'three'
import { RenderPass, ShaderPass } from 'three/examples/jsm/Addons.js'

import { Tick } from 'some-utils-ts/ticker'
import { PassType, PipelineBase } from './PipelineBase'

function createDepthPass() {
  return new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      tDepth: { value: null },
      cameraNear: { value: 0 },
      cameraFar: { value: 1 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      #include <packing>
      uniform sampler2D tDiffuse;
      uniform sampler2D tDepth;
      uniform float cameraNear;
      uniform float cameraFar;
      varying vec2 vUv;
  
      float readDepth(vec2 coord) {
        float fragZ = texture2D(tDepth, coord).x;
        float viewZ = perspectiveDepthToViewZ(fragZ, cameraNear, cameraFar);
        return viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);
      }
  
      void main() {
        float depth = readDepth(vUv);
        depth = pow(depth, 1.0 / 2.0); // Apply gamma correction for better visualization
        gl_FragColor = vec4(vec3(depth), 1.0);
      }
    `,
  })
}

export class DepthPipeline extends PipelineBase {
  mainPass: RenderPass
  depthPass: ShaderPass
  depthTexture: DepthTexture

  constructor(
    renderer: WebGLRenderer,
    scene: Scene,
    gizmoScene: Scene,
    camera: PerspectiveCamera,
  ) {
    const { width, height } = renderer.getDrawingBufferSize(new Vector2())
    const depthTexture = new DepthTexture(width, height)

    super(renderer, {
      stencilBuffer: false,
      depthBuffer: true,
      depthTexture,
    })

    // Disable automatic depth texture setup by EffectComposer, since we need to use the depth texture in a custom way in the shader pass.
    this.composer.renderTarget2.depthTexture = null
    this.composer.renderTarget2.depthBuffer = false

    const mainPass = new RenderPass(scene, camera)
    this.passMap.set(mainPass, { type: PassType.Render, insertOrder: 0 })
    this.composer.addPass(mainPass)

    const depthPass = createDepthPass()
    this.passMap.set(depthPass, { type: PassType.PostProcessing, insertOrder: 0 })
    this.composer.addPass(depthPass)

    this.depthTexture = depthTexture
    this.mainPass = mainPass
    this.depthPass = depthPass
  }

  override render(tick: Tick): void {
    const camera = this.mainPass.camera as PerspectiveCamera
    this.depthPass.uniforms['tDepth'].value = this.depthTexture
    this.depthPass.uniforms['cameraNear'].value = camera.near
    this.depthPass.uniforms['cameraFar'].value = camera.far
    super.render(tick)
  }
}