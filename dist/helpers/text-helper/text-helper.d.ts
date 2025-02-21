import { BufferGeometry, Color, DataTexture, InstancedMesh, MeshBasicMaterial, Vector2 } from 'three';
import { TransformDeclaration } from '../../declaration';
import { TextHelperAtlas } from './atlas';
import { SetColorOptions, SetTextOption, TextHelperData } from './data';
export declare enum Orientation {
    Normal = 0,
    Billboard = 1
}
declare const defaultOptions: {
    textCount: number;
    lineLength: number;
    lineCount: number;
    charSize: Vector2;
    textSize: number;
    orientation: Orientation;
};
export declare class TextHelper extends InstancedMesh<BufferGeometry, MeshBasicMaterial> {
    static readonly defaultOptions: {
        textCount: number;
        lineLength: number;
        lineCount: number;
        charSize: Vector2;
        textSize: number;
        orientation: Orientation;
    };
    static readonly Orientation: typeof Orientation;
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
    setData(data: TextHelperData): this;
    setTextAt(index: number, text: string, options?: TransformDeclaration & SetTextOption): this;
    setColorAt(index: number, color: Color): void;
    setTextColorAt(index: number, options: SetColorOptions): this;
    getDataStringView(start?: number, length?: number): string;
}
export {};
