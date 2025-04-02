import { BufferGeometry, Color, InstancedMesh, Material, Object3D, Vector2 } from 'three';
import { TransformDeclaration } from '../../declaration';
import { TextHelperAtlas } from './atlas';
import { TextHelperData } from './data';
import { optionsDefaults, SetColorOptions, SetTextOption } from './types';
export declare class TextHelper extends InstancedMesh<BufferGeometry, Material> {
    static readonly defaultOptions: {
        textCount: number;
        lineLength: number;
        lineCount: number;
        charSize: Vector2;
        textSize: number;
        textOffset: import("some-utils-ts/declaration").Vector2Declaration;
        orientation: (keyof typeof import("./types").orientations) | import("./types").Orientation;
        textDefaults: SetTextOption;
    };
    static readonly Atlas: typeof TextHelperAtlas;
    static readonly Data: typeof TextHelperData;
    readonly textHelperId: number;
    readonly options: typeof optionsDefaults;
    readonly derived: {
        planeSize: Vector2;
    };
    atlas: TextHelperAtlas;
    data: TextHelperData;
    constructor(userOptions?: Partial<typeof optionsDefaults>);
    /**
     * Apply a transform to all text instances (not the TextHelper itself).
     */
    applyTransform(...transforms: TransformDeclaration[]): this;
    addTo(parent: Object3D | null): this;
    onTop(renderOrder?: number): this;
    setData(data: TextHelperData): this;
    clearAllText(): this;
    setTextAt(index: number, text: string, options?: SetTextOption): this;
    setColorAt(index: number, color: Color): void;
    setTextColorAt(index: number, options: SetColorOptions): this;
    getDataStringView(start?: number, length?: number): string;
}
