import type { BasicDataTypeDef, CreateColumnDef, CreateTableStatement } from 'pgsql-ast-parser'
import type { Annotation, BodyDeclaration, ClassDeclaration, Config, FieldDeclaration, ImportDeclaration, InterfaceDeclaration, JavaAST, JavaDoc, TypeDeclaration } from './type'
import { camelCase, pascalCase } from 'change-case'
import { uniqBy } from 'lodash-es'
import { astVisitor } from 'pgsql-ast-parser'
import { version } from '../package.json'
import { createAnnotation, createBlockStatement, createBodyDeclaration, createClassDeclaration, createConstructorDeclaration, createExpression, createFieldDeclaration, createImportDeclaration, createInterfaceDeclaration, createMethodDeclaration, createModifier, createPackageDeclaration, createParameter, createTypeDeclaration } from './ast-builder'
import { getConfig } from './config'

export interface SimpleJpaUnit {
  entity: JavaAST
  repository: JavaAST
}

export interface PartitionJpaUnit {
  entity: JavaAST
  entityKey: JavaAST
  repository: JavaAST
}

export class PartitionJpaTransformer {
  private config!: Config
  private ast!: CreateTableStatement
  private tableName!: string

  constructor(ast: CreateTableStatement) {
    this.ast = ast
    this.tableName = ast.name.name
  }

  async transform(): Promise<PartitionJpaUnit> {
    this.config = await getConfig()
    const entityAST = this.transformToEntityAST(this.ast)
    const entityKeyAST = this.transformToEntityKeyAST(entityAST)
    const repositoryAST = this.transformToRepositoryAST(entityAST, entityKeyAST)
    return {
      entity: entityAST,
      entityKey: entityKeyAST,
      repository: repositoryAST,
    }
  }

  private transformToEntityAST(ast: CreateTableStatement): JavaAST {
    const entityPackage = this.config.partitionEntityPackage
    const entitySuperClazz = this.config.partitionEntitySuperClazz
    const partitionKey = this.config.partitionKey
    const omitCols = this.config.omitColumns
    omitCols.push(partitionKey)
    const dataTypeMap = this.config.dataTypeMap
    const dataImportMap = this.config.dataImportMap

    const packageDeclaration = createPackageDeclaration(entityPackage)
    const imports = createBaseEntityImports()
    const versionJavaDoc = createVersionJavaDoc()
    const classDeclaration = createBaseEntityClass(entitySuperClazz.name)

    imports.push(createImportDeclaration(entitySuperClazz.package))

    const primaryKeys: Array<string> = []
    function visitCreateTable(table: CreateTableStatement): void {
      const tablename = table.name.name
      const entityClassName = pascalCase(tablename)
      classDeclaration.id.name = entityClassName
      classDeclaration.annotations.push(createAnnotation('IdClass', { value: createTypeDeclaration(`${entityClassName}Key`) }))
      classDeclaration.annotations.push(createAnnotation('Table', { name: tablename }))

      // Extract primary keys, but exclude partition key
      table.constraints?.forEach((constraint) => {
        if (constraint.type === 'primary key') {
          primaryKeys.push(...constraint.columns.filter(col => col.name !== partitionKey).map(col => col.name))
        }
      })
    }

    astVisitor(() => ({
      createTable: visitCreateTable,
    })).statement(ast)

    function visitCreateColumn(column: CreateColumnDef): void {
      const isBasicDataTypeDef = column.dataType.kind !== 'array'
      const isOmitColumn = omitCols.includes(column.name.name)
      if (!isBasicDataTypeDef || isOmitColumn) {
        return
      }

      const columnName = column.name.name
      const dataType = column.dataType as BasicDataTypeDef
      const type = dataType.name
      const typeDeclaration = createTypeDeclaration(dataTypeMap[type] ?? 'Object')
      const isPrimaryKey = primaryKeys.includes(columnName)

      dataImportMap[type] && imports.push(createImportDeclaration(dataImportMap[type]))
      classDeclaration.body.body.push(createEntityFieldDeclaration(column, typeDeclaration, isPrimaryKey))
    }

    astVisitor(() => ({
      createColumn: visitCreateColumn,
    })).statement(ast)

    const uniqueImports = uniqBy(imports, 'id.name')

    const entityAST: JavaAST = {
      type: 'JavaAST',
      body: [
        packageDeclaration,
        ...uniqueImports,
        versionJavaDoc,
        classDeclaration,
      ],
    }
    return entityAST
  }

  private transformToEntityKeyAST(entityAst: JavaAST): JavaAST {
    const entityKeyPackage = this.config.entityKeyPackage
    const partitionkeySuperClazz = this.config.partitionKeySuperClazz

    const entityClassDeclaration = entityAst.body.find(node => node.type === 'ClassDeclaration')
    const entityClassName = entityClassDeclaration?.id.name || 'TempBaseEntity'
    const entityKeyClassName = `${entityClassName}Key`
    const entityKeyIdFieldDeclaration = entityClassDeclaration
      ?.body
      .body
      .find((node): node is FieldDeclaration =>
        node.type === 'FieldDeclaration' && node.annotations.some(a => a.id.name === 'Id'),
      )

    if (!entityKeyIdFieldDeclaration) {
      throw new Error(`Id field not found in table ${this.tableName}.`)
    }

    const classDeclaration = createEntityKeyClassDeclaration(entityKeyClassName, entityKeyIdFieldDeclaration, partitionkeySuperClazz)

    const packageDeclaration = createPackageDeclaration(entityKeyPackage)
    const versionJavaDoc = createVersionJavaDoc()

    const imports = createEntityKeyImports()
    imports.push(createImportDeclaration(partitionkeySuperClazz.package))

    return {
      type: 'JavaAST',
      body: [
        packageDeclaration,
        ...imports,
        versionJavaDoc,
        classDeclaration,
      ],
    }
  }

  private transformToRepositoryAST(entityAST: JavaAST, entityKeyAST: JavaAST): JavaAST {
    const repositoryPackage = this.config.partitionRepositoryPackage
    const entityPackage = this.config.partitionEntityPackage
    const entityKeyPackage = this.config.entityKeyPackage
    const repositorySuperClazz = this.config.repositorySuperClazz

    const packageDeclaration = createPackageDeclaration(repositoryPackage)
    const imports = createBaseRepositoryImports()
    const versionJavaDoc = createVersionJavaDoc()
    const interfaceDeclaration = createBaseRepositoryInterface()

    const entityClassDeclaration = entityAST.body.find(node => node.type === 'ClassDeclaration')
    const entityClassName = entityClassDeclaration?.id.name || 'TempBaseEntity'
    const entityImport = createImportDeclaration(`${entityPackage}.${entityClassName}`)
    imports.push(entityImport)

    const entityKeyClassDeclaration = entityKeyAST.body.find(node => node.type === 'ClassDeclaration')
    const entityKeyClassName = entityKeyClassDeclaration?.id.name || 'TempBaseEntityKey'
    const entityKeyImport = createImportDeclaration(`${entityKeyPackage}.${entityKeyClassName}`)
    imports.push(entityKeyImport)

    imports.push(createImportDeclaration(repositorySuperClazz.package))

    const repositoryClassName = `${entityClassName}Repository`
    interfaceDeclaration.id.name = repositoryClassName

    const generics = [createTypeDeclaration(entityClassName), createTypeDeclaration(entityKeyClassName)]
    interfaceDeclaration.extends = [createTypeDeclaration(repositorySuperClazz.name, generics)]

    const uniqueImports = uniqBy(imports, 'id.name')

    const repositoryAST: JavaAST = {
      type: 'JavaAST',
      body: [
        packageDeclaration,
        ...uniqueImports,
        versionJavaDoc,
        interfaceDeclaration,
      ],
    }

    return repositoryAST
  }
}

export class SimpleJpaTransformer {
  private config!: Config
  private ast!: CreateTableStatement
  private tableName!: string

  constructor(ast: CreateTableStatement) {
    this.ast = ast
    this.tableName = ast.name.name
  }

  async transform(): Promise<SimpleJpaUnit> {
    this.config = await getConfig()
    const entityAST = this.transformToEntityAST(this.ast)
    const repositoryAST = this.transformToRepositoryAST(entityAST)
    return {
      entity: entityAST,
      repository: repositoryAST,
    }
  }

  private transformToEntityAST(ast: CreateTableStatement): JavaAST {
    const entityPackage = this.config.entityPackage
    const entitySuperClazz = this.config.simpleEntitySuperClazz
    const omitCols = this.config.omitColumns
    const dataTypeMap = this.config.dataTypeMap
    const dataImportMap = this.config.dataImportMap

    const packageDeclaration = createPackageDeclaration(entityPackage)
    const imports = createBaseEntityImports()
    const versionJavaDoc = createVersionJavaDoc()
    const classDeclaration = createBaseEntityClass(entitySuperClazz.name)

    imports.push(createImportDeclaration(entitySuperClazz.package))

    const primaryKeys: Array<string> = []
    function visitCreateTable(table: CreateTableStatement): void {
      const tablename = table.name.name
      classDeclaration.id.name = pascalCase(tablename)
      classDeclaration.annotations.push(createAnnotation('Table', { name: tablename }))

      // Extract primary keys
      table.constraints?.forEach((constraint) => {
        if (constraint.type === 'primary key') {
          primaryKeys.push(...constraint.columns.map(col => col.name))
        }
      })
    }

    astVisitor(() => ({
      createTable: visitCreateTable,
    })).statement(ast)

    function visitCreateColumn(column: CreateColumnDef): void {
      const isBasicDataTypeDef = column.dataType.kind !== 'array'
      const isOmitColumn = omitCols.includes(column.name.name)
      if (!isBasicDataTypeDef || isOmitColumn) {
        return
      }

      const columnName = column.name.name
      const dataType = column.dataType as BasicDataTypeDef
      const type = dataType.name
      const typeDeclaration = createTypeDeclaration(dataTypeMap[type] ?? 'Object')
      const isPrimaryKey = primaryKeys.includes(columnName)

      dataImportMap[type] && imports.push(createImportDeclaration(dataImportMap[type]))
      classDeclaration.body.body.push(createEntityFieldDeclaration(column, typeDeclaration, isPrimaryKey))
    }

    astVisitor(() => ({
      createColumn: visitCreateColumn,
    })).statement(ast)

    const uniqueImports = uniqBy(imports, 'id.name')

    const entityAST: JavaAST = {
      type: 'JavaAST',
      body: [
        packageDeclaration,
        ...uniqueImports,
        versionJavaDoc,
        classDeclaration,
      ],
    }
    return entityAST
  }

  private transformToRepositoryAST(entityAST: JavaAST): JavaAST {
    const repositoryPackage = this.config.repositoryPackage
    const entityPackage = this.config.entityPackage
    const repositorySuperClazz = this.config.repositorySuperClazz

    const packageDeclaration = createPackageDeclaration(repositoryPackage)
    const imports = createBaseRepositoryImports()
    const versionJavaDoc = createVersionJavaDoc()
    const interfaceDeclaration = createBaseRepositoryInterface()

    const entityClassDeclaration = entityAST.body.find(node => node.type === 'ClassDeclaration')
    const entityClassName = entityClassDeclaration?.id.name || 'TempBaseEntity'
    const entityImport = createImportDeclaration(`${entityPackage}.${entityClassName}`)
    imports.push(entityImport)
    imports.push(createImportDeclaration(repositorySuperClazz.package))

    const repositoryClassName = `${entityClassName}Repository`
    interfaceDeclaration.id.name = repositoryClassName

    const idFieldDeclaration = entityClassDeclaration
      ?.body
      .body
      .find((node): node is FieldDeclaration =>
        node.type === 'FieldDeclaration' && node.annotations.some(a => a.id.name === 'Id'),
      )
      ?.typeDeclaration

    if (!idFieldDeclaration) {
      throw new Error(`Id field not found in table ${this.tableName}.`)
    }

    const generics = [createTypeDeclaration(entityClassName), idFieldDeclaration]
    interfaceDeclaration.extends = [createTypeDeclaration(repositorySuperClazz.name, generics)]

    const uniqueImports = uniqBy(imports, 'id.name')

    const repositoryAST: JavaAST = {
      type: 'JavaAST',
      body: [
        packageDeclaration,
        ...uniqueImports,
        versionJavaDoc,
        interfaceDeclaration,
      ],
    }

    return repositoryAST
  }
}

export function createBaseRepositoryImports(): Array<ImportDeclaration> {
  return [
    createImportDeclaration('org.springframework.stereotype.Repository'),
  ]
}

export function createBaseEntityImports(): Array<ImportDeclaration> {
  return [
    createImportDeclaration('com.ymsl.solid.jpa.uuid.annotation.SnowflakeGenerator'),
    createImportDeclaration('jakarta.persistence.Column'),
    createImportDeclaration('jakarta.persistence.Entity'),
    createImportDeclaration('jakarta.persistence.Id'),
    createImportDeclaration('jakarta.persistence.Table'),
    createImportDeclaration('lombok.Getter'),
    createImportDeclaration('lombok.Setter'),
  ]
}

export function createEntityKeyImports(): Array<ImportDeclaration> {
  return [
    createImportDeclaration('lombok.Data;'),
    createImportDeclaration('lombok.EqualsAndHashCode;'),
  ]
}

export function createVersionJavaDoc(): JavaDoc {
  return {
    type: 'JavaDoc',
    value: [
      `@author Entity Generator G3 - v${version}`,
    ],
  }
}

export function createBaseRepositoryInterface(): InterfaceDeclaration {
  const tempRepositoryInterface: InterfaceDeclaration = createInterfaceDeclaration('TempBaseEntityRepository', createEmptyBodyDeclaration())
  tempRepositoryInterface.modifiers.push(createModifier('public'))
  tempRepositoryInterface.annotations.push(createAnnotation('Repository'))
  return tempRepositoryInterface
}

export function createEmptyBodyDeclaration(): BodyDeclaration {
  return createBodyDeclaration([])
}

export function createBaseEntityClass(superClazz: string): ClassDeclaration {
  const tempEntityClass: ClassDeclaration = createClassDeclaration('TempBaseEntity', createEmptyBodyDeclaration())
  tempEntityClass.modifiers.push(createModifier('public'))
  tempEntityClass.annotations.push(createAnnotation('Entity'))
  tempEntityClass.annotations.push(createAnnotation('Getter'))
  tempEntityClass.annotations.push(createAnnotation('Setter'))
  tempEntityClass.superClass = createTypeDeclaration(superClazz)
  tempEntityClass.body.body.push(createSerialVersionUID())
  return tempEntityClass
}

const keywordRenameMap: Record<string, string> = {
  class: 'clazz',
}

export function createEntityFieldDeclaration(column: CreateColumnDef, typeDeclaration: TypeDeclaration, isPrimaryKey: boolean): FieldDeclaration {
  let fieldname = camelCase(column.name.name)
  if (keywordRenameMap[fieldname]) {
    fieldname = keywordRenameMap[fieldname]
  }

  const fieldDeclaration = createFieldDeclaration(fieldname, typeDeclaration)
  fieldDeclaration.modifiers.push(createModifier('private'))
  if (isPrimaryKey) {
    fieldDeclaration.annotations.push(createAnnotation('Id'))
    fieldDeclaration.annotations.push(createAnnotation('SnowflakeGenerator'))
  }
  fieldDeclaration.annotations.push(createColumnAnnotation(column))
  return fieldDeclaration
}

export function createColumnAnnotation(column: CreateColumnDef): Annotation {
  const lengthRequired = ['character varying', 'varchar']
  const percisionAndScaleRequired = ['numeric']

  const dataType = column.dataType as BasicDataTypeDef
  const constraints = column.constraints

  const name = column.name.name
  const type = dataType.name
  const length = lengthRequired.includes(type) ? dataType.config?.[0] : undefined
  const precision = percisionAndScaleRequired.includes(type) ? dataType.config?.[0] : undefined
  const scale = percisionAndScaleRequired.includes(type) ? dataType.config?.[1] : undefined
  const nullable = constraints?.some(c => c.type === 'null') || false

  return createAnnotation('Column', {
    name,
    length,
    precision,
    scale,
    nullable,
  })
}

export function createSerialVersionUID(): FieldDeclaration {
  const fieldDeclaration = createFieldDeclaration('serialVersionUID', createTypeDeclaration('long'))
  fieldDeclaration.modifiers.push(createModifier('private'))
  fieldDeclaration.modifiers.push(createModifier('static'))
  fieldDeclaration.modifiers.push(createModifier('final'))
  fieldDeclaration.value = createExpression('1L')
  return fieldDeclaration
}

export function createEntityKeyClassDeclaration(entityKeyClassName: string, idFieldDeclaration: FieldDeclaration | undefined, partitionkeySuperClazz: { name: string, package: string }): ClassDeclaration {
  const entityKeyClass: ClassDeclaration = createClassDeclaration(entityKeyClassName, createEmptyBodyDeclaration())
  entityKeyClass.modifiers.push(createModifier('public'))
  entityKeyClass.annotations.push(createAnnotation('Data'))
  entityKeyClass.annotations.push(createAnnotation('EqualsAndHashCode', { callSuper: false }))
  entityKeyClass.superClass = createTypeDeclaration(partitionkeySuperClazz.name)
  if (idFieldDeclaration) {
    const idName = idFieldDeclaration.id.name
    const idType = idFieldDeclaration.typeDeclaration

    const idField = createFieldDeclaration(idName, idType)

    const noArgsConstructorDeclaration = createConstructorDeclaration(entityKeyClassName)
    noArgsConstructorDeclaration.modifiers.push(createModifier('public'))
    noArgsConstructorDeclaration.body.body.push(createExpression(`super();`))

    const idArgsConstructorDeclaration = createConstructorDeclaration(entityKeyClassName)
    idArgsConstructorDeclaration.modifiers.push(createModifier('private'))
    idArgsConstructorDeclaration.params.push(createParameter(idName, idType))
    idArgsConstructorDeclaration.body.body.push(createExpression(`super();`))
    idArgsConstructorDeclaration.body.body.push(createExpression(`this.${idName} = ${idName};`))

    const staticOfMethodDeclaration = createMethodDeclaration('of')
    staticOfMethodDeclaration.modifiers.push(createModifier('public'))
    staticOfMethodDeclaration.modifiers.push(createModifier('static'))
    staticOfMethodDeclaration.returnType = createTypeDeclaration(entityKeyClassName)
    staticOfMethodDeclaration.params.push(createParameter(idName, idType))
    staticOfMethodDeclaration.body = createBlockStatement([
      createExpression(`return new ${entityKeyClassName}(${idName});`),
    ])

    entityKeyClass.body.body.push(
      idField,
      noArgsConstructorDeclaration,
      idArgsConstructorDeclaration,
      staticOfMethodDeclaration,
    )
  }
  return entityKeyClass
}
