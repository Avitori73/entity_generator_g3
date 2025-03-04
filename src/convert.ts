import type { ColumnDefinition, CreateTable } from './parse'
import * as changeCase from 'change-case'

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

export function writeJavaFile(javaFile: JavaFile): string[] {
  const lines = []

  lines.push(javaFile.package)

  javaFile.imports?.forEach((i) => {
    lines.push(i)
  })

  javaFile.interfaces?.forEach((i) => {
    lines.push(`@${i.name}${i.attributes ? `(${i.attributes.join(', ')})` : ''}`)
  })

  lines.push(`${javaFile.accessModifier} ${javaFile.type} ${javaFile.name} ${javaFile.extends
    ? `extends ${javaFile.extends}`
    : ''} {`)

  javaFile.properties?.forEach((p) => {
    lines.push(...writeJavaProperty(p))
  })

  lines.push('}')

  return lines
}

export function convertCreateTableToJavaRepositoryInterface(createTable: CreateTable): JavaFile {
  const EntityName = changeCase.pascalCase(createTable.name)
  const packagePath = 'package com.a1stream.domain.repository;'
  const imports = [
    'import org.springframework.stereotype.Repository;',
    `import com.a1stream.domain.entity.${EntityName};`,
    'import com.ymsl.solid.jpa.repository.JpaExtensionRepository;',
  ]
  const JavaInterface = { name: 'Repository' }
  return {
    type: 'interface',
    name: `${EntityName}Repository`,
    package: packagePath,
    imports,
    accessModifier: 'public',
    interfaces: [JavaInterface],
    extends: `JpaExtensionRepository<${EntityName}, Long>`,
  }
}

export function convertCreateTableToJavaEntityClass(createTable: CreateTable): JavaFile {
  const properties: JavaProperty[] = []
  properties.push({
    field: {
      name: 'serialVersionUID',
      type: 'long',
      accessModifier: 'private',
      isStatic: true,
      isFinal: true,
      defaultValue: '1L',
    },
  })
  properties.push(...createTable.definitions.map((column) => {
    const isPrimaryKey = createTable.primaryKeys.includes(column.name)
    return convertColumnDefinitionToJavaProperty(column, isPrimaryKey)
  }))

  const interfaces: JavaInterface[] = [
    { name: 'Entity' },
    { name: 'Table', attributes: [`name = "${createTable.name}"`] },
    { name: 'Setter' },
    { name: 'Getter' },
  ]
  const imports = []
  if (createTable.definitions.some(column => column.datatype === 'numeric')) {
    imports.push('import java.math.BigDecimal;')
  }
  imports.push(
    'import com.a1stream.common.model.BaseEntity;',
    'import com.ymsl.solid.jpa.uuid.annotation.SnowflakeGenerator;',
    'import jakarta.persistence.Column;',
    'import jakarta.persistence.Entity;',
    'import jakarta.persistence.Id;',
    'import jakarta.persistence.Table;',
    'import lombok.Getter;',
    'import lombok.Setter;',
  )

  return {
    type: 'class',
    imports,
    package: 'package com.a1stream.domain.entity;',
    name: changeCase.pascalCase(createTable.name),
    properties,
    interfaces,
    accessModifier: 'public',
    extends: 'BaseEntity',
  }
}

export function writeJavaProperty(property: JavaProperty): string[] {
  const lines = []

  property.interfaces?.forEach((i) => {
    const attributes = i.attributes ? `(${i.attributes.join(', ')})` : ''
    lines.push(`@${i.name}${attributes}`)
  })

  const field = property.field
  lines.push(`${field.accessModifier} ${field.isStatic ? 'static ' : ''}${field.isFinal ? 'final ' : ''}${field.type} ${field.name}${field.defaultValue !== null ? ` = ${field.defaultValue}` : ''};`)

  return lines
}

export function convertColumnDefinitionToJavaProperty(column: ColumnDefinition, isPrimaryKey: boolean = false): JavaProperty {
  const field: JavaField = {
    name: changeCase.camelCase(column.name),
    type: getJavaType(column.datatype),
    accessModifier: 'private',
    isStatic: false,
    isFinal: false,
    defaultValue: getDefaultValue(column.datatype),
  }

  const interfaces: JavaInterface[] = []
  if (isPrimaryKey) {
    interfaces.push({ name: 'Id' }, { name: 'SnowflakeGenerator' })
  }
  interfaces.push(getColumnInterface(column))

  return { field, interfaces }
}

function getJavaType(datatype: string): string {
  switch (datatype) {
    case 'varchar':
    case 'text':
      return 'String'
    case 'int4':
      return 'Integer'
    case 'numeric':
      return 'BigDecimal'
    case 'timestamptz':
      return 'LocalDateTime'
    default:
      throw new Error(`Unknown datatype: ${datatype}`)
  }
}

function getDefaultValue(datatype: string): string | null {
  switch (datatype) {
    case 'numeric':
      return 'BigDecimal.ZERO'
    case 'varchar':
    case 'text':
    case 'int4':
    case 'timestamptz':
      return null
    default:
      throw new Error(`Unknown datatype: ${datatype}`)
  }
}

function getColumnInterface(column: ColumnDefinition): JavaInterface {
  const attributes = [`name = "${column.name}"`]

  if (!column.nullable)
    attributes.push('nullable = false')
  if (column.length)
    attributes.push(`length = ${column.length}`)
  if (column.precision)
    attributes.push(`precision = ${column.precision}`)
  if (column.scale)
    attributes.push(`scale = ${column.scale}`)

  return {
    name: 'Column',
    attributes,
  }
}
