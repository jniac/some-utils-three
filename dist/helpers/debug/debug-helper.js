import { BufferAttribute, BufferGeometry, Color, Group, LineSegments, Matrix4, Points, PointsMaterial, Vector3 } from 'three';
import { Rectangle } from 'some-utils-ts/math/geom/rectangle';
import { fromTransformDeclaration, fromVector3Declaration } from '../../declaration';
import { ShaderForge } from '../../shader-forge';
import { TextHelper } from '../text';
const _v0 = new Vector3();
const _v1 = new Vector3();
const _v2 = new Vector3();
const _v3 = new Vector3();
const _v4 = new Vector3();
const _v5 = new Vector3();
const _c0 = new Color();
const _m = new Matrix4();
class Utils {
    static boxPoints = {
        p0: new Vector3(),
        p1: new Vector3(),
        p2: new Vector3(),
        p3: new Vector3(),
        p4: new Vector3(),
        p5: new Vector3(),
        p6: new Vector3(),
        p7: new Vector3(),
    };
    static boxDefaults = {
        inset: 0,
        min: new Vector3(-.5, -.5, -.5),
        max: new Vector3(.5, .5, .5),
        transform: undefined,
    };
    static box(value) {
        const { p0, p1, p2, p3, p4, p5, p6, p7 } = Utils.boxPoints;
        p0.copy(Utils.boxDefaults.min);
        p1.copy(Utils.boxDefaults.max);
        if (value.min && value.max) {
            fromVector3Declaration(value.min, p0);
            fromVector3Declaration(value.max, p1);
        }
        if (value.inset) {
            p0.addScalar(value.inset);
            p1.addScalar(-value.inset);
        }
        const { x: x0, y: y0, z: z0 } = p0;
        const { x: x1, y: y1, z: z1 } = p1;
        p1.set(x1, y0, z0);
        p2.set(x1, y0, z1);
        p3.set(x0, y0, z1);
        p4.set(x0, y1, z0);
        p5.set(x1, y1, z0);
        p6.set(x1, y1, z1);
        p7.set(x0, y1, z1);
        if (value.transform) {
            fromTransformDeclaration(value.transform, _m);
            p0.applyMatrix4(_m);
            p1.applyMatrix4(_m);
            p2.applyMatrix4(_m);
            p3.applyMatrix4(_m);
            p4.applyMatrix4(_m);
            p5.applyMatrix4(_m);
            p6.applyMatrix4(_m);
            p7.applyMatrix4(_m);
        }
        return Utils;
    }
}
class PointsManager {
    static shapes = (() => {
        let i = 0;
        return {
            'square': i++,
            'circle': i++,
            'ring': i++,
            'ring-thin': i++,
            'plus': i++,
            'plus-thin': i++,
            'plus-ultra-thin': i++,
            'cross': i++,
        };
    })();
    static createParts({ pointCount: count = 10000, } = {}) {
        const geometry = new BufferGeometry();
        const attributes = {
            'position': new BufferAttribute(new Float32Array(count * 3), 3),
            'color': new BufferAttribute(new Float32Array(count * 3), 3),
            'aScale': new BufferAttribute(new Float32Array(count), 1),
            'aShape': new BufferAttribute(new Float32Array(count), 1),
        };
        for (const [name, attr] of Object.entries(attributes)) {
            geometry.setAttribute(name, attr);
        }
        const material = new PointsMaterial({ vertexColors: true });
        material.onBeforeCompile = shader => ShaderForge.with(shader)
            .varying({
            vShape: 'float',
        })
            .vertex.top(/* glsl */ `
        attribute float aScale;
        attribute float aShape;
      `)
            .vertex.mainAfterAll(/* glsl */ `
        gl_PointSize *= aScale;
        vShape = aShape;
      `)
            .fragment.top(/* glsl */ `
        float sdBox(in vec2 p, in vec2 b) {
          vec2 d = abs(p) - b;
          return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
        }
      `)
            .fragment.after('color_fragment', /* glsl */ `
        if (vShape == ${PointsManager.shapes['circle']}.0) {
          float d = distance(gl_PointCoord * 2.0, vec2(1.0));
          if (d > 1.0) discard;
        }

        if (vShape == ${PointsManager.shapes['ring']}.0) {
          float d = distance(gl_PointCoord * 2.0, vec2(1.0));
          if (d < 0.8 || d > 1.0) discard;
        }

        if (vShape == ${PointsManager.shapes['ring-thin']}.0) {
          float d = distance(gl_PointCoord * 2.0, vec2(1.0));
          if (d < 0.9 || d > 1.0) discard;
        }

        else if (vShape == ${PointsManager.shapes['plus']}.0) {
          float d0 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(1.0, 0.2));
          float d1 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(0.2, 1.0));
          if (d0 > 0.0 && d1 > 0.0) discard;
        }

        else if (vShape == ${PointsManager.shapes['plus-thin']}.0) {
          float d0 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(1.0, 0.1));
          float d1 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(0.1, 1.0));
          if (d0 > 0.0 && d1 > 0.0) discard;
        }

        else if (vShape == ${PointsManager.shapes['plus-ultra-thin']}.0) {
          float d0 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(1.0, 0.033));
          float d1 = sdBox(gl_PointCoord * 2.0 - 1.0, vec2(0.033, 1.0));
          if (d0 > 0.0 && d1 > 0.0) discard;
        }
        // diffuseColor.rgb *= vec3(gl_PointCoord, 1.0);
      `);
        const points = new Points(geometry, material);
        points.frustumCulled = false;
        // points.geometry.setDrawRange(0, 0)
        return {
            count,
            geometry,
            attributes,
            points,
        };
    }
    state = { index: 0 };
    parts;
    constructor(options) {
        this.parts = PointsManager.createParts(options);
    }
    clear() {
        this.state.index = 0;
        this.parts.geometry.setDrawRange(0, 0);
    }
    onTop(value = true) {
        const { points } = this.parts;
        if (value) {
            points.renderOrder = 999;
            points.material.depthTest = false;
            points.material.depthWrite = false;
            points.material.transparent = true;
        }
        else {
            points.renderOrder = 0;
            points.material.depthTest = true;
            points.material.depthWrite = true;
            points.material.transparent = false;
        }
        return this;
    }
    points(p, { size: argSize = .1, scale: argScale = 1, color: argColor = 'white', shape: argShape = 'square', } = {}) {
        const count = p.length;
        const { index: i0 } = this.state;
        const { position, color, aScale, aShape } = this.parts.attributes;
        const { r, g, b } = _c0.set(argColor);
        const size = argScale * argSize;
        const shape = PointsManager.shapes[argShape];
        for (let i1 = 0; i1 < count; i1++) {
            const { x, y, z } = fromVector3Declaration(p[i1], _v0);
            const i = i0 + i1;
            position.setXYZ(i, x, y, z);
            color.setXYZ(i, r, g, b);
            aScale.setX(i, size);
            aShape.setX(i, shape);
        }
        this.state.index = i0 + count;
        this.parts.geometry.setDrawRange(0, this.state.index);
        for (const attr of Object.values(this.parts.attributes)) {
            attr.needsUpdate = true;
        }
        if (this.state.index > this.parts.count) {
            throw new Error('Not implemented!');
        }
        return this;
    }
    box(value, options) {
        const { p0, p1, p2, p3, p4, p5, p6, p7 } = Utils.box(value).boxPoints;
        return this.points([p0, p1, p2, p3, p4, p5, p6, p7], options);
    }
    point(p, options) {
        return this.points([p], options);
    }
}
const DEFAULT_LINE_COUNT = 20000;
class LinesManager {
    static createParts({ lineCount: count = DEFAULT_LINE_COUNT, defaultColor = 'white', defaultOpacity = 1, } = {}) {
        const geometry = new BufferGeometry();
        const attributes = {
            'position': new BufferAttribute(new Float32Array(count * 3 * 2), 3),
            'color': new BufferAttribute(new Float32Array(count * 3 * 2), 3),
            'aOpacity': new BufferAttribute(new Float32Array(count * 2), 1),
        };
        for (const [name, attr] of Object.entries(attributes)) {
            geometry.setAttribute(name, attr);
        }
        const material = new PointsMaterial({
            vertexColors: true,
            transparent: true,
            depthWrite: false,
        });
        material.onBeforeCompile = shader => ShaderForge.with(shader)
            .varying({
            vOpacity: 'float',
        })
            .vertex.top(/* glsl */ `
        attribute float aOpacity;
      `)
            .vertex.mainAfterAll(/* glsl */ `
        vOpacity = aOpacity;
      `)
            .fragment.after('color_fragment', /* glsl */ `
        diffuseColor.a *= vOpacity;
      `);
        const lines = new LineSegments(geometry, material);
        lines.frustumCulled = false;
        return {
            count,
            defaults: {
                color: defaultColor,
                opacity: defaultOpacity,
            },
            geometry,
            attributes,
            lines,
        };
    }
    state = { index: 0 };
    parts;
    constructor(options) {
        this.parts = LinesManager.createParts(options);
    }
    clear() {
        this.state.index = 0;
        this.parts.geometry.setDrawRange(0, 0);
    }
    onTop(value = true) {
        const { lines } = this.parts;
        if (value) {
            lines.renderOrder = 999;
            lines.material.depthTest = false;
            lines.material.depthWrite = false;
        }
        else {
            lines.renderOrder = 0;
            lines.material.depthTest = true;
            lines.material.depthWrite = true;
        }
        return this;
    }
    static defaultArrowOptions = {
        size: .1,
        position: 'middle',
        skipSmallSegments: true,
        skipSmallSegmentsThreshold: 'size',
        type: 'single',
        scale: 1,
    };
    static arrowPositionToNumber(position, length, size, arrowIndex, arrowRepeat) {
        const delta = size / length * .66;
        if (typeof position === 'number') {
            return position + delta * (arrowIndex + .5 - (arrowRepeat - 1) / 2);
        }
        switch (position) {
            case 'start': return delta * arrowIndex;
            case 'end': return 1 - delta * arrowIndex;
            default:
            case 'middle': return .5 + delta * (arrowIndex + .5 - (arrowRepeat - 1) / 2);
        }
    }
    static defaultOptions = {
        color: undefined,
        opacity: 1,
        arrow: false,
    };
    #update(checkNaN = false) {
        this.parts.geometry.setDrawRange(0, this.state.index);
        for (const attr of Object.values(this.parts.attributes)) {
            attr.needsUpdate = true;
        }
        if (this.state.index > this.parts.count * 2) {
            throw new Error('Not implemented!');
        }
        if (checkNaN) {
            for (const attr of Object.values(this.parts.attributes)) {
                if (attr.array.some(v => isNaN(v))) {
                    console.log(attr.array.findIndex(v => isNaN(v)));
                    debugger;
                }
            }
        }
    }
    segmentsArray(array, options) {
        const { position, color, aOpacity } = this.parts.attributes;
        const { color: colorArg, opacity: opacityArg, } = {
            ...LinesManager.defaultOptions,
            ...this.parts.defaults,
            ...options,
        };
        const { r, g, b } = _c0.set(colorArg);
        const count = array.length / 3;
        {
            // The line's part (easy)
            const { index } = this.state;
            const totalCount = count + (options?.arrow ? count * 2 : 0);
            if (index + totalCount > this.parts.count) {
                console.log('Overflow Handling Not implemented', index + totalCount, this.parts.count);
                throw new Error('Overflow Handling Not implemented');
            }
            position.array.set(array, index * 3);
            for (let i = 0; i < count; i++) {
                color.setXYZ(index + i, r, g, b);
                aOpacity.setX(index + i, opacityArg);
            }
            this.state.index += count;
        }
        if (options?.arrow) {
            // The arrow's part (less easy...)
            const P0 = _v0;
            const P1 = _v1;
            const D = _v2; // direction
            const P = _v3; // position
            const N = _v4; // normal
            const M = _v5; // middle
            const C = _c0; // color
            const arrowOptions = Array.isArray(options.arrow)
                ? options.arrow
                : [options.arrow === true ? {} : options.arrow];
            let arrowCount = 0;
            const { index } = this.state;
            for (const arrowOption of arrowOptions) {
                const { size: arrowSize, position: arrowPosition, scale: arrowScale, skipSmallSegments, skipSmallSegmentsThreshold, } = { ...LinesManager.defaultArrowOptions, ...(typeof arrowOption === 'object' ? arrowOption : {}) };
                const threshold = skipSmallSegmentsThreshold === 'size' ? arrowSize : skipSmallSegmentsThreshold;
                const squareThreshold = threshold * threshold;
                const arrowRepeat = arrowOption.type === 'triple' ? 3 :
                    arrowOption.type === 'double' ? 2 :
                        1;
                for (let i = 0; i < count / 2; i++) {
                    P0.fromArray(array, i * 6);
                    P1.fromArray(array, i * 6 + 3);
                    D.subVectors(P1, P0);
                    const l2 = D.lengthSq();
                    if (skipSmallSegments && l2 < squareThreshold) {
                        continue;
                    }
                    const l = Math.sqrt(l2);
                    const s = arrowScale * arrowSize;
                    D.divideScalar(l);
                    // Normal based on the smallest component of the direction
                    const ax = Math.abs(D.x);
                    const ay = Math.abs(D.y);
                    const az = Math.abs(D.z);
                    if (ax >= az && ay >= az) {
                        N.set(D.y, -D.x, 0).normalize();
                    }
                    else if (ay >= ax) {
                        N.set(D.z, 0, -D.x).normalize();
                    }
                    else {
                        N.set(0, D.z, -D.y).normalize();
                    }
                    for (let j = 0; j < arrowRepeat; j++) {
                        const aps = Array.isArray(arrowPosition) ? arrowPosition : [arrowPosition];
                        for (const ap of aps) {
                            const t = LinesManager.arrowPositionToNumber(ap, l, s, j, arrowRepeat);
                            P.lerpVectors(P0, P1, t);
                            let i1 = index + arrowCount * 4;
                            aOpacity.setX(i1, opacityArg);
                            aOpacity.setX(i1 + 1, opacityArg);
                            aOpacity.setX(i1 + 2, opacityArg);
                            aOpacity.setX(i1 + 3, opacityArg);
                            let i2 = i1 * 3;
                            P.toArray(position.array, i2);
                            C.toArray(color.array, i2);
                            i2 += 3;
                            M
                                .copy(P)
                                .addScaledVector(D, -s)
                                .addScaledVector(N, s)
                                .toArray(position.array, i2);
                            C.toArray(color.array, i2);
                            i2 += 3;
                            P.toArray(position.array, i2);
                            C.toArray(color.array, i2);
                            i2 += 3;
                            M
                                .copy(P)
                                .addScaledVector(D, -s)
                                .addScaledVector(N, -s)
                                .toArray(position.array, i2);
                            C.toArray(color.array, i2);
                            arrowCount++;
                        }
                    }
                }
            }
            this.state.index += arrowCount * 4;
        }
        this.#update();
        return this;
    }
    segments(p, options) {
        const count = p.length;
        const array = new Float32Array(count * 3);
        for (let i1 = 0; i1 < count; i1++) {
            const { x, y, z } = fromVector3Declaration(p[i1], _v0);
            const i = i1 * 3;
            array[i + 0] = x;
            array[i + 1] = y;
            array[i + 2] = z;
        }
        return this.segmentsArray(array, options);
    }
    line(p0, p1, options) {
        return this.segments([p0, p1], options);
    }
    polyline(p, options) {
        const count = (p.length - 1) * 2;
        const p2 = new Array(count);
        for (let i = 1; i < p.length; i++) {
            p2[i * 2 - 2] = p[i - 1];
            p2[i * 2 - 1] = p[i];
        }
        return this.segments(p2, options);
    }
    polygon(p, options) {
        this.polyline(p, options);
        this.line(p[p.length - 1], p[0], options);
        return this;
    }
    box(value, options) {
        const { p0, p1, p2, p3, p4, p5, p6, p7 } = Utils.box(value).boxPoints;
        return this.segmentsArray(new Float32Array([
            p0.x, p0.y, p0.z,
            p1.x, p1.y, p1.z,
            p1.x, p1.y, p1.z,
            p2.x, p2.y, p2.z,
            p2.x, p2.y, p2.z,
            p3.x, p3.y, p3.z,
            p3.x, p3.y, p3.z,
            p0.x, p0.y, p0.z,
            p4.x, p4.y, p4.z,
            p5.x, p5.y, p5.z,
            p5.x, p5.y, p5.z,
            p6.x, p6.y, p6.z,
            p6.x, p6.y, p6.z,
            p7.x, p7.y, p7.z,
            p7.x, p7.y, p7.z,
            p4.x, p4.y, p4.z,
            p0.x, p0.y, p0.z,
            p4.x, p4.y, p4.z,
            p1.x, p1.y, p1.z,
            p5.x, p5.y, p5.z,
            p2.x, p2.y, p2.z,
            p6.x, p6.y, p6.z,
            p3.x, p3.y, p3.z,
            p7.x, p7.y, p7.z,
        ]), options);
    }
    static rectDefaultOptions = {
        inset: 0,
    };
    rect(value, options) {
        let { minX, minY, maxX, maxY } = Rectangle.from(value);
        const { inset } = { ...LinesManager.rectDefaultOptions, ...options };
        minX += inset;
        minY += inset;
        maxX -= inset;
        maxY -= inset;
        return this.segments([
            { x: minX, y: minY, z: 0 },
            { x: maxX, y: minY, z: 0 },
            { x: maxX, y: minY, z: 0 },
            { x: maxX, y: maxY, z: 0 },
            { x: maxX, y: maxY, z: 0 },
            { x: minX, y: maxY, z: 0 },
            { x: minX, y: maxY, z: 0 },
            { x: minX, y: minY, z: 0 },
        ], options);
    }
    static circleQualityPresets = {
        'low': 12,
        'medium': 24,
        'high': 64,
        'ultra': 256,
    };
    circle({ center = 0, axis = 'z', radius = 1, quality = 'medium', segments = undefined, } = {}, options) {
        segments ??= LinesManager.circleQualityPresets[quality];
        const { x, y, z } = fromVector3Declaration(center, _v0);
        fromVector3Declaration(axis, _v0)
            .normalize();
        _v1
            .set(_v0.y, _v0.z, _v0.x) // permute to have a non-parallel vector
            .cross(_v0)
            .normalize();
        _v2
            .crossVectors(_v0, _v1);
        const array = new Float32Array(segments * 3 * 2);
        for (let i = 0; i < segments; i++) {
            const a0 = i / segments * Math.PI * 2;
            const a1 = (i + 1) / segments * Math.PI * 2;
            const x0 = Math.cos(a0) * radius;
            const y0 = Math.sin(a0) * radius;
            const x1 = Math.cos(a1) * radius;
            const y1 = Math.sin(a1) * radius;
            const i6 = i * 6;
            array[i6 + 0] = x + x0 * _v1.x + y0 * _v2.x;
            array[i6 + 1] = y + x0 * _v1.y + y0 * _v2.y;
            array[i6 + 2] = z + x0 * _v1.z + y0 * _v2.z;
            array[i6 + 3] = x + x1 * _v1.x + y1 * _v2.x;
            array[i6 + 4] = y + x1 * _v1.y + y1 * _v2.y;
            array[i6 + 5] = z + x1 * _v1.z + y1 * _v2.z;
        }
        this.segmentsArray(array, options);
        return this;
    }
    static regularGridDefaults = {
        size: 100,
        subdivisions: [10, 2, 5],
        opacity: [.2, .05, .01],
        color: 'white',
    };
    regularGrid(options) {
        const { size, subdivisions, opacity: opacityArg, color: colorArg } = { ...LinesManager.regularGridDefaults, ...options };
        const subdivisionsCount = subdivisions.length;
        const cumul = subdivisions.map((v, i) => subdivisions.slice(i).reduce((a, b) => a * b, 1));
        const count = cumul[0];
        const positions = new Float32Array((count + 1) * 2 * 2 * 3);
        const colors = new Float32Array((count + 1) * 2 * 2 * 3).fill(1);
        const aOpacity = new Float32Array((count + 1) * 2 * 2).fill(1);
        const colorArgArray = Array.isArray(colorArg) ? colorArg : [colorArg];
        const colorArray = subdivisions.map((_, i) => {
            const { r, g, b } = _c0.set(colorArgArray[Math.min(i, colorArgArray.length - 1)]);
            return [r, g, b];
        });
        const opacityArgArray = Array.isArray(opacityArg) ? opacityArg : [opacityArg];
        const opacityArray = subdivisions.map((_, i) => {
            return opacityArgArray[Math.min(i, opacityArgArray.length - 1)];
        });
        for (let i = 0; i <= count; i++) {
            let j = subdivisionsCount - 1;
            while (i % cumul[j] === 0) {
                if (--j <= 0)
                    break;
            }
            const [r, g, b] = colorArray[j];
            const o = opacityArray[j];
            const d = i / count * size;
            const i12 = i * 12;
            positions[i12 + 0] = -size / 2;
            positions[i12 + 1] = -size / 2 + d;
            positions[i12 + 2] = 0;
            positions[i12 + 3] = size / 2;
            positions[i12 + 4] = -size / 2 + d;
            positions[i12 + 5] = 0;
            positions[i12 + 6] = -size / 2 + d;
            positions[i12 + 7] = -size / 2;
            positions[i12 + 8] = 0;
            positions[i12 + 9] = -size / 2 + d;
            positions[i12 + 10] = size / 2;
            positions[i12 + 11] = 0;
            colors[i12 + 0] = r;
            colors[i12 + 1] = g;
            colors[i12 + 2] = b;
            colors[i12 + 3] = r;
            colors[i12 + 4] = g;
            colors[i12 + 5] = b;
            colors[i12 + 6] = r;
            colors[i12 + 7] = g;
            colors[i12 + 8] = b;
            colors[i12 + 9] = r;
            colors[i12 + 10] = g;
            colors[i12 + 11] = b;
            const i4 = i * 4;
            aOpacity[i4 + 0] = o;
            aOpacity[i4 + 1] = o;
            aOpacity[i4 + 2] = o;
            aOpacity[i4 + 3] = o;
        }
        const { index } = this.state;
        this.parts.attributes.position.array.set(positions, index * 3);
        this.parts.attributes.color.array.set(colors, index * 3);
        this.parts.attributes.aOpacity.array.set(aOpacity, index);
        this.state.index += (count + 1) * 2 * 2;
        this.#update();
        return this;
    }
}
const DEFAULT_TEXT_COUNT = 2000;
class TextsManager {
    static createParts(options) {
        const textHelper = new TextHelper({
            textCount: DEFAULT_TEXT_COUNT,
            ...options,
        });
        return {
            count: textHelper.count,
            textHelper,
        };
    }
    state = { index: 0 };
    parts;
    constructor(options) {
        this.parts = TextsManager.createParts(options);
    }
    clear() {
        this.state.index = 0;
        this.parts.textHelper.clearAllText();
        return this;
    }
    onTop(value = true) {
        this.parts.textHelper.onTop(value);
        return this;
    }
    static textDefaults = {
        texts: ((i) => i.toString()),
        debug: false,
    };
    texts(points, options) {
        let index = this.state.index;
        const { texts, ...rest } = { ...TextsManager.textDefaults, ...options };
        const textDelegate = typeof texts === 'function'
            ? texts
            : (i) => texts[i % texts.length];
        let i = 0;
        for (const p of points) {
            const { x, y, z } = fromVector3Declaration(p, _v0);
            this.parts.textHelper.setTextAt(index, textDelegate(i), {
                ...rest,
                x, y, z,
            });
            index++;
            i++;
        }
        this.state.index = index;
        return this;
    }
    text(p, text, options) {
        return this.texts([p], { ...options, texts: [text] });
    }
}
const defaultLinePointsOptions = {
    color: undefined,
    size: .1,
    shape: 'square',
};
class DebugHelper extends Group {
    static createParts(instance, options) {
        const pointsManager = new PointsManager(options?.points);
        instance.add(pointsManager.parts.points);
        const linesManager = new LinesManager(options?.lines);
        instance.add(linesManager.parts.lines);
        const textsManager = new TextsManager(options?.texts);
        instance.add(textsManager.parts.textHelper);
        return {
            pointsManager,
            linesManager,
            textsManager,
        };
    }
    parts;
    constructor(options) {
        super();
        this.parts = DebugHelper.createParts(this, options);
    }
    points(...args) {
        this.parts.pointsManager.points(...args);
        return this;
    }
    point(...args) {
        this.parts.pointsManager.point(...args);
        return this;
    }
    segments(...args) {
        this.parts.linesManager.segments(...args);
        return this;
    }
    line(...args) {
        this.parts.linesManager.line(...args);
        return this;
    }
    polyline(data, options) {
        this.parts.linesManager.polyline(data, options);
        if (options?.points) {
            this.points(data, { ...defaultLinePointsOptions, color: options.color, ...(options.points === true ? {} : options.points) });
        }
        return this;
    }
    polylines(data, options) {
        for (const d of data) {
            this.polyline(d, options);
        }
        return this;
    }
    polygon(polygonArg, options) {
        this.parts.linesManager.polygon(polygonArg, options);
        if (options?.points) {
            this.points(polygonArg, { ...defaultLinePointsOptions, color: options.color, ...(options.points === true ? {} : options.points) });
        }
        return this;
    }
    polygons(data, options) {
        for (const d of data) {
            this.polygon(d, options);
        }
        return this;
    }
    box(boxArg, options) {
        this.parts.linesManager.box(boxArg, options);
        if (options?.points) {
            this.parts.pointsManager.box(boxArg, { ...defaultLinePointsOptions, color: options.color, ...(options.points === true ? {} : options.points) });
        }
        return this;
    }
    circle(...args) {
        this.parts.linesManager.circle(...args);
        return this;
    }
    rect(...args) {
        this.parts.linesManager.rect(...args);
        return this;
    }
    regularGrid(...args) {
        this.parts.linesManager.regularGrid(...args);
        return this;
    }
    texts(...args) {
        this.parts.textsManager.texts(...args);
        return this;
    }
    text(...args) {
        this.parts.textsManager.text(...args);
        return this;
    }
    clear() {
        this.onTop(false);
        this.parts.pointsManager.clear();
        this.parts.linesManager.clear();
        this.parts.textsManager.clear();
        return this;
    }
    onTop(value = true) {
        this.parts.pointsManager.onTop(value);
        this.parts.linesManager.onTop(value);
        this.parts.textsManager.onTop(value);
        return this;
    }
    globalExpose(name = 'debugHelper') {
        Object.assign(globalThis, { [name]: this });
        return this;
    }
    addTo(parent) {
        if (parent) {
            parent.add(this);
        }
        else {
            this.removeFromParent();
        }
        return this;
    }
}
/**
 * Static instance of DebugHelper for convenience. Can be used as a global debug draw.
 */
const debugHelper = new DebugHelper();
export { debugHelper, DebugHelper };
