import { BufferGeometry, ColorRepresentation, LineBasicMaterial, LineSegments } from 'three';
import { Vector2Declaration } from '../declaration';
declare const defaultSimpleGridProps: {
    color: ColorRepresentation;
    opacity: number;
    plane: "XY" | "XZ" | "YZ";
    size: Vector2Declaration;
    step: Vector2Declaration | undefined;
    /**
     * Whether to draw a frame around the grid.
     */
    frame: boolean;
};
type SimpleGridProps = Partial<typeof defaultSimpleGridProps>;
export declare class SimpleGridHelper extends LineSegments<BufferGeometry, LineBasicMaterial> {
    constructor(props?: SimpleGridProps);
    set(props: SimpleGridProps): this;
}
export {};
