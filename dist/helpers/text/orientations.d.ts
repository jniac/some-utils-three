export declare const orientations: {
    readonly oriented: 0;
    readonly billboard: 1;
};
type Orientation = (typeof orientations)[keyof typeof orientations];
export declare function solveOrientation(orientation: string | number): Orientation;
export {};
