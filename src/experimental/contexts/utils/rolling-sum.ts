export class RollingSum {
  #size: number
  #buffer: Float32Array
  #index = 0;
  #sum = 0;

  constructor(size: number) {
    this.#size = size
    this.#buffer = new Float32Array(size)
  }

  add(value: number): number {
    const oldValue = this.#buffer[this.#index]
    this.#sum += value - oldValue
    this.#buffer[this.#index] = value
    this.#index = (this.#index + 1) % this.#size
    return this.#sum
  }

  get current(): number {
    return this.#buffer[this.#index]
  }

  get sum(): number {
    return this.#sum
  }

  get size(): number {
    return this.#size
  }

  get average(): number {
    return this.#sum / this.#size
  }
}
