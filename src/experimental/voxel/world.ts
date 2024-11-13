
const defaultWorldProps = {
  chunkSize: 16,
  voxelStateByteSize: 4,
}

export class World {
  readonly props: Readonly<typeof defaultWorldProps>
  constructor(props = defaultWorldProps) {
    this.props = props
  }

  getVoxelState(x: number, y: number, z: number) {
    return new Uint8Array(this.props.voxelStateByteSize)
  }
}
