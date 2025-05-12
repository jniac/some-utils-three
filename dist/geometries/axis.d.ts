import { BufferGeometry, ColorRepresentation } from 'three';
declare const defaultAxisOptions: {
    /**
     * The axis of the axis. Determines its orientations. Defaults to "x".
     */
    axis: "x" | "y" | "z";
    /**
     * The length of the axis. Defaults to 1.
     */
    length: number;
    /**
     * The number of the radial segments. Defaults to 12.
     */
    radialSegments: number;
    radius: number;
    coneRatio: number;
    radiusScale: number;
    vertexColor: boolean;
    baseCap: "none" | "flat" | "sphere";
    color: ColorRepresentation;
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