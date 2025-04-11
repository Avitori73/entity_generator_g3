import type { Options as PrettierOptions } from 'prettier'
import { format } from 'prettier'
import * as javaPluginPath from 'prettier-plugin-java'
import { getConfig } from './config'

const javaPlugin = javaPluginPath.default

const defaultOption = {
  plugins: [javaPlugin],
  parser: 'java',
}

export async function getOptions(): Promise<PrettierOptions> {
  const config = await getConfig()
  const prettierOptions = config.prettierOptions || {}
  return {
    ...prettierOptions,
    ...defaultOption,
  }
}

export async function formatJavaCode(content: string): Promise<string> {
  const options = await getOptions()
  return format(content, { ...options })
}
