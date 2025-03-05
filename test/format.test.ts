import { describe, expect, it } from 'vitest'
import { formatJavaCode } from '../src'

describe('format', () => {
  it('should format files', async () => {
    const javaCode = `public class HelloWorld { public static void main(String[] args) { System.out.println("Hello, World!"); } }`
    const formatted = await formatJavaCode(javaCode)
    expect(formatted).toBe(`public class HelloWorld {

    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`)
  })
})
