import { describe, expect, it } from 'vitest'
import { init } from '../src'

describe('function', () => {
  it('should be work', async () => {
    expect(1 + 1).toBe(2)
  })
})

describe('config', () => {
  it('should be work', async () => {
    init()
  })
})
