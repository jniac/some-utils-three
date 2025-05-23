import { DataTexture, RGBAFormat, UnsignedByteType, Vector2 } from 'three';
import { ceilPowerOfTwo, toff } from 'some-utils-ts/math/basic';
import { makeColor } from '../../utils/make.js';
import { DATA_STRIDE_HEADER_BYTE_SIZE } from './types.js';
export class TextHelperData {
    metadata;
    array;
    texture;
    get textCount() { return this.metadata.textCount; }
    get lineCount() { return this.metadata.lineCount; }
    get lineLength() { return this.metadata.lineLength; }
    get strideHeaderByteSize() { return this.metadata.strideHeaderByteSize; }
    get strideByteSize() { return this.metadata.strideByteSize; }
    get textureSize() { return new Vector2(this.metadata.textureWidth, this.metadata.textureHeight); }
    constructor(symbols, textCount, lineCount, lineLength, { defaultColor = '#ffffff', defaultTextOpacity = 1, defaultBackgroundOpacity = 0, } = {}) {
        const strideHeader = DATA_STRIDE_HEADER_BYTE_SIZE + lineCount * 4;
        const stride = strideHeader + Math.ceil((lineCount * lineLength) / 4) * 4;
        const bytes = strideHeader + textCount * stride;
        const pixels = Math.ceil(bytes / 4);
        const width = ceilPowerOfTwo(Math.sqrt(pixels));
        const height = Math.ceil(pixels / width);
        this.metadata = {
            symbols,
            textCount,
            lineCount,
            lineLength,
            strideHeaderByteSize: strideHeader,
            strideByteSize: stride,
            textureWidth: width,
            textureHeight: height,
        };
        const array = new Uint8Array(width * height * 4);
        const { r, g, b } = makeColor(defaultColor);
        for (let i = 0; i < textCount; i++) {
            let offset = i * stride;
            // Text
            offset += 4;
            array[offset + 0] = 255 * r;
            array[offset + 1] = 255 * g;
            array[offset + 2] = 255 * b;
            array[offset + 3] = 255 * defaultTextOpacity;
            // Background
            offset += 4;
            array[offset + 0] = 255 * r;
            array[offset + 1] = 255 * g;
            array[offset + 2] = 255 * b;
            array[offset + 3] = 255 * defaultBackgroundOpacity;
        }
        this.array = array;
        this.texture = new DataTexture(array, width, height, RGBAFormat, UnsignedByteType);
        this.texture.needsUpdate = true;
    }
    encode() {
        const metadataString = JSON.stringify(this.metadata);
        const metadataBytes = new TextEncoder().encode(metadataString);
        const metadataLength = metadataBytes.length;
        const sizeLength = 4;
        const sizeBytes = new Uint8Array(sizeLength);
        new DataView(sizeBytes.buffer).setUint32(0, metadataLength, true);
        const content = new Uint8Array(sizeLength + metadataLength + this.array.length);
        content.set(sizeBytes, 0);
        content.set(metadataBytes, sizeLength);
        content.set(this.array, sizeLength + metadataLength);
        return content;
    }
    static decode(data) {
        const sizeLength = 4;
        const metadataLength = new DataView(data.buffer).getUint32(0, true);
        const metadataBytes = data.slice(sizeLength, sizeLength + metadataLength);
        const metadataString = new TextDecoder().decode(metadataBytes);
        const metadata = JSON.parse(metadataString);
        const instance = new TextHelperData(metadata.symbols, metadata.textCount, metadata.lineCount, metadata.lineLength);
        const array = data.slice(sizeLength + metadataLength);
        instance.array.set(array);
        return instance;
    }
    info() {
        return `data: ${this.array.length} bytes, ${this.textureSize.x}x${this.textureSize.y}`;
    }
    getTextAt(index) {
        const { array } = this;
        const { symbols, lineLength, strideByteSize: stride, strideHeaderByteSize: strideHeader, } = this.metadata;
        const offset = index * stride;
        const currentLineCount = array[offset + 0];
        const currentLineLength = array[offset + DATA_STRIDE_HEADER_BYTE_SIZE];
        const f = (n) => n.toString(16).padStart(2, '0');
        const textColor = `#${f(array[offset + 4 * 1])}${f(array[offset + 4 * 1 + 1])}${f(array[offset + 4 * 1 + 2])}`;
        const textOpacity = array[offset + 4 * 1 + 3];
        const backgroundColor = `#${f(array[offset + 4 * 2])}${f(array[offset + 4 * 2 + 1])}${f(array[offset + 4 * 2 + 2])}`;
        const backgroundOpacity = array[offset + 4 * 2 + 3];
        const lines = [];
        for (let i = 0; i < currentLineCount; i++) {
            const lineOffset = offset + strideHeader + i * lineLength;
            const line = [];
            for (let j = 0; j < currentLineLength; j++) {
                const k = lineOffset + j;
                const charIndex = array[k];
                const char = symbols[charIndex];
                line.push(char);
            }
            lines.push(line.join(''));
        }
        const text = lines.join('\n');
        return {
            text,
            textColor,
            textOpacity,
            backgroundColor,
            backgroundOpacity,
            currentLineCount,
            currentLineLength,
        };
    }
    setSizeAt(index, size) {
        const { array } = this;
        const { strideByteSize: stride } = this.metadata;
        const offset = index * stride;
        new DataView(array.buffer).setFloat32(offset + 4 * 3, size);
        return this;
    }
    setColorAt(index, options) {
        const { color, opacity, textColor = color, textOpacity = opacity, backgroundColor = textColor, backgroundOpacity = opacity ?? options.backgroundColor ? 1 : 0, } = options;
        const { array } = this;
        const { strideByteSize: stride } = this.metadata;
        {
            // Text
            const offset = index * stride + 4 * 1;
            if (textColor !== undefined) {
                const { r, g, b } = makeColor(textColor);
                array[offset + 0] = r * 255;
                array[offset + 1] = g * 255;
                array[offset + 2] = b * 255;
            }
            if (textOpacity !== undefined) {
                array[offset + 3] = toff(textOpacity);
            }
        }
        {
            // Background      
            const offset = index * stride + 4 * 2;
            if (backgroundColor !== undefined) {
                const { r, g, b } = makeColor(backgroundColor);
                array[offset + 0] = r * 255;
                array[offset + 1] = g * 255;
                array[offset + 2] = b * 255;
            }
            if (backgroundOpacity !== undefined) {
                array[offset + 3] = toff(backgroundOpacity);
            }
        }
        this.texture.needsUpdate = true;
        return this;
    }
    setTextAt(index, text, options = {}) {
        const { trim = false, size = 1, ...colorOptions } = options;
        this.setColorAt(index, colorOptions);
        this.setSizeAt(index, size);
        const { array } = this;
        const { symbols, lineCount, lineLength, strideByteSize: stride, strideHeaderByteSize: strideHeader, } = this.metadata;
        let lines = (trim ? text.trim() : text).split('\n');
        if (lines.length > lineCount) {
            console.warn(`TextHelper: Text has more lines than ${lineCount}, truncating.`);
            lines = lines.slice(0, lineCount);
        }
        lines = lines.map(line => {
            if (trim)
                line = line.trim();
            // Check if line is too long
            if (line.length > lineLength) {
                console.warn(`TextHelper: Line length is greater than ${lineLength} characters, clamping.`);
                return line.slice(0, lineLength);
            }
            return line;
        });
        {
            const offset = index * stride;
            array[offset + 0] = lines.length;
        }
        const offset = index * stride;
        const currentLineCount = lines.length;
        for (let i = 0; i < lineCount; i++) {
            let currentLineLength = 0;
            if (i < currentLineCount) {
                array[offset + DATA_STRIDE_HEADER_BYTE_SIZE + i * 4] = lines[i].length;
                currentLineLength = lines[i].length;
            }
            const lineOffset = offset + strideHeader + i * lineLength;
            for (let j = 0; j < lineLength; j++) {
                const k = lineOffset + j;
                if (i >= currentLineCount || j >= currentLineLength) {
                    array[k] = 0;
                }
                else {
                    const charIndex = symbols.indexOf(lines[i].charAt(j));
                    // let charIndex = 1 + j * (1 + i)
                    array[k] = charIndex === -1 ? 0 : charIndex;
                }
            }
        }
        this.texture.needsUpdate = true;
    }
}
//# sourceMappingURL=data.js.map