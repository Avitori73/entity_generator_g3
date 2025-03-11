import type { Config } from './type'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import ini from 'ini'

const customRcPath = process.env.EGG_CONFIG_FILE

const home = process.platform === 'win32'
  ? process.env.USERPROFILE
  : process.env.HOME

const defaultRcPath = path.join(home || '~/', '.eggrc')

const rcPath = customRcPath || defaultRcPath

const javaPlugin = import.meta.resolve('prettier-plugin-java')

const defaultConfig: Config = {
  omitColumns: [],
  prettierOptions: {
    tabWidth: 4,
    printWidth: 200,
    plugins: [javaPlugin],
  },
  dataTypeMap: {
    'bigint': 'Long',
    'int8': 'Long',
    'integer': 'Integer',
    'int': 'Integer',
    'int4': 'Integer',
    'smallint': 'Integer',
    'int2': 'Integer',
    'date': 'LocalDate',
    'timestamp': 'LocalDateTime',
    'timestamptz': 'LocalDateTime',
    'time': 'LocalTime',
    'timetz': 'LocalTime',
    'numeric': 'BigDecimal',
    'decimal': 'BigDecimal',
    'character varying': 'String',
    'varchar': 'String',
    'character': 'String',
    'char': 'String',
    'text': 'String',
    'json': 'String',
    'boolean': 'Boolean',
    'bool': 'Boolean',
  },
  defaultValueMap: {
    numeric: 'BigDecimal.ZERO',
    decimal: 'BigDecimal.ZERO',
  },
}

let config: Config | undefined

export async function getConfig(): Promise<Config> {
  if (!config) {
    config = Object.assign(
      {},
      defaultConfig,
      fs.existsSync(rcPath)
        ? ini.parse(fs.readFileSync(rcPath, 'utf-8'))
        : null,
    )

    config = Object.assign({}, defaultConfig)
  }

  return config
}
