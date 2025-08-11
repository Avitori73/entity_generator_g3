import { describe, it } from 'vitest'
import { runJavaCli } from '../src'

const consumerInfoTestCase = 'test/consumer_info.test.sql'
const colorInfoTestCase = 'test/color_info.test.sql'

describe('test cli for consumer_info', () => {
  it('consumer info test', async () => {
    await runJavaCli({ file: consumerInfoTestCase })
  })
})

describe('test cli for color_info', () => {
  it('color info test', async () => {
    await runJavaCli({ file: colorInfoTestCase })
  })
})
