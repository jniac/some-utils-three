import { BufferGeometry, Camera, GreaterDepth, Group, Intersection, Object3D, Points, PointsMaterial, Raycaster, Texture, Vector2, Vector2Like, Vector3 } from 'three'

const _raycaster = new Raycaster()
const _pointer = new Vector2()

function defaultIgnoreObject(object: Object3D) {
  if (object.userData.helper)
    return true
  if (object.userData.isHelper)
    return true
  return false
}

/**
 * Returns the first intersection of the pointer with the objects in the scene, or null if there is no intersection.
 * 
 * Notes:
 * - This function traverses the scene graph in a breadth-first manner.
 */
export function findIntersection(
  pointer: Vector2Like,
  camera: Camera,
  root: Object3D,
  ignore: (object: Object3D) => boolean = defaultIgnoreObject,
): Intersection | null {
  _pointer.set(pointer.x, pointer.y)
  _raycaster.setFromCamera(_pointer, camera)
  const queue = [root]
  let nearestIntersection: Intersection | null = null
  while (queue.length > 0) {
    const object = queue.shift()!
    const [intersection] = _raycaster.intersectObject(object, false)
    if (intersection && (!nearestIntersection || intersection.distance < nearestIntersection.distance)) {
      nearestIntersection = intersection
    }
    for (const child of object.children) {
      if (ignore(child))
        continue
      queue.push(child)
    }
  }
  return nearestIntersection
}
export function vertigoTexture() {
  const create = () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = 1024
    canvas.height = 256
    ctx.fillStyle = 'white'
    ctx.font = '200px Fira Code'
    ctx.textBaseline = 'top'
    ctx.fillText('Vertigo', 20, 20)

    const texture = new Texture(canvas)
    texture.needsUpdate = true

    return texture
  }

  let texture: Texture | undefined
  return texture ??= create()
}

export function cursorTexture() {
  const create = () => {
    const data = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAOdEVYdFNvZnR3YXJlAEZpZ21hnrGWYwAAAKNJREFUeAHtl7ENQyEMRM9kAUZgBDaCNeiyKbRUsAHBSBRJhyN9Gj8JCQrsV3EYAIZkhRBGa23knNdeWgfSi9x4wyLSOrQtTpl9v85EBAkGl1EBFVABFVABM5MMM0zW236yfjm9P8MM3Js41ZxzuEHvHcZai1uwwKvW+vbe42kRbp5Sgv4HVEAFVEAFVEAswGGyKaXgH0RTbYxxTcg8GfNeWucD31LpV0S4Fi4AAAAASUVORK5CYII=`
    const image = new Image()
    image.src = data
    const texture = new Texture(image)
    image.onload = () => {
      texture.needsUpdate = true
    }
    return texture
  }

  let texture: Texture | undefined
  return texture ??= create()
}

export class PointMarker extends Group {
  isPointMarker = true

  userData: Record<string, any> = {
    helper: true,
    ignoreRaycast: true,
  }

  constructor() {
    super()
    this.name = 'VertigoControls-CursorMarker'

    const geometry = new BufferGeometry().setFromPoints([new Vector3()])
    const alphaMap = cursorTexture()
    const frontMaterial = new PointsMaterial({
      size: 20,
      sizeAttenuation: false,
      transparent: true,
      alphaMap: alphaMap,
    })

    const front = new Points(geometry, frontMaterial)
    front.name = 'VertigoControls-CursorMarker-Front'

    const backMaterial = frontMaterial.clone()
    backMaterial.opacity = .25
    backMaterial.depthFunc = GreaterDepth
    const back = new Points(geometry, backMaterial)
    back.name = 'VertigoControls-CursorMarker-Back'
    back.renderOrder = 1000

    this.add(front, back)
  }
}
