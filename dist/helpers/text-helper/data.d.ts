import { ColorRepresentation, Vector2 } from 'three';
/**
 * Byte size of the info:
 * #0:
 * - Lines count (1 byte)
 * - empty (3 bytes)
 * #1:
 * - Text Color (3 bytes)
 * - Text Opacity (1 byte)
 * #2:
 * - Background Color (3 bytes)
 * - Background Opacity (1 byte)
 * #3:
 * - size (4 bytes)
 *
 * Should be a multiple of 4.
 */
export declare const DATA_STRIDE_HEADER_BYTE_SIZE: number;
export type SetColorOptions = Partial<{
    /**
     * Sugar for `textColor`
     */
    color: ColorRepresentation;
    /**
     * The color of the text.
     */
    textColor: ColorRepresentation;
    /**
     * The opacity of the text.
     * @default 1
     */
    textOpacity: number;
    /**
     * The color of the background.
     */
    backgroundColor: ColorRepresentation;
    /**
     * The opacity of the background.
     * @default 0
     */
    backgroundOpacity: number;
}>;
export type SetTextOption = SetColorOptions & Partial<{
    /**
     * Whether to trim the text before setting it.
     * @default false
     */
    trim: boolean;
    /**
     * The size of the text.
     * @default 1
     */
    size: number;
}>;
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
