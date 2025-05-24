import { BufferGeometry, ColorRepresentation } from 'three';
declare const defaultAxisOptions: {
    /**
     * The axis of the axis. Determines its orientations.
     * @default 'x'.
     */
    axis: "x" | "y" | "z";
    /**
     * The length of the axis.
     * @default 1.
     */
    length: number;
    /**
     * The number of the radial segments.
     * @default 12.
     */
    radialSegments: number;
    /**
     * The radius of the axis.
     * @default 0.01
     */
    radius: number;
    /**
     * The ratio of the cone to the length of the axis.
     * @default 0.1
     */
    coneRatio: number;
    /**
     * The scale of the radius.
     * @default 1
     */
    radiusScale: number;
    /**
     * Whether to use vertex colors.
     * @default true
     */
    vertexColor: boolean;
    /**
     * The base cap of the axis.
     * @default 'flat'
     */
    baseCap: "none" | "flat" | "sphere";
    /**
     * The color of the axis.
     * @default 'white'
     */
    color: ColorRepresentation;
    /**
     * The alignment of the axis.
     * @default 0
     */
    align: number;
};
export declare class AxisGeometry extends BufferGeometry {
    constructor(options?: Partial<typeof defaultAxisOptions>);
}
declare const defaultAxesOptions: {
    xColor: string;
    yColor: string;
    zColor: string;
};
type AxesOptions = typeof defaultAxesOptions & Omit<typeof defaultAxisOptions, 'color'>;
export declare class AxesGeometry extends BufferGeometry {
    static get defaultOptions(): {
        xColor: string;
        yColor: string;
        zColor: string;
    };
    constructor(options?: Partial<AxesOptions>);
}
export {};
//# sourceMappingURL=axis.d.ts.map