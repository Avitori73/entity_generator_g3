import type { Options as PrettierOptions } from 'prettier'

export interface JavaFile {
  type: 'class' | 'interface'
  name: string
  properties?: JavaProperty[]
  accessModifier: 'public' | 'private' | 'protected'
  package: string
  extends?: string
  interfaces?: JavaInterface[]
  imports?: Array<string>
}

export interface JavaField {
  name: string
  type: string
  accessModifier: 'public' | 'private' | 'protected'
  isStatic: boolean
  isFinal: boolean
  defaultValue: string | null
}

export interface JavaInterface {
  name: string
  attributes?: Array<string>
}

export interface JavaProperty {
  field: JavaField
  interfaces?: JavaInterface[]
}

export interface CreateTable {
  name: string
  definitions: ColumnDefinition[]
  primaryKeys: Array<string>
  uniqueKeys?: Array<string>
}

export interface ColumnDefinition {
  name: string
  datatype: string
  nullable: boolean
  length?: number
  precision?: number
  scale?: number
}

export interface Config {
  entityPackage: string
  repositoryPackage: string
  simpleEntitySuperClazz: {
    name: string
    package: string
  }
  repositorySuperClazz: {
    name: string
    package: string
  }
  partitionEntityPackage: string
  partitionRepositoryPackage: string
  partitionEntitySuperClazz: {
    name: string
    package: string
  }
  entityKeyPackage: string
  partitionKeySuperClazz: {
    name: string
    package: string
  }
  partitionKey: string
  omitColumns: Array<string>
  prettierOptions: PrettierOptions
  dataTypeMap: Record<string, string>
  dataImportMap: Record<string, string>
  defaultValueMap: Record<string, string>
}
