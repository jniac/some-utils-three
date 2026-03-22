const controlInputs = [
  'shift',
  'alt',
  'control',
  'meta',
] as const

export type ControlInput = (typeof controlInputs)[number]

export type ControlInputString = '' |
  `${ControlInput}` |
  `${ControlInput}+${ControlInput}` |
  `${ControlInput}+${ControlInput}+${ControlInput}` |
  `${ControlInput}+${ControlInput}+${ControlInput}+${ControlInput}`

export function matchControlInput(
  object: { altKey: boolean; ctrlKey: boolean; shiftKey: boolean; metaKey: boolean },
  keys: ControlInput[]) {
  return keys.every(key => (object as any)[`${key}Key`])
}

export function parseInputs(inputs: string) {
  const parts = inputs.split('+')
  return parts.filter(part => {
    if (part === '') {
      return false
    }
    const ok = controlInputs.includes(part as ControlInput)
    if (!ok) {
      console.warn(`Invalid input: ${part}`)
    }
    return ok
  }) as ControlInput[]
}
