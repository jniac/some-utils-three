
import { TickPhase } from 'some-utils-ts/ticker'

export enum ThreeContextType {
  WebGL = 'webgl',
  WebGPU = 'webgpu'
}

export type { ThreeBaseContext } from './base'
export type { ThreeWebGLContext } from './webgl'
export type { ThreeWebGPUContext } from './webgpu'
export { TickPhase } // Re-exporting for backwards compatibility, can be removed in the future when all consumers have been updated

