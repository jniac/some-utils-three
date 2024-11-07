import { Material, WebGLProgramParametersWithUniforms } from 'three'

import { resolveShaderIncludes } from '../utils/misc'
import { MeshPhysicalMaterialFragmentTokens, MeshPhysicalMaterialVertexTokens, glTokens } from './Tokens'
import { UniformWrapper, Uniforms } from './uniforms'

let current: WebGLProgramParametersWithUniforms = null!

const wrap = <T extends Material>(material: T, callback: (shader: WebGLProgramParametersWithUniforms) => void): T => {
  material.onBeforeCompile = (shader: any) => {
    current = shader
  }
  return material
}
const withShader = (shader: WebGLProgramParametersWithUniforms) => {
  current = shader
  return ShaderForge
}

const START = '// ShaderForge (injected code) ->'
const END = '// <- ShaderForge'
/**
 * Wraps code with [START] & [END] patterns.
 */
const wrapCode = (code: string) => `${START}\n${code.trim()}\n${END}`
/**
 * Removes [END][whitespaces][START] patterns from the code.
 */
const cleanWrappedCode = (code: string) => {
  const f = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = String.raw`${f(END)}\s*${f(START)}`
  const re = new RegExp(pattern, 'g')
  return code.replaceAll(re, '')
}

class ShaderTool<GlslToken> {
  private type: 'vertexShader' | 'fragmentShader'
  constructor(type: 'vertexShader' | 'fragmentShader') {
    this.type = type
  }

  private getPattern(token: GlslToken, { throwError = true } = {}) {
    const pattern = `#include <${token}>`
    const type = this.type
    if (throwError && current[type].includes(pattern) === false) {
      throw new Error(`"${pattern}" is not present in the shader template program.`)
    }
    return { pattern, type }
  }

  replace(token: GlslToken | RegExp, code: string) {
    if (token instanceof RegExp) {
      const { type } = this
      const m = current[type].match(token)
      current[type] = current[type].replace(token, wrapCode(code))
    } else {
      const { type, pattern } = this.getPattern(token)
      const str = wrapCode(code)
      current[type] = current[type].replace(pattern, str)
    }
    return ShaderForge
  }

  inject(position: 'before' | 'after', token: GlslToken, code: string) {
    const { type, pattern } = this.getPattern(token)
    const str = position === 'after'
      ? `${pattern}\n${wrapCode(code)}`
      : `${wrapCode(code)}\n${pattern}`
    current[type] = current[type].replace(pattern, str)
    return ShaderForge
  }

  injectTokenComments() {
    for (const token of glTokens) {
      const { type, pattern } = this.getPattern(token as any, { throwError: false })
      current[type] = current[type].replace(pattern, `
        ${pattern}
        // ShaderForge TOKEN: ${token}
      `)
    }
    return ShaderForge
  }

  header(str: string) {
    const type = this.type
    current[type] = `${str}\n${current[type]}`
    return ShaderForge
  }

  /** Shorthand for `.inject('before', token, code)` */
  before(token: GlslToken, code: string) {
    return this.inject('before', token, code)
  }

  /** Shorthand for `.inject('after', token, code)` */
  after(token: GlslToken, code: string) {
    return this.inject('after', token, code)
  }

  top(...codes: string[]) {
    current[this.type] = current[this.type].replace('void main() {', /* glsl */`
      ${wrapCode(codes.join('\n\n'))}
      void main() {
    `)
    return ShaderForge
  }

  mainBeforeAll(code: string) {
    current[this.type] = current[this.type]
      .replace('void main() {', `void main() {
        ${wrapCode(code)}`)
    return ShaderForge
  }

  mainAfterAll(code: string) {
    current[this.type] = current[this.type]
      .replace(/}\s*$/, `
      ${wrapCode(code)}
    }`)
    return ShaderForge
  }

  uniforms(uniforms: Uniforms | string) {
    if (typeof uniforms === 'string') {
      this.top(uniforms)
    } else {
      const declaration: string[] = []
      for (const [key, uniformDeclaration] of Object.entries(uniforms)) {
        const uniform = UniformWrapper.from(key, uniformDeclaration)
        declaration.push(uniform.computeDeclaration())
      }
      this.top(declaration.join('\n'))
      mergeUniforms(uniforms)
    }
    return ShaderForge
  }

  clean() {
    current[this.type] = cleanWrappedCode(current[this.type])
    return ShaderForge
  }

  printFinalCode() {
    const code = resolveShaderIncludes(current[this.type])
    console.log(code)
    return ShaderForge
  }
}

function shaderName(name: string) {
  current.shaderName = `${name} (ShaderForge)`
  return ShaderForge
}

function defines(defines: Record<string, string | number>) {
  if ((current as any).defines) {
    Object.assign((current as any).defines, defines)
  } else {
    (current as any).defines = defines
  }
  return ShaderForge
}

function mergeUniforms(uniforms: Uniforms) {
  for (const [key, uniformDeclaration] of Object.entries(uniforms)) {
    const uniform = UniformWrapper.from(key, uniformDeclaration)
    if (key in current.uniforms) {
      if (uniform.value !== current.uniforms[key].value) {
        throw new Error(`Shader redefinition! (Uniform values are not equal)`)
      }
    } else {
      current.uniforms[key] = uniform
    }
  }
  return ShaderForge
}

function uniforms(uniforms: Uniforms | string) {
  vertex.uniforms(uniforms)
  fragment.uniforms(uniforms)
  return ShaderForge
}

const varyingTypes = ['float', 'vec2', 'vec3', 'vec4'] as const
type VaryingType = (typeof varyingTypes)[number]
function varying(type: string): typeof ShaderForge
function varying(type: Record<string, VaryingType>): typeof ShaderForge
function varying(varying: string | Record<string, VaryingType>) {
  let str = ''
  if (typeof varying === 'string') {
    str = varying
  } else {
    const declaration: string[] = []
    for (const [name, type] of Object.entries(varying)) {
      declaration.push(`varying ${type} ${name};`)
    }
    str = declaration.join('\n')
  }
  vertex.top(str)
  fragment.top(str)
  return ShaderForge
}

/**
 * `header()` will prepend the shader program with an header (debug purpose 
 * essentially).
 */
function header(str: string) {
  fragment.header(str)
  vertex.header(str)
  return ShaderForge
}

/**
 * `clean()` will remove from the source code of each program any useless injected 
 * comments (because injected chunks may be chained one after the other, so the 
 * following patterns will be removed: [END][whitespaces][START])
 */
function clean() {
  fragment.clean()
  vertex.clean()
  return ShaderForge
}

const fragment = new ShaderTool<MeshPhysicalMaterialFragmentTokens>('fragmentShader')
const vertex = new ShaderTool<MeshPhysicalMaterialVertexTokens>('vertexShader')

type ShaderForgeType = {
  (shader?: WebGLProgramParametersWithUniforms): ShaderForgeType
  shaderName: typeof shaderName
  defines: typeof defines
  uniforms: typeof uniforms
  varying: typeof varying
  vertex: typeof vertex
  fragment: typeof fragment
  header: typeof header
  clean: typeof clean
  with: typeof withShader
  wrap: typeof wrap
}

/**
 * A toolkit to help modifying threejs existing shaders.
 * 
 * [jniac.github.io / [Shader Xplr]](https://jniac.github.io/three-xp/t/shader-xplr)
 * 
 * [Shader templates](https://github.com/mrdoob/three.js/tree/master/src/renderers/shaders/ShaderLib): 
 * - [MeshPhysicalMaterial](https://github.com/mrdoob/three.js/blob/master/src/renderers/shaders/ShaderLib/meshphysical.glsl.js)
 * - [MeshBasicMaterial](https://github.com/mrdoob/three.js/blob/master/src/renderers/shaders/ShaderLib/meshbasic.glsl.js)
 * - [ShaderChunk lib](https://github.com/mrdoob/three.js/tree/master/src/renderers/shaders/ShaderChunk)
 * 
 * Usage:
 * ```
 * material.onBeforeCompile = shader => ShaderForge(shader)
 *   .uniforms({
 *     uScalar: { value: 1 },
 *   })
 *   .vertex.before('project_vertex', `
 *     transformed.xyz *= uScalar;
 *   `)
 * ```
 */
export const ShaderForge: ShaderForgeType = Object.assign(function (shader?: WebGLProgramParametersWithUniforms) {
  if (shader) {
    withShader(shader)
  }
  return ShaderForge
}, {
  shaderName,
  defines,
  uniforms,
  varying,
  vertex,
  fragment,
  header,
  clean,
  with: withShader,
  wrap,
})

export type {
  Uniforms
}

