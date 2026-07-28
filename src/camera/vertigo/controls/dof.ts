export type Axis = 'x' | 'y' | 'z'
export type AxisSet = Axis | `${Axis}${Axis}` | `${Axis}${Axis}${Axis}`

export type DOFConstraintDeclaration =
  | 'free'
  | 'fixed'
  | 'position-only'
  | 'rotation-only'
  | Partial<{
    position: 'fixed' | 'free' | AxisSet
    rotation: 'fixed' | 'free' | AxisSet
    zoom: 'fixed' | 'free'
    // zoom etc?
  }>

export class DOFConstraint {
  positionX!: boolean
  positionY!: boolean
  positionZ!: boolean
  rotationX!: boolean
  rotationY!: boolean
  rotationZ!: boolean
  zoom!: boolean

  constructor(constraint: DOFConstraintDeclaration = 'free') {
    this.set(constraint)
  }

  set(constraint: DOFConstraintDeclaration) {
    if (constraint === 'free') {
      this.positionX = true
      this.positionY = true
      this.positionZ = true
      this.rotationX = true
      this.rotationY = true
      this.rotationZ = true
      this.zoom = true
    } else if (constraint === 'fixed') {
      this.positionX = false
      this.positionY = false
      this.positionZ = false
      this.rotationX = false
      this.rotationY = false
      this.rotationZ = false
      this.zoom = false
    } else if (constraint === 'position-only') {
      this.positionX = true
      this.positionY = true
      this.positionZ = true
      this.rotationX = false
      this.rotationY = false
      this.rotationZ = false
      this.zoom = false
    } else if (constraint === 'rotation-only') {
      this.positionX = false
      this.positionY = false
      this.positionZ = false
      this.rotationX = true
      this.rotationY = true
      this.rotationZ = true
      this.zoom = false
    } else {
      // explicit constraint
      const { position = 'free', rotation = 'free', zoom = 'free' } = constraint

      if (position === 'fixed') {
        this.positionX = false
        this.positionY = false
        this.positionZ = false
      } else if (position === 'free') {
        this.positionX = true
        this.positionY = true
        this.positionZ = true
      } else {
        const positionSet = new Set(position.split('') as Axis[])
        this.positionX = positionSet.has('x')
        this.positionY = positionSet.has('y')
        this.positionZ = positionSet.has('z')
      }

      if (rotation === 'fixed') {
        this.rotationX = false
        this.rotationY = false
        this.rotationZ = false
      } else if (rotation === 'free') {
        this.rotationX = true
        this.rotationY = true
        this.rotationZ = true
      } else {
        const rotationSet = new Set(rotation.split('') as Axis[])
        this.rotationX = rotationSet.has('x')
        this.rotationY = rotationSet.has('y')
        this.rotationZ = rotationSet.has('z')
      }
      if (zoom === 'fixed') {
        this.zoom = false
      } else if (zoom === 'free') {
        this.zoom = true
      }
    }
  }
}