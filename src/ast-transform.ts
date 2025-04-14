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
  vo: JavaAST
}

export interface PartitionJpaUnit {
  entity: JavaAST
  entityKey: JavaAST
  repository: JavaAST
  vo: JavaAST
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
    const voAST = this.transformToVOAST(entityAST)
    return {
      entity: entityAST,
      entityKey: entityKeyAST,
      repository: repositoryAST,
      vo: voAST,
    }
  }

  private transformToEntityAST(ast: CreateTableStatement): JavaAST {
    const entityPackage = this.config.partitionEntityPackage
    const entitySuperClazz = this.config.partitionEntitySuperClazz
    const omitCols = this.config.omitColumns
    const dataTypeMap = this.config.dataTypeMap
    const dataImportMap = this.config.dataImportMap

    const packageDeclaration = createPackageDeclaration(entityPackage)
    const imports = createBaseEntityImports()
    const versionJavaDoc = createVersionJavaDoc()
    const classDeclaration = createBaseEntityClass(entitySuperClazz.name)

    imports.push(createImportDeclaration('jakarta.persistence.IdClass'))
    imports.push(createImportDeclaration(entitySuperClazz.package))

    const primaryKeys: Array<string> = []

    // visit table
    astVisitor(() => ({
      createTable: (table: CreateTableStatement) => {
        const tablename = table.name.name
        const entityClassName = pascalCase(tablename)
        classDeclaration.id.name = entityClassName
        classDeclaration.annotations.push(createAnnotation('IdClass', { value: createTypeDeclaration(`${entityClassName}Key`) }))
        classDeclaration.annotations.push(createAnnotation('Table', { name: tablename }))

        // Extract primary keys, but exclude partition key
        table.constraints?.forEach((constraint) => {
          if (constraint.type === 'primary key') {
            primaryKeys.push(...constraint.columns.map(col => col.name))
          }
        })
      },
    })).statement(ast)

    // visit columns
    astVisitor(() => ({
      createColumn: (column: CreateColumnDef) => {
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
        classDeclaration.body.body.push(createPartitionEntityFieldDeclaration(column, typeDeclaration, isPrimaryKey))
      },
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
    const partitionKey = this.config.partitionKey
    const entityKeyPackage = this.config.entityKeyPackage

    const entityClassDeclaration = entityAst.body.find(node => node.type === 'ClassDeclaration')
    const entityClassName = entityClassDeclaration?.id.name || 'TempBaseEntity'
    const entityKeyClassName = `${entityClassName}Key`
    const entityKeyIdFieldDeclarations = entityClassDeclaration
      ?.body
      .body
      .filter((node): node is FieldDeclaration =>
        node.type === 'FieldDeclaration' && node.annotations.some(a => a.id.name === 'Id') && node.id.name !== camelCase(partitionKey),
      )

    if (!entityKeyIdFieldDeclarations) {
      throw new Error(`Id field not found in table ${this.tableName}.`)
    }

    const partitionKeyFieldDeclaration = createFieldDeclaration(camelCase(partitionKey), createTypeDeclaration('String'))
    partitionKeyFieldDeclaration.modifiers.push(createModifier('private'))

    const classDeclaration = createEntityKeyClassDeclaration(entityKeyClassName, entityKeyIdFieldDeclarations, partitionKeyFieldDeclaration)

    const packageDeclaration = createPackageDeclaration(entityKeyPackage)
    const versionJavaDoc = createVersionJavaDoc()

    const imports = createEntityKeyImports()

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

  private transformToVOAST(entityAST: JavaAST): JavaAST {
    const defaultVOImportMap = this.config.defaultVOImportMap
    const defaultVOValueMap = this.config.defaultVOValueMap
    const voPackage = this.config.partitionVoPackage
    const voSuperClazz = this.config.partitionVoSuperClazz
    return createVOClass(entityAST, {
      voPackage,
      voSuperClazz,
      defaultVOImportMap,
      defaultVOValueMap,
    })
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
    const voAST = this.transformToVOAST(entityAST)
    return {
      entity: entityAST,
      repository: repositoryAST,
      vo: voAST,
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

    // visit table
    astVisitor(() => ({
      createTable: (table: CreateTableStatement) => {
        const tablename = table.name.name
        classDeclaration.id.name = pascalCase(tablename)
        classDeclaration.annotations.push(createAnnotation('Table', { name: tablename }))

        // Extract primary keys
        table.constraints?.forEach((constraint) => {
          if (constraint.type === 'primary key') {
            primaryKeys.push(...constraint.columns.map(col => col.name))
          }
        })
      },
    })).statement(ast)

    // visit columns
    astVisitor(() => ({
      createColumn: (column: CreateColumnDef) => {
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
      },
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

  private transformToVOAST(entityAST: JavaAST): JavaAST {
    const defaultVOImportMap = this.config.defaultVOImportMap
    const defaultVOValueMap = this.config.defaultVOValueMap
    const voPackage = this.config.voPackage
    const voSuperClazz = this.config.voSuperClazz
    return createVOClass(entityAST, {
      voPackage,
      voSuperClazz,
      defaultVOImportMap,
      defaultVOValueMap,
    })
  }
}

export function createBaseVOImports(): Array<ImportDeclaration> {
  return [
    createImportDeclaration('lombok.Getter'),
    createImportDeclaration('lombok.Setter'),
  ]
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

export function createBaseVOClass(superClazz: string): ClassDeclaration {
  const tempEntityClass: ClassDeclaration = createClassDeclaration('TempBaseVO', createEmptyBodyDeclaration())
  tempEntityClass.modifiers.push(createModifier('public'))
  tempEntityClass.annotations.push(createAnnotation('Getter'))
  tempEntityClass.annotations.push(createAnnotation('Setter'))
  tempEntityClass.superClass = createTypeDeclaration(superClazz)
  tempEntityClass.body.body.push(createSerialVersionUID())
  return tempEntityClass
}

const keywordRenameMap: Record<string, string> = {
  class: 'clazz',
}

export function createPartitionEntityFieldDeclaration(column: CreateColumnDef, typeDeclaration: TypeDeclaration, isPrimaryKey: boolean): FieldDeclaration {
  return createEntityFieldDeclaration(column, typeDeclaration, isPrimaryKey, true)
}

export function createEntityFieldDeclaration(column: CreateColumnDef, typeDeclaration: TypeDeclaration, isPrimaryKey: boolean, isPartition: boolean = false): FieldDeclaration {
  let fieldname = camelCase(column.name.name)
  if (keywordRenameMap[fieldname]) {
    fieldname = keywordRenameMap[fieldname]
  }

  const fieldDeclaration = createFieldDeclaration(fieldname, typeDeclaration)
  fieldDeclaration.modifiers.push(createModifier('private'))
  if (isPrimaryKey) {
    fieldDeclaration.annotations.push(createAnnotation('Id'))
    if (typeDeclaration.id.name === 'Long' && !isPartition)
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

export function createEntityKeyClassDeclaration(entityKeyClassName: string, idFieldDeclarations: FieldDeclaration[] | undefined, partitionKeyField: FieldDeclaration): ClassDeclaration {
  const entityKeyClass: ClassDeclaration = createClassDeclaration(entityKeyClassName, createEmptyBodyDeclaration())
  entityKeyClass.modifiers.push(createModifier('public'))
  entityKeyClass.annotations.push(createAnnotation('Data'))
  entityKeyClass.annotations.push(createAnnotation('NoArgsConstructor'))
  entityKeyClass.implements.push(createTypeDeclaration('Serializable'))
  if (idFieldDeclarations) {
    const serialVersionUID = createSerialVersionUID()

    const idFields = []
    for (const idFieldDeclaration of idFieldDeclarations) {
      const idName = idFieldDeclaration.id.name
      const idType = idFieldDeclaration.typeDeclaration

      const idField = createFieldDeclaration(idName, idType)
      idField.modifiers.push(createModifier('private'))
      idFields.push(idField)
    }

    const idArgsConstructorDeclaration = createConstructorDeclaration(entityKeyClassName)
    idArgsConstructorDeclaration.modifiers.push(createModifier('private'))
    for (const idField of idFields) {
      const idName = idField.id.name
      const idType = idField.typeDeclaration
      idArgsConstructorDeclaration.params.push(createParameter(idName, idType))
      idArgsConstructorDeclaration.body.body.push(createExpression(`this.${idName} = ${idName};`))
    }
    idArgsConstructorDeclaration.body.body.push(createExpression('this.dealerPartition = UserDetailsUtil.getDealerPartition();'))

    const staticOfMethodDeclaration = createMethodDeclaration('of')
    staticOfMethodDeclaration.modifiers.push(createModifier('public'))
    staticOfMethodDeclaration.modifiers.push(createModifier('static'))
    staticOfMethodDeclaration.returnType = createTypeDeclaration(entityKeyClassName)
    for (const idField of idFields) {
      const idName = idField.id.name
      const idType = idField.typeDeclaration
      staticOfMethodDeclaration.params.push(createParameter(idName, idType))
    }
    const idNames = idFields.map(idField => idField.id.name).join(', ')
    staticOfMethodDeclaration.body = createBlockStatement([
      createExpression(`return new ${entityKeyClassName}(${idNames});`),
    ])

    entityKeyClass.body.body.push(
      serialVersionUID,
      ...idFields,
      partitionKeyField,
      idArgsConstructorDeclaration,
      staticOfMethodDeclaration,
    )
  }
  return entityKeyClass
}

interface VOEnv {
  voPackage: string
  voSuperClazz: { name: string, package: string }
  defaultVOImportMap: Record<string, string>
  defaultVOValueMap: Record<string, string>
}

export function createVOClass(entityAST: JavaAST, env: VOEnv): JavaAST {
  const { voPackage, voSuperClazz, defaultVOImportMap, defaultVOValueMap } = env
  const packageDeclaration = createPackageDeclaration(voPackage)
  const imports = createBaseVOImports()
  const versionJavaDoc = createVersionJavaDoc()
  const classDeclaration = createBaseVOClass(voSuperClazz.name)

  imports.push(createImportDeclaration(voSuperClazz.package))

  const entityClassDeclaration = entityAST.body.find(node => node.type === 'ClassDeclaration')
  const entityClassName = entityClassDeclaration?.id.name || 'TempBaseEntity'
  classDeclaration.id.name = `${entityClassName}VO`

  const entityFieldDeclarations = entityClassDeclaration?.body.body.filter(node => node.type === 'FieldDeclaration') || []
  for (const field of entityFieldDeclarations) {
    const fieldName = field.id.name
    if (fieldName === 'serialVersionUID')
      continue

    const fieldType = field.typeDeclaration
    // import type
    const fieldTypeName = fieldType.id.name
    const fieldTypePackage = defaultVOImportMap[fieldTypeName]
    if (fieldTypePackage) {
      imports.push(createImportDeclaration(fieldTypePackage))
    }
    // create field declaration
    const voFieldDeclaration = createFieldDeclaration(fieldName, fieldType)
    voFieldDeclaration.modifiers.push(createModifier('private'))
    // set default value
    const fieldValue = defaultVOValueMap[fieldTypeName]
    if (fieldValue) {
      voFieldDeclaration.value = createExpression(fieldValue)
    }

    classDeclaration.body.body.push(voFieldDeclaration)
  }

  const uniqueImports = uniqBy(imports, 'id.name')

  const voAST: JavaAST = {
    type: 'JavaAST',
    body: [
      packageDeclaration,
      ...uniqueImports,
      versionJavaDoc,
      classDeclaration,
    ],
  }
  return voAST
}
