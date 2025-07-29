
export enum TickPhase {
  BeforeUpdate = -1000,
  Update = 0,
  AfterUpdate = 1000,
  Render = 2000,
  PostRender = 3000
}

export enum ThreeContextType {
  WebGL = 'webgl',
  WebGPU = 'webgpu'
}
