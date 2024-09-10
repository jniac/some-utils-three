// @ts-ignore
import { Color, CubeTexture, IUniform, Matrix3, Matrix4, Quaternion, Texture, Vector2, Vector3, Vector4 } from 'three'

import { Observable } from 'some-utils-ts/observables'

type UniformValueType =
  | number
  | Vector2
  | Vector3
  | Color
  | Vector4
  | Quaternion
  | Matrix3
  | Matrix4
  | Texture
  | CubeTexture

type UniformDeclaration = IUniform<UniformValueType> | UniformValueType

/**
 * Little wrapper around a uniform value. Used to generate the declaration string.
 */
export class Uniform<T> implements IUniform<T> {
  static from<T = any>(name: string, value: any): Uniform<T> {
    if (value instanceof Observable) {
      if (typeof value.value === 'number') {
        return new Uniform(name, value) as Uniform<T>
      }
      throw new Error(`Observable value must be a number`)
    }
    const type = typeof value
    if (type === 'object' && value.constructor === Object && 'value' in value) {
      return new Uniform(name, value) as Uniform<T>
    }
    if (type === 'string') {
      return new Uniform(name, { value: new Color(value) }) as Uniform<T>
    }
    return new Uniform(name, { value })
  }

  name: string
  target: { value: T }

  get value() {
    return this.target.value
  }

  constructor(name: string, target: { value: T }) {
    this.name = name
    this.target = target
  }

  computeDeclaration() {
    const name = this.name
    const value = this.target.value as any

    if (typeof value === 'number') {
      return `uniform float ${name};`
    }
    if (value.isVector2) {
      return `uniform vec2 ${name};`
    }
    if (value.isVector3 || value.isColor) {
      return `uniform vec3 ${name};`
    }
    if (value.isVector4 || value.isQuaternion) {
      return `uniform vec4 ${name};`
    }
    if (value.isMatrix3) {
      return `uniform mat3 ${name};`
    }
    if (value.isMatrix4) {
      return `uniform mat4 ${name};`
    }
    if (value.isTexture) {
      if (value.isCubeTexture) {
        return `uniform samplerCube ${name};`
      } else {
        return `uniform sampler2D ${name};`
      }
    }
    if (value instanceof Float32Array) {
      return `uniform float ${name}[${value.length}];`
    }

    console.log(`unhandled value:`, value)
    throw new Error(`unhandled value: "${value?.constructor.name}"`)
  }
}

export type Uniforms = Record<string, UniformDeclaration>
