import { DataTexture, RGBAFormat, UnsignedByteType } from 'three'

export class WhiteTexture extends DataTexture {
  constructor() {
    const data = new Uint8Array(4 * 4 * 4)
    data.fill(0xff)
    super(data, 4, 4, RGBAFormat, UnsignedByteType)
    this.needsUpdate = true
  }
}
