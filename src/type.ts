import type { Options as PrettierOptions } from 'prettier'

export interface JavaFile {
  type: 'class' | 'interface'
  name: string
  properties?: JavaProperty[]
  accessModifier: 'public' | 'private' | 'protected'
  package: string
  extends?: string
  interfaces?: JavaInterface[]
  imports?: string[]
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
  attributes?: string[]
}

export interface JavaProperty {
  field: JavaField
  interfaces?: JavaInterface[]
}

export interface CreateTable {
  name: string
  definitions: ColumnDefinition[]
  primaryKeys: string[]
  uniqueKeys?: string[]
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
  repositorySuperClazz: {
    name: string
    package: string
  }
  omitColumns: string[]
  entityPackage: string
  simpleEntitySuperClazz: {
    name: string
    package: string
  }
  repositoryPackage: string
  prettierOptions: PrettierOptions
  dataTypeMap: Record<string, string>
  dataImportMap: Record<string, string>
  defaultValueMap: Record<string, string>
}
