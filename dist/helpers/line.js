import { BufferAttribute, BufferGeometry, Color, GreaterDepth, LineBasicMaterial, LineSegments, Matrix4, Vector2, Vector3 } from 'three';
import { Rectangle } from 'some-utils-ts/math/geom/rectangle';
import { loopArray } from 'some-utils-ts/iteration/loop';
import { fromTransformDeclaration, fromVector2Declaration, fromVector3Declaration } from '../declaration.js';
const _vector2 = new Vector2();
const _vector3 = new Vector3();
const _m = new Matrix4();
function* _uniquePoints(points) {
    const processed = new WeakSet();
    for (const point of points) {
        if (!processed.has(point)) {
            processed.add(point);
            yield point;
        }
    }
}
function _transformAndPush(lineHelper, newPoints, options, pairify, close) {
    if (options?.transform) {
        fromTransformDeclaration(options.transform, _m);
        for (const point of _uniquePoints(newPoints)) {
            point.applyMatrix4(_m);
        }
    }
    if (options?.color !== undefined) {
        lineHelper.color(options.color);
    }
    if (pairify) {
        for (let i = 0; i < newPoints.length - 1; i++) {
            lineHelper.points.push(newPoints[i], newPoints[i + 1]);
        }
        if (close) {
            lineHelper.points.push(newPoints[newPoints.length - 1], newPoints[0]);
        }
    }
    else {
        lineHelper.points.push(...newPoints);
    }
}
export class LineHelper extends LineSegments {
    points = [];
    colors = new Map();
    state = {
        forceTransparent: false,
        hasAlreadyBeenRendered: false,
        reservePoints: -1,
    };
    /**
     * @param reservePoints If you know the number of points that will be added, you can set this value to avoid to overallocate memory later.
     */
    constructor(reservePoints = -1, material = new LineBasicMaterial({ vertexColors: true })) {
        super(new BufferGeometry(), material);
        this.state.reservePoints = reservePoints;
        this.onBeforeRender = () => {
            this.state.hasAlreadyBeenRendered = true;
        };
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
    /**
     * Returns an iterator that yields all the unique points in the line (no duplicates).
     */
    *uniquePoints() {
        yield* _uniquePoints(this.points);
    }
    /**
     * Set the "opacity" property of the material and automatically set the material
     * as "transparent" if the value is less that one.
     */
    opacity(value) {
        this.material.opacity = value;
        this.material.transparent = this.state.forceTransparent || value < 1;
        this.material.depthWrite = value >= 1;
        this.material.needsUpdate = true;
        return this;
    }
    /**
     * Set the current color, from now on, all points added will have this color.
     */
    color(value) {
        this.colors.set(this.points.length, new Color(value));
        return this;
    }
    /**
     * Force the material to be transparent, even if the opacity is set to 1.
     */
    forceTransparent() {
        this.state.forceTransparent = true;
        this.material.transparent = true;
        return this;
    }
    translate(...args) {
        const [x, y, z] = args.length === 1 ? fromVector3Declaration(args[0], _vector3) : args;
        for (const point of this.uniquePoints()) {
            point.x += x;
            point.y += y;
            point.z += z;
        }
        return this;
    }
    rescale(...args) {
        const [x, y, z] = args.length === 1 ? fromVector3Declaration(args[0], _vector3) : args;
        for (const point of this.uniquePoints()) {
            point.x *= x;
            point.y *= y;
            point.z *= z;
        }
        return this;
    }
    showOccludedLines({ opacity = .2 } = {}) {
        const material = new LineBasicMaterial({
            color: this.material.color,
            transparent: true,
            depthFunc: GreaterDepth,
            opacity,
        });
        const clone = new LineSegments(this.geometry, material);
        this.add(clone);
        return this;
    }
    clear() {
        this.points.length = 0;
        this.colors.clear();
        this.geometry.setDrawRange(0, 0);
        return this;
    }
    draw() {
        // Geometry, not so easy now:
        // If the geometry has not been rendered yet (and supposedly the attributes
        // are not bound), we can set the points directly.
        // Otherwise, we need to update the existing points and check that the new
        // points are not more than the reserved points.
        if (this.state.hasAlreadyBeenRendered === false && this.state.reservePoints === -1) {
            this.geometry.setFromPoints(this.points);
            this.geometry.setDrawRange(0, this.points.length);
            this.state.reservePoints = this.points.length;
        }
        else {
            let { position: positionAttribute } = this.geometry.attributes;
            if (!positionAttribute) {
                positionAttribute = new BufferAttribute(new Float32Array(this.state.reservePoints * 3), 3);
                this.geometry.setAttribute('position', positionAttribute);
            }
            let count = this.points.length;
            if (count > positionAttribute.count) {
                console.warn(`LineHelper: The number of points (${count}) is greater than the reserved points (${positionAttribute.count}).`);
                count = positionAttribute.count;
            }
            this.geometry.setDrawRange(0, count);
            for (let i = 0; i < count; i++) {
                const { x, y, z } = this.points[i];
                positionAttribute.setXYZ(i, x, y, z);
            }
            positionAttribute.needsUpdate = true;
        }
        this.geometry.computeBoundingSphere();
        // Colors, the less easy part:
        this.material.vertexColors = this.colors.size > 0;
        this.material.needsUpdate = true;
        if (this.colors.size > 0) {
            let { color: colorAttribute } = this.geometry.attributes;
            if (!colorAttribute) {
                colorAttribute = new BufferAttribute(new Float32Array(this.geometry.attributes.position.count * 3), 3);
                this.geometry.setAttribute('color', colorAttribute);
            }
            const currentColor = new Color(this.colors.get(0) ?? 'white');
            const count = this.points.length;
            for (let i = 0; i < count; i++) {
                const color = this.colors.get(i);
                if (color) {
                    currentColor.copy(color);
                }
                colorAttribute.setXYZ(i, currentColor.r, currentColor.g, currentColor.b);
            }
            colorAttribute.needsUpdate = true;
        }
        return this;
    }
    line(a, b, options) {
        const va = fromVector3Declaration(a);
        const vb = fromVector3Declaration(b);
        _transformAndPush(this, [va, vb], options);
        return this;
    }
    capsule2(a, b, radius, options) {
        const va = fromVector3Declaration(a);
        const vb = fromVector3Declaration(b);
        const d = new Vector3().subVectors(vb, va);
        const l = d.length();
        const u = d.clone().divideScalar(l);
        const v = new Vector3(-u.y, u.x);
        _transformAndPush(this, [
            ...loopArray(24, i => {
                const a = i.p * Math.PI;
                return va.clone()
                    .addScaledVector(v, radius * Math.cos(a)).
                    addScaledVector(u, -radius * Math.sin(a));
            }),
            ...loopArray(24, i => {
                const a = i.p * Math.PI;
                return vb.clone()
                    .addScaledVector(v, -radius * Math.cos(a)).
                    addScaledVector(u, radius * Math.sin(a));
            }),
        ], options, true, true);
        return this;
    }
    polygon(points, options) {
        const newPoints = points.map(v => fromVector3Declaration(v));
        const pairs = [];
        for (let i = 0; i < newPoints.length; i++)
            pairs.push(newPoints[i], newPoints[(i + 1) % newPoints.length]);
        _transformAndPush(this, pairs, options);
        return this;
    }
    polyline(points, options) {
        const newPoints = points.map(v => fromVector3Declaration(v));
        const pairs = [];
        for (let i = 0; i < newPoints.length - 1; i++)
            pairs.push(newPoints[i], newPoints[i + 1]);
        _transformAndPush(this, pairs, options);
        return this;
    }
    static circleDefaultOptions = {
        plane: 'XY',
        x: 0,
        y: 0,
        z: 0,
        radius: .5,
        segments: 96,
    };
    circle(...args) {
        const solveArgs = () => {
            if (args.length > 1) {
                const [center, radius, options] = args;
                const { x, y } = fromVector2Declaration(center, _vector2);
                return { x, y, radius, ...options };
            }
            return args[0];
        };
        const { x, y, z, radius, segments, plane, ...optionsRest } = { ...LineHelper.circleDefaultOptions, ...solveArgs() };
        const vx = new Vector3(1, 0, 0);
        const vy = new Vector3(0, 1, 0);
        const points = [];
        for (let i = 0; i < segments; i++) {
            const a0 = i / segments * Math.PI * 2;
            const a1 = (i + 1) / segments * Math.PI * 2;
            const x0 = Math.cos(a0) * radius;
            const y0 = Math.sin(a0) * radius;
            const x1 = Math.cos(a1) * radius;
            const y1 = Math.sin(a1) * radius;
            const v0 = new Vector3(x, y, z)
                .addScaledVector(vx, x0)
                .addScaledVector(vy, y0);
            const v1 = new Vector3(x, y, z)
                .addScaledVector(vx, x1)
                .addScaledVector(vy, y1);
            points.push(v0, v1);
        }
        if (plane === 'XZ') {
            for (const point of points) {
                point.set(point.x, 0, point.y);
            }
        }
        if (plane === 'YZ') {
            for (const point of points) {
                point.set(0, point.x, point.y);
            }
        }
        _transformAndPush(this, points, optionsRest);
        return this;
    }
    /**
     * Calls `circle` three times with the same options but for the XY, XZ and YZ
     * planes.
     *
     * NOTE: This is not very optimized, as it creates three circles wihout reusing
     * the points. But you know, it's just a helper.
     */
    sphere(options) {
        return this
            .circle({ ...options, plane: 'XY' })
            .circle({ ...options, plane: 'XZ' })
            .circle({ ...options, plane: 'YZ' });
    }
    rectangle(rect, options) {
        const { centerX: x, centerY: y, width, height } = Rectangle.from(rect);
        const w2 = width / 2;
        const h2 = height / 2;
        const a = new Vector3(x - w2, y - h2, 0);
        const b = new Vector3(x + w2, y - h2, 0);
        const c = new Vector3(x + w2, y + h2, 0);
        const d = new Vector3(x - w2, y + h2, 0);
        _transformAndPush(this, [a, b, b, c, c, d, d, a], options);
        return this;
    }
    placeholder(rect, options) {
        const r = Rectangle.from(rect);
        return this
            .rectangle(r, options)
            .line(r.fromRelativePoint(0, 0), r.fromRelativePoint(1, 1), options)
            .line(r.fromRelativePoint(1, 0), r.fromRelativePoint(0, 1), options);
    }
    static grid2DefaultOptions = {
        plane: 'XY',
        x: 0,
        y: 0,
        z: 0,
        size: 8,
        width: undefined,
        height: undefined,
        subdivisions: undefined,
        widthSubdivisions: undefined,
        heightSubdivisions: undefined,
    };
    grid2(gridOptions) {
        const options = { ...LineHelper.grid2DefaultOptions, ...gridOptions };
        const { plane, x, y, z, size, subdivisions, width, height, widthSubdivisions, heightSubdivisions, ...rest } = options;
        let { x: sz_x, y: sz_y } = fromVector2Declaration(size, _vector2);
        let { x: sd_x, y: sd_y } = fromVector2Declaration(subdivisions ?? size);
        if (width) {
            sz_x = width;
        }
        if (height) {
            sz_y = height;
        }
        if (widthSubdivisions) {
            sd_x = widthSubdivisions;
        }
        if (heightSubdivisions) {
            sd_y = heightSubdivisions;
        }
        const w2 = sz_x / 2;
        const h2 = sz_y / 2;
        const points = [];
        for (let i = 0; i <= sd_x; i++) {
            const x = i / sd_x * sz_x - w2;
            points.push(new Vector3(x, -h2, 0), new Vector3(x, h2, 0));
        }
        for (let i = 0; i <= sd_y; i++) {
            const y = i / sd_y * sz_y - h2;
            points.push(new Vector3(-w2, y, 0), new Vector3(w2, y, 0));
        }
        const center = new Vector3(x, y, z);
        for (const point of points) {
            point.add(center);
        }
        if (plane === 'XZ') {
            for (const point of points) {
                point.set(point.x, 0, point.y);
            }
        }
        if (plane === 'YZ') {
            for (const point of points) {
                point.set(0, point.x, point.y);
            }
        }
        _transformAndPush(this, points, rest);
        return this;
    }
    /**
     * NOTE: "Transform option" is not implemented here.
     */
    box(options = {}) {
        let x = 0, y = 0, z = 0;
        let sx = 1, sy = 1, sz = 1;
        const { center, size, box3 } = options;
        if (center !== undefined) {
            ({ x, y, z } = fromVector3Declaration(center, _vector3));
        }
        if (size !== undefined) {
            ({ x: sx, y: sy, z: sz } = fromVector3Declaration(size, _vector3));
        }
        if (box3 !== undefined) {
            const { min, max } = box3;
            const { x: minx, y: miny, z: minz } = min;
            let { x: maxx, y: maxy, z: maxz } = max;
            if (options.asIntBox3) {
                maxx += 1;
                maxy += 1;
                maxz += 1;
            }
            x = (minx + maxx) / 2;
            y = (miny + maxy) / 2;
            z = (minz + maxz) / 2;
            sx = maxx - minx;
            sy = maxy - miny;
            sz = maxz - minz;
        }
        const halfX = sx / 2;
        const halfY = sy / 2;
        const halfZ = sz / 2;
        const a = new Vector3(x - halfX, y - halfY, z - halfZ);
        const b = new Vector3(x + halfX, y - halfY, z - halfZ);
        const c = new Vector3(x + halfX, y + halfY, z - halfZ);
        const d = new Vector3(x - halfX, y + halfY, z - halfZ);
        const e = new Vector3(x - halfX, y - halfY, z + halfZ);
        const f = new Vector3(x + halfX, y - halfY, z + halfZ);
        const g = new Vector3(x + halfX, y + halfY, z + halfZ);
        const h = new Vector3(x - halfX, y + halfY, z + halfZ);
        this.points.push(a, b, b, c, c, d, d, a);
        this.points.push(e, f, f, g, g, h, h, e);
        this.points.push(a, e, b, f, c, g, d, h);
        return this;
    }
    plus(center = 0, size = 1, options) {
        const half = size / 2;
        const { x, y } = fromVector2Declaration(center, _vector2);
        const a = new Vector3(x - half, y, 0);
        const b = new Vector3(x + half, y, 0);
        const c = new Vector3(x, y - half, 0);
        const d = new Vector3(x, y + half, 0);
        _transformAndPush(this, [a, b, c, d], options);
        return this;
    }
    cross(center = 0, size = 1, options) {
        const half = size / 2;
        const { x, y } = fromVector2Declaration(center, _vector2);
        const a = new Vector3(x - half, y - half, 0);
        const b = new Vector3(x + half, y + half, 0);
        const c = new Vector3(x - half, y + half, 0);
        const d = new Vector3(x + half, y - half, 0);
        _transformAndPush(this, [a, b, c, d], options);
        return this;
    }
}
//# sourceMappingURL=line.js.map