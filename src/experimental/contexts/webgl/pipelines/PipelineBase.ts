import { EffectComposer, Pass, RenderPass } from 'three/examples/jsm/Addons.js'

import { Tick } from 'some-utils-ts/ticker'
import { DestroyableObject } from 'some-utils-ts/types'
import { DepthTexture, Object3D, Vector2, WebGLRenderer, WebGLRenderTarget } from 'three'

export enum PassType {
  Render = 0,
  PostProcessing = 1000,
  GizmoRender = 2000,
  Outline = 3000,
  Output = 4000,
  Antialiasing = 5000,
}

export type PassMetadata = {
  type: PassType
  insertOrder?: number
}

const defaultOptions = {
  stencilBuffer: false,
  depthBuffer: true,
  depthTexture: <DepthTexture | false>false,
}

export class PipelineBase {
  size = new Vector2()
  passMap = new Map<Pass, PassMetadata>()
  composer!: EffectComposer

  constructor(
    renderer: WebGLRenderer,
    options?: Partial<typeof defaultOptions>,
  ) {
    const {
      stencilBuffer,
      depthBuffer,
      depthTexture,
    } = { ...defaultOptions, ...options }

    const { width, height } = renderer.getSize(this.size)
      .multiplyScalar(renderer.getPixelRatio())

    const renderTarget = new WebGLRenderTarget(width, height, {
      stencilBuffer,
      depthBuffer,
    })

    if (depthTexture) {
      renderTarget.depthTexture = depthTexture
    }

    this.composer = new EffectComposer(renderer, renderTarget)
  }

  dispose() {
    for (const pass of this.composer.passes) {
      pass.dispose()
    }
    this.composer.dispose()
    this.passMap.clear()
  }

  /**
   * Sort the passes internally.
   */
  sortPasses(): this {
    const passes = [...this.passMap]
    for (const [pass] of passes) {
      this.composer.removePass(pass)
    }
    passes.sort((a, b) => {
      const ma = a[1]
      const mb = b[1]
      if (ma.type !== mb.type) {
        return ma.type - mb.type
      }
      return (ma.insertOrder ?? 0) - (mb.insertOrder ?? 0)
    })
    for (const [pass] of passes) {
      this.composer.addPass(pass)
    }
    return this
  }

  *getPassesByType(type: PassType) {
    for (const [pass, metadata] of this.passMap) {
      if (metadata.type === type) {
        yield [pass, metadata] as const
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
  addPass(pass: Pass,
    {
      type = PassType.Render,
      insertOrder = undefined,
    }: Partial<PassMetadata> = {}): DestroyableObject {
    if (insertOrder === undefined) {
      const existingPasses = [...this.getPassesByType(type)]
      insertOrder = (existingPasses.at(-1)?.[1]?.insertOrder ?? -1) + 1
    }
    this.passMap.set(pass, { type, insertOrder })
    this.sortPasses()
    const destroy = () => this.removePass(pass)
    return { destroy }
  }

  removePass(pass: Pass): boolean {
    if (!this.passMap.has(pass)) {
      console.warn('The pass is not in the pipeline.')
      return false
    }
    this.passMap.delete(pass)
    this.composer.removePass(pass)
    return true
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.composer.setSize(width, height)
    this.composer.setPixelRatio(pixelRatio)
  }

  /**
   * Update all the passes that are using the previous scene with the new scene.
   */
  setScene(scene: Object3D): void {
    let previousScene = null as null | Object3D
    for (const pass of this.composer.passes) {
      if (pass instanceof RenderPass) {
        if (previousScene === null) {
          previousScene = pass.scene
        }
        if (pass.scene === previousScene) {
          // @ts-ignore (Object3D is ok)
          pass.scene = scene
        }
      }
    }
  }

  render(tick: Tick): void {
    this.composer.render(tick.deltaTime)
  }

  getPassesInfo() {
    const lines = [`${this.constructor.name} passes info:`]
    const { composer, passMap } = this
    for (const [passIndex, pass] of composer.passes.entries()) {
      const metadata = passMap.get(pass)
      if (!metadata) {
        lines.push(`- ${passIndex}: NO METADATA for ${pass.constructor.name}`)
      } else {
        const enabled = pass.enabled ? '✅' : '❌'
        lines.push(`- ${passIndex}: ${enabled} ${PassType[metadata.type]} (insertOrder: ${metadata.insertOrder}) ${pass.constructor.name}`)
      }
    }
    return lines.join('\n')
  }
}