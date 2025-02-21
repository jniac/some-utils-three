import { Box3, BufferGeometry, Color, ColorRepresentation, LineBasicMaterial, LineSegments, Material, Vector3 } from 'three';
import { RectangleDeclaration } from 'some-utils-ts/math/geom/rectangle';
import { TransformDeclaration, Vector2Declaration, Vector3Declaration } from '../declaration';
type BasicOptions = Partial<{
    transform: TransformDeclaration;
    color: ColorRepresentation;
}>;
export declare class LineHelper<T extends Material & {
    color: ColorRepresentation;
} = LineBasicMaterial> extends LineSegments<BufferGeometry, T> {
    points: Vector3[];
    colors: Map<number, Color>;
    state: {
        forceTransparent: boolean;
        hasAlreadyBeenRendered: boolean;
        reservePoints: number;
    };
    /**
     * @param reservePoints If you know the number of points that will be added, you can set this value to avoid to overallocate memory later.
     */
    constructor(reservePoints?: number, material?: T);
    /**
     * Returns an iterator that yields all the unique points in the line (no duplicates).
     */
    uniquePoints(): Generator<Vector3, void, any>;
    /**
     * Set the "opacity" property of the material and automatically set the material
     * as "transparent" if the value is less that one.
     */
    opacity(value: number): this;
    /**
     * Set the current color, from now on, all points added will have this color.
     */
    color(value: ColorRepresentation): this;
    /**
     * Force the material to be transparent, even if the opacity is set to 1.
     */
    forceTransparent(): this;
    translate(delta: Vector3Declaration): this;
    translate(x: number, y: number, z: number): this;
    rescale(delta: Vector3Declaration): this;
    rescale(x: number, y: number, z: number): this;
    showOccludedLines({ opacity }?: {
        opacity?: number | undefined;
    }): this;
    clear(): this;
    draw(): this;
    line(a: Vector3Declaration, b: Vector3Declaration, options?: BasicOptions): this;
    capsule2(a: Vector2Declaration, b: Vector2Declaration, radius: number, options?: BasicOptions): this;
    polygon(points: Vector3Declaration[], options?: BasicOptions): this;
    polyline(points: Vector3Declaration[], options?: BasicOptions): this;
    static circleDefaultOptions: {
        plane: "XY" | "XZ" | "YZ";
        x: number;
        y: number;
        z: number;
        radius: number;
        segments: number;
    };
    circle(options?: BasicOptions & Partial<typeof LineHelper.circleDefaultOptions>): this;
    circle(center: Vector2Declaration, radius: number, options?: BasicOptions & Partial<typeof LineHelper.circleDefaultOptions>): this;
    /**
     * Calls `circle` three times with the same options but for the XY, XZ and YZ
     * planes.
     *
     * NOTE: This is not very optimized, as it creates three circles wihout reusing
     * the points. But you know, it's just a helper.
     */
    sphere(options: Omit<BasicOptions & Partial<typeof LineHelper.circleDefaultOptions>, 'plane'>): this;
    rectangle(rect?: RectangleDeclaration, options?: BasicOptions): this;
    placeholder(rect?: RectangleDeclaration, options?: BasicOptions): this;
    static grid2DefaultOptions: {
        plane: "XY" | "XZ" | "YZ";
        x: number;
        y: number;
        z: number;
        size: Vector2Declaration;
        width: number | undefined;
        height: number | undefined;
        subdivisions: Vector2Declaration | undefined;
        widthSubdivisions: number | undefined;
        heightSubdivisions: number | undefined;
    };
    grid2(gridOptions?: Partial<typeof LineHelper.grid2DefaultOptions> & BasicOptions): this;
    /**
     * NOTE: "Transform option" is not implemented here.
     */
    box(options?: BasicOptions & Partial<{
        center: Vector3Declaration;
        size: Vector3Declaration;
        box3: Box3;
        /**
         * If true, the box will be drawn as an integer box (inclusive of the max values).
         */
        asIntBox3: boolean;
    }>): this;
    plus(center?: Vector2Declaration, size?: number, options?: BasicOptions): this;
    cross(center?: Vector2Declaration, size?: number, options?: BasicOptions): this;
}
export {};
