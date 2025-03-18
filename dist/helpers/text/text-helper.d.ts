import { BufferGeometry, Color, ColorRepresentation, DataTexture, InstancedMesh, MeshBasicMaterial, Object3D, Vector2 } from 'three';
import { TransformDeclaration, Vector2Declaration } from '../../declaration';
import { TextHelperAtlas } from './atlas';
import { SetColorOptions, SetTextOption, TextHelperData } from './data';
declare const orientations: {
    oriented: number;
    billboard: number;
};
declare const defaultOptions: {
    textCount: number;
    lineLength: number;
    lineCount: number;
    charSize: Vector2;
    textSize: number;
    textOffset: Vector2Declaration;
    orientation: (keyof typeof orientations) | number;
    defaultColor: ColorRepresentation;
    defaultOpacity: number;
    defaultBackgroundColor: ColorRepresentation;
    defaultBackgroundOpacity: number;
    defaultSize: number;
};
export declare class TextHelper extends InstancedMesh<BufferGeometry, MeshBasicMaterial> {
    static readonly defaultOptions: {
        textCount: number;
        lineLength: number;
        lineCount: number;
        charSize: Vector2;
        textSize: number;
        textOffset: Vector2Declaration;
        orientation: (keyof typeof orientations) | number;
        defaultColor: ColorRepresentation;
        defaultOpacity: number;
        defaultBackgroundColor: ColorRepresentation;
        defaultBackgroundOpacity: number;
        defaultSize: number;
    };
    static readonly Orientation: {
        Normal: number;
        Billboard: number;
    };
    static readonly Atlas: typeof TextHelperAtlas;
    static readonly Data: typeof TextHelperData;
    readonly textHelperId: number;
    readonly options: typeof defaultOptions;
    readonly derived: {
        planeSize: Vector2;
    };
    atlas: TextHelperAtlas;
    data: TextHelperData;
    dataTexture: DataTexture;
    constructor(userOptions?: Partial<typeof defaultOptions>);
    addTo(parent: Object3D | null): this;
    onTop(value?: boolean): this;
    setData(data: TextHelperData): this;
    clearAllText(): this;
    setTextAt(index: number, text: string, options?: TransformDeclaration & SetTextOption): this;
    setColorAt(index: number, color: Color): void;
    setTextColorAt(index: number, options: SetColorOptions): this;
    getDataStringView(start?: number, length?: number): string;
}
export {};
