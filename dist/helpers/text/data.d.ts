import { DataTexture, Vector2 } from 'three';
import { SetColorOptions, SetTextOption } from './types';
export declare class TextHelperData {
    readonly metadata: {
        symbols: string;
        textCount: number;
        lineCount: number;
        lineLength: number;
        strideHeaderByteSize: number;
        strideByteSize: number;
        textureWidth: number;
        textureHeight: number;
    };
    readonly array: Uint8Array;
    readonly texture: DataTexture;
    get textCount(): number;
    get lineCount(): number;
    get lineLength(): number;
    get strideHeaderByteSize(): number;
    get strideByteSize(): number;
    get textureSize(): Vector2;
    constructor(symbols: string, textCount: number, lineCount: number, lineLength: number, { defaultColor, defaultTextOpacity, defaultBackgroundOpacity, }?: {
        defaultColor?: string | undefined;
        defaultTextOpacity?: number | undefined;
        defaultBackgroundOpacity?: number | undefined;
    });
    encode(): Uint8Array<ArrayBuffer>;
    static decode(data: Uint8Array): TextHelperData;
    info(): string;
    getTextAt(index: number): {
        text: string;
        textColor: string;
        textOpacity: number;
        backgroundColor: string;
        backgroundOpacity: number;
        currentLineCount: number;
        currentLineLength: number;
    };
    setSizeAt(index: number, size: number): this;
    setColorAt(index: number, options: SetColorOptions): this;
    setTextAt(index: number, text: string, options?: SetTextOption): void;
}
