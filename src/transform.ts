import type { ColumnDefinition, CreateTable, JavaField, JavaFile, JavaInterface, JavaProperty } from './type'
import * as changeCase from 'change-case'
import { getConfig } from './config'

export async function transformCreateTableToJavaRepositoryInterface(createTable: CreateTable): Promise<JavaFile> {
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

export async function transformCreateTableToJavaEntityClass(createTable: CreateTable): Promise<JavaFile> {
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

  const javaProperties = await Promise.all(createTable.definitions.map(async (column) => {
    const isPrimaryKey = createTable.primaryKeys.includes(column.name)
    return await transformColumnDefinitionToJavaProperty(column, isPrimaryKey)
  }))
  properties.push(...javaProperties)

  const interfaces: JavaInterface[] = [
    { name: 'Entity' },
    { name: 'Table', attributes: [`name = "${createTable.name}"`] },
    { name: 'Setter' },
    { name: 'Getter' },
  ]
  const imports = []
  const dataTypeImports = await getDataTypeImports(createTable.definitions)
  imports.push(...dataTypeImports)
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

export async function transformColumnDefinitionToJavaProperty(column: ColumnDefinition, isPrimaryKey: boolean = false): Promise<JavaProperty> {
  const field: JavaField = {
    name: specialTransform(changeCase.camelCase(column.name)),
    type: await getJavaType(column.datatype),
    accessModifier: 'private',
    isStatic: false,
    isFinal: false,
    defaultValue: await getDefaultValue(column.datatype),
  }

  const interfaces: JavaInterface[] = []
  if (isPrimaryKey) {
    interfaces.push({ name: 'Id' }, { name: 'SnowflakeGenerator' })
  }
  interfaces.push(getColumnInterface(column))

  return { field, interfaces }
}

function specialTransform(fieldName: string): string {
  const specialKey: { [x: string]: string } = {
    class: 'clazz',
  }
  return specialKey[fieldName] || fieldName
}

async function getJavaType(datatype: string): Promise<string> {
  const config = await getConfig()
  const javaType = config.dataTypeMap[datatype]
  if (!javaType) {
    throw new Error(`Unsupported datatype: ${datatype}`)
  }
  return javaType
}

async function getDefaultValue(datatype: string): Promise<string | null> {
  const config = await getConfig()
  return config.defaultValueMap[datatype] ?? null
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

async function getDataTypeImports(definitions: ColumnDefinition[]): Promise<Array<string>> {
  const importSet = new Set<string>()
  const config = await getConfig()
  const dataTypeMap = config.dataImportMap
  definitions.forEach((definition) => {
    const javaType = dataTypeMap[definition.datatype]
    if (javaType)
      importSet.add(`import ${javaType};`)
  })
  return Array.from(importSet)
}
