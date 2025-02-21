// @ts-ignore
import { Color, Uniform } from 'three';
import { Observable } from 'some-utils-ts/observables';
/**
 * Little wrapper around a uniform value. Used to generate the declaration string.
 */
export class UniformWrapper {
    static from(name, value) {
        if (value instanceof Observable) {
            if (typeof value.value === 'number') {
                return new UniformWrapper(name, value);
            }
            throw new Error(`Observable value must be a number`);
        }
        const type = typeof value;
        if (type === 'object' && (value.constructor === Object || value instanceof Uniform) && 'value' in value) {
            return new UniformWrapper(name, value);
        }
        if (type === 'string') {
            return new UniformWrapper(name, { value: new Color(value) });
        }
        return new UniformWrapper(name, { value });
    }
    name;
    target;
    get value() {
        return this.target.value;
    }
    constructor(name, target) {
        this.name = name;
        this.target = target;
    }
    computeDeclaration() {
        const name = this.name;
        let value = this.target.value;
        let arraySuffix = '';
        if (value instanceof Float32Array) {
            return `uniform float ${name}[${value.length}];`;
        }
        if (Array.isArray(value)) {
            arraySuffix = `[${value.length}]`;
            value = value[0];
        }
        if (typeof value === 'number') {
            return `uniform float ${name}${arraySuffix};`;
        }
        if (value.isVector2) {
            return `uniform vec2 ${name}${arraySuffix};`;
        }
        if (value.isVector3 || value.isColor) {
            return `uniform vec3 ${name}${arraySuffix};`;
        }
        if (value.isVector4 || value.isQuaternion) {
            return `uniform vec4 ${name}${arraySuffix};`;
        }
        if (value.isMatrix3) {
            return `uniform mat3 ${name}${arraySuffix};`;
        }
        if (value.isMatrix4) {
            return `uniform mat4 ${name}${arraySuffix};`;
        }
        if (value.isTexture) {
            if (value.isCubeTexture) {
                return `uniform samplerCube ${name}${arraySuffix};`;
            }
            else {
                return `uniform sampler2D ${name}${arraySuffix};`;
            }
        }
        console.log(`unhandled value:`, value);
        throw new Error(`unhandled value: "${value?.constructor.name}"`);
    }
}
