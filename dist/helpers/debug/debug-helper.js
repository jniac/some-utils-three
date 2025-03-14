import { BufferAttribute, BufferGeometry, Color, Group, LineSegments, Points, PointsMaterial, Vector3 } from 'three';
import { Rectangle } from 'some-utils-ts/math/geom/rectangle';
import { fromVector3Declaration } from '../../declaration.js';
import { ShaderForge } from '../../shader-forge.js';
const _v0 = new Vector3();
const _c0 = new Color();
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
    static createParts(count) {
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
    constructor(count = 1000) {
        this.parts = PointsManager.createParts(count);
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
    point(p, options) {
        return this.points([p], options);
    }
}
class LinesManager {
    static createParts(count) {
        const geometry = new BufferGeometry();
        const attributes = {
            'position': new BufferAttribute(new Float32Array(count * 3 * 2), 3),
            'color': new BufferAttribute(new Float32Array(count * 3 * 2), 3),
        };
        for (const [name, attr] of Object.entries(attributes)) {
            geometry.setAttribute(name, attr);
        }
        const material = new PointsMaterial({ vertexColors: true });
        const lines = new LineSegments(geometry, material);
        lines.frustumCulled = false;
        return {
            count,
            geometry,
            attributes,
            lines,
        };
    }
    state = { index: 0 };
    parts;
    constructor(count = 1000) {
        this.parts = LinesManager.createParts(count);
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
            lines.material.transparent = true;
        }
        else {
            lines.renderOrder = 0;
            lines.material.depthTest = true;
            lines.material.depthWrite = true;
            lines.material.transparent = false;
        }
        return this;
    }
    segments(p, { color: argColor = 'white', } = {}) {
        const count = p.length;
        const { index: i0 } = this.state;
        const { position, color } = this.parts.attributes;
        const { r, g, b } = _c0.set(argColor);
        for (let i1 = 0; i1 < count; i1++) {
            const { x: x0, y: y0, z: z0 } = fromVector3Declaration(p[i1], _v0);
            let i = i0 + i1;
            position.setXYZ(i, x0, y0, z0);
            color.setXYZ(i, r, g, b);
        }
        this.state.index = i0 + count;
        this.parts.geometry.setDrawRange(0, this.state.index);
        for (const attr of Object.values(this.parts.attributes)) {
            attr.needsUpdate = true;
        }
        if (this.state.index > this.parts.count * 2) {
            throw new Error('Not implemented!');
        }
        return this;
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
    static boxDefaultOptions = {
        inset: 0,
    };
    static #box = { x0: 0, y0: 0, z0: 0, x1: 0, y1: 0, z1: 0 };
    static #solveBox(value) {
        fromVector3Declaration(value.min, _v0);
        LinesManager.#box.x0 = _v0.x;
        LinesManager.#box.y0 = _v0.y;
        LinesManager.#box.z0 = _v0.z;
        fromVector3Declaration(value.max, _v0);
        LinesManager.#box.x1 = _v0.x;
        LinesManager.#box.y1 = _v0.y;
        LinesManager.#box.z1 = _v0.z;
    }
    box(value, options) {
        LinesManager.#solveBox(value);
        const { inset } = { ...LinesManager.boxDefaultOptions, ...options };
        let { x0, y0, z0, x1, y1, z1 } = LinesManager.#box;
        x0 += inset;
        y0 += inset;
        z0 += inset;
        x1 -= inset;
        y1 -= inset;
        z1 -= inset;
        return this.segments([
            // bottom
            { x: x0, y: y0, z: z0 },
            { x: x1, y: y0, z: z0 },
            { x: x1, y: y0, z: z0 },
            { x: x1, y: y1, z: z0 },
            { x: x1, y: y1, z: z0 },
            { x: x0, y: y1, z: z0 },
            { x: x0, y: y1, z: z0 },
            { x: x0, y: y0, z: z0 },
            // top
            { x: x0, y: y0, z: z1 },
            { x: x1, y: y0, z: z1 },
            { x: x1, y: y0, z: z1 },
            { x: x1, y: y1, z: z1 },
            { x: x1, y: y1, z: z1 },
            { x: x0, y: y1, z: z1 },
            { x: x0, y: y1, z: z1 },
            { x: x0, y: y0, z: z1 },
            // sides
            { x: x0, y: y0, z: z0 },
            { x: x0, y: y0, z: z1 },
            { x: x1, y: y0, z: z0 },
            { x: x1, y: y0, z: z1 },
            { x: x1, y: y1, z: z0 },
            { x: x1, y: y1, z: z1 },
            { x: x0, y: y1, z: z0 },
            { x: x0, y: y1, z: z1 },
        ], options);
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
}
const defaultLinePointsOptions = {
    color: undefined,
    size: .1,
    shape: 'square',
};
class DebugHelper extends Group {
    parts = (() => {
        const pointsManager = new PointsManager();
        this.add(pointsManager.parts.points);
        const linesManager = new LinesManager();
        this.add(linesManager.parts.lines);
        return {
            pointsManager,
            linesManager,
        };
    })();
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
    polygon(data, options) {
        this.parts.linesManager.polygon(data, options);
        if (options?.points) {
            this.points(data, { ...defaultLinePointsOptions, color: options.color, ...(options.points === true ? {} : options.points) });
        }
        return this;
    }
    polygons(data, options) {
        for (const d of data) {
            this.polygon(d, options);
        }
        return this;
    }
    box(...args) {
        this.parts.linesManager.box(...args);
        return this;
    }
    rect(...args) {
        this.parts.linesManager.rect(...args);
        return this;
    }
    clear() {
        this.onTop(false);
        this.parts.pointsManager.clear();
        this.parts.linesManager.clear();
        return this;
    }
    onTop(value = true) {
        this.parts.pointsManager.onTop(value);
        this.parts.linesManager.onTop(value);
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
