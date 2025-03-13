import { CanvasTexture, Vector2 } from 'three'

import { ceilPowerOfTwo } from 'some-utils-ts/math/basic'

function getDefaultSymbols() {
  const unknown = '�'
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const diacritics = 'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ'
  const numbers = '0123456789'
  const punctuation = ' .,!?¿:;-+*/=%&|()[]{}<>$\'’"'
  return [...new Set([unknown, ...alphabet, ...diacritics, ...numbers, ...punctuation])].join('')
}

function computeGrid(count: number, aspect: number, out = new Vector2()) {
  out.x = Math.ceil(Math.sqrt(count / aspect))
  out.y = Math.ceil(count / out.x)
  return out
}

export class TextHelperAtlas {
  static getDefaultSymbols = getDefaultSymbols

  canvas: HTMLCanvasElement
  texture: CanvasTexture
  symbols: string
  charGrid: Vector2

  constructor() {
    const symbols = getDefaultSymbols()
    const charSize = new Vector2(16, 24)
    const charAspect = charSize.x / charSize.y
    const charGrid = computeGrid(symbols.length, charAspect)
    const pixelRatio = 3
    const fullCharSize = charSize.clone().multiplyScalar(pixelRatio)
    const width = ceilPowerOfTwo(fullCharSize.x * charGrid.x)
    const height = ceilPowerOfTwo(fullCharSize.y * charGrid.y)
    const scaleX = width / (fullCharSize.x * charGrid.x)
    const scaleY = height / (fullCharSize.y * charGrid.y)
    const charScaleRatio = .8

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')!
    ctx.font = `${fullCharSize.y * charScaleRatio}px monospace`
    ctx.textBaseline = 'top'
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = 'white'
    ctx.transform(scaleX, 0, 0, scaleY, 0, 0)
    for (let i = 0; i < symbols.length; i++) {
      const iy = Math.floor(i / charGrid.x)
      const ix = i - iy * charGrid.x
      const x = (ix + .12) * fullCharSize.x
      const y = fullCharSize.y * (iy + (1 - charScaleRatio))
      ctx.fillText(symbols[i], x, y)
    }

    this.canvas = canvas
    this.texture = new CanvasTexture(canvas)
    this.symbols = symbols
    this.charGrid = charGrid
  }
}
