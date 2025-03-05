import type { Options as PrettierOptions } from 'prettier'

const javaPlugin = import.meta.resolve('prettier-plugin-java')

interface Config {
  prettierOptions: PrettierOptions
  dataTypeMap: Record<string, string>
  defaultValueMap: Record<string, string>
}

const defaultConfig: Config = {
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
    config = Object.assign({}, defaultConfig)
  }

  return config
}
