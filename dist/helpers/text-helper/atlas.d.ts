import { CanvasTexture, Vector2 } from 'three';
declare function getDefaultSymbols(): string;
export declare class TextHelperAtlas {
    static getDefaultSymbols: typeof getDefaultSymbols;
    canvas: HTMLCanvasElement;
    texture: CanvasTexture;
    symbols: string;
    charGrid: Vector2;
    constructor();
}
export {};
