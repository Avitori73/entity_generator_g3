import type { Config } from './type'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import ini from 'ini'
import * as javaPluginPath from 'prettier-plugin-java'

const javaPlugin = javaPluginPath.default

const customRcPath = process.env.EGG_CONFIG_FILE

const home = process.platform === 'win32'
  ? process.env.USERPROFILE
  : process.env.HOME

const defaultRcPath = path.join(home || '~/', '.eggrc')

const rcPath = customRcPath || defaultRcPath

const defaultConfig: Config = {
  entityPackage: 'com.a1stream.domain.entity',
  repositoryPackage: 'com.a1stream.domain.repository',
  simpleEntitySuperClazz: {
    name: 'BaseEntity',
    package: 'com.a1stream.common.model.BaseEntity',
  },
  repositorySuperClazz: {
    name: 'JpaExtensionRepository',
    package: 'com.ymsl.solid.jpa.repository.JpaExtensionRepository',
  },
  voPackage: 'com.a1stream.domain.vo',
  voSuperClazz: {
    name: 'BaseVO',
    package: 'com.a1stream.common.model.BaseVO',
  },
  partitionVoPackage: 'com.a1stream.domain.vo.partition',
  partitionVoSuperClazz: {
    name: 'BasePartitionVO',
    package: 'com.a1stream.common.model.BasePartitionVO',
  },
  partitionEntityPackage: 'com.a1stream.domain.entity.partition',
  partitionRepositoryPackage: 'com.a1stream.domain.repository.partition',
  partitionEntitySuperClazz: {
    name: 'BasePartitionEntity',
    package: 'com.a1stream.common.model.BasePartitionEntity',
  },
  entityKeyPackage: 'com.a1stream.domain.entity.partition',
  partitionKeySuperClazz: {
    name: 'PartitionKey',
    package: 'com.a1stream.common.model.PartitionKey',
  },
  partitionKey: 'dealer_partition_',
  omitColumns: [
    'site_id_',
    'update_author_',
    'update_date_',
    'create_author_',
    'create_date_',
    'update_program_',
    'update_counter_',
  ],
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
    'timestamp': 'Instant',
    'timestamptz': 'Instant',
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
    'bytea': 'byte[]',
  },
  dataImportMap: {
    numeric: 'java.math.BigDecimal',
    decimal: 'java.math.BigDecimal',
    timestamptz: 'java.time.Instant',
    timestamp: 'java.time.Instant',
    time: 'java.time.LocalTime',
    timetz: 'java.time.LocalTime',
    date: 'java.time.LocalDate',
  },
  defaultValueMap: {
    numeric: 'BigDecimal.ZERO',
    decimal: 'BigDecimal.ZERO',
  },
  defaultVOImportMap: {
    BigDecimal: 'java.math.BigDecimal',
    Integer: 'com.a1stream.common.constants.CommonConstants',
    Instant: 'java.time.Instant',
  },
  defaultVOValueMap: {
    BigDecimal: 'BigDecimal.ZERO',
    Integer: 'CommonConstants.INTEGER_ZERO',
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
