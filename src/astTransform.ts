import type { BasicDataTypeDef, CreateColumnDef, CreateTableStatement } from 'pgsql-ast-parser'
import type { Annotation, BodyDeclaration, ClassDeclaration, FieldDeclaration, ImportDeclaration, JavaAST, JavaDoc, TypeDeclaration } from './javaAst'
import type { Config } from './type'
import { camelCase, pascalCase } from 'change-case'
import { astVisitor } from 'pgsql-ast-parser'
import { getConfig } from './config'
import { createAnnotation, createBodyDeclaration, createClassDeclaration, createFieldDeclaration, createImportDeclaration, createModifier, createPackageDeclaration, createTypeDeclaration } from './javaAstBuilder'

export interface SpringDataJpaUnit {
  entity: JavaAST
  repository: JavaAST
}

export class SimpleJpaTransformer {
  private config!: Config

  async transform(ast: CreateTableStatement): Promise<SpringDataJpaUnit> {
    this.config = await getConfig()
    const entityAST = this.transformToEntityAST(ast)
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
      if (!isBasicDataTypeDef && isOmitColumn) {
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

    const entityAST: JavaAST = {
      type: 'JavaAST',
      body: [
        packageDeclaration,
        ...imports,
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
    const classDeclaration = createBaseRepositoryClass()

    const entityClassDeclaration = entityAST.body.find(node => node.type === 'ClassDeclaration')
    const entityClassName = entityClassDeclaration?.id.name || 'TempBaseEntity'
    const entityImport = createImportDeclaration(`${entityPackage}.${entityClassName}`)
    imports.push(entityImport)
    imports.push(createImportDeclaration(repositorySuperClazz.package))

    const repositoryClassName = `${entityClassName}Repository`
    classDeclaration.id.name = repositoryClassName

    const idFieldDeclaration: TypeDeclaration = entityClassDeclaration
      ?.body
      .body
      .find((node): node is FieldDeclaration =>
        node.type === 'FieldDeclaration' && node.annotations.some(a => a.id.name === 'Id'),
      )
      ?.typeDeclaration || createTypeDeclaration('Long')

    const generics = [createTypeDeclaration(entityClassName), idFieldDeclaration]
    classDeclaration.superClass = createTypeDeclaration(repositorySuperClazz.name, generics)

    const repositoryAST: JavaAST = {
      type: 'JavaAST',
      body: [
        packageDeclaration,
        ...imports,
        versionJavaDoc,
        classDeclaration,
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
    createImportDeclaration('jakarta.persistence.Column'),
    createImportDeclaration('jakarta.persistence.Entity'),
    createImportDeclaration('jakarta.persistence.Id'),
    createImportDeclaration('jakarta.persistence.Table'),
    createImportDeclaration('lombok.Getter'),
    createImportDeclaration('lombok.Setter'),
  ]
}

export function createVersionJavaDoc(): JavaDoc {
  return {
    type: 'JavaDoc',
    value: [
      '/**',
      ' * Auto-generated entity class.',
      ' */',
    ],
  }
}

export function createBaseRepositoryClass(): ClassDeclaration {
  const tempRepositoryClass: ClassDeclaration = createClassDeclaration('TempBaseEntityRepository', createEmptyBodyDeclaration())
  tempRepositoryClass.modifiers.push(createModifier('public'))
  tempRepositoryClass.annotations.push(createAnnotation('Repository'))
  return tempRepositoryClass
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
  return tempEntityClass
}

export function createEntityFieldDeclaration(column: CreateColumnDef, typeDeclaration: TypeDeclaration, isPrimaryKey: boolean): FieldDeclaration {
  const fieldname = camelCase(column.name.name)

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
