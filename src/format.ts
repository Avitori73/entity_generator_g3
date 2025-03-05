import fs from 'node:fs'
import { format } from 'prettier'
import { globSync } from 'tinyglobby'
import { getConfig } from './config'

export async function formatFiles(path: string): Promise<void> {
  const config = await getConfig()

  const files = globSync(path)
  for (const file of files) {
    const fileContent = fs.readFileSync(file, 'utf8')
    const formatted = await format(fileContent, { ...config.prettierOptions, filepath: file })

    fs.writeFileSync(file, formatted)
  }
}

export async function formatJavaCode(content: string): Promise<string> {
  const config = await getConfig()
  return format(content, { ...config.prettierOptions, parser: 'java' })
}
