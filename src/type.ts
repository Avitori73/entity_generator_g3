import type { Options as PrettierOptions } from 'prettier'

export interface JavaAstMeta {
  entityClassName: string
  primaryKeys: Array<string>
}

export interface Config {
  // prettier
  prettierOptions: PrettierOptions

  // entity
  entityPackage: string
  entitySuperClazz: {
    name: string
    package: string
  }
  partitionEntityPackage: string
  partitionEntitySuperClazz: {
    name: string
    package: string
  }

  // entity key
  entityKeyPackage: string

  // repository
  partitionRepositoryPackage: string
  repositoryPackage: string
  repositorySuperClazz: {
    name: string
    package: string
  }

  // vo
  voPackage: string
  voSuperClazz: {
    name: string
    package: string
  }
  partitionVoPackage: string
  partitionVoSuperClazz: {
    name: string
    package: string
  }

  partitionKey: string
  omitColumns: Array<string>
  dataTypeMap: Record<string, string>
  dataImportMap: Record<string, string | string[]>
  defaultVOImportMap: Record<string, string>
  defaultVOValueMap: Record<string, string>
}

export interface BaseNode {
  type: string
}

export type JavaASTNode =
  | PackageDeclaration
  | ImportDeclaration
  | JavaDoc
  | ClassDeclaration
  | InterfaceDeclaration

export interface JavaAST {
  type: 'JavaAST'
  body: Array<JavaASTNode>
}

export interface JavaDoc extends BaseNode {
  type: 'JavaDoc'
  value: Array<string>
}

export interface LineComment extends BaseNode {
  type: 'LineComment'
  value: string
}

export interface BlockComment extends BaseNode {
  type: 'BlockComment'
  value: Array<string>
}

export interface Identifier extends BaseNode {
  type: 'Identifier'
  name: string
}

export interface Expression extends BaseNode {
  type: 'Expression'
  value: string
}

export interface Annotation extends BaseNode {
  type: 'Annotation'
  id: Identifier
  attributes: Attribute[]
}

export interface Attribute extends BaseNode {
  type: 'Attribute'
  key: Identifier
  value: Expression | Expression[]
}

export type ModifierType = 'public' | 'private' | 'protected' | 'static' | 'abstract' | 'final'

export interface Modifier extends BaseNode {
  type: 'Modifier'
  name: ModifierType
}

export interface PackageDeclaration extends BaseNode {
  type: 'PackageDeclaration'
  id: Identifier
}

export interface ImportDeclaration extends BaseNode {
  type: 'ImportDeclaration'
  id: Identifier
}

export interface InterfaceDeclaration extends BaseNode {
  type: 'InterfaceDeclaration'
  id: Identifier
  modifiers: Modifier[]
  annotations: Annotation[]
  extends: TypeDeclaration[]
  body: BodyDeclaration
}

export interface ClassDeclaration extends BaseNode {
  type: 'ClassDeclaration'
  id: Identifier
  modifiers: Modifier[]
  annotations: Annotation[]
  superClass?: TypeDeclaration
  implements: TypeDeclaration[]
  body: BodyDeclaration
}

export type JavaClassBodyDeclaration = ConstructorDeclaration | MethodDeclaration | FieldDeclaration

export interface BodyDeclaration extends BaseNode {
  type: 'BodyDeclaration'
  body: Array<JavaClassBodyDeclaration>
}

export interface ConstructorDeclaration extends BaseNode {
  type: 'ConstructorDeclaration'
  id: Identifier
  modifiers: Modifier[]
  annotations: Annotation[]
  params: Parameter[]
  body: BlockStatement
}

export interface MethodDeclaration extends BaseNode {
  type: 'MethodDeclaration'
  id: Identifier
  modifiers: Modifier[]
  annotations: Annotation[]
  params: Parameter[]
  returnType: TypeDeclaration
  body?: BlockStatement
}

export interface Parameter extends BaseNode {
  type: 'Parameter'
  id: Identifier
  typeDeclaration: TypeDeclaration
}

export interface BlockStatement extends BaseNode {
  type: 'BlockStatement'
  body: Array<Expression | BlockStatement>
}

export interface FieldDeclaration extends BaseNode {
  type: 'FieldDeclaration'
  id: Identifier
  modifiers: Modifier[]
  annotations: Annotation[]
  typeDeclaration: TypeDeclaration
  value?: Expression
}

export interface TypeDeclaration extends BaseNode {
  type: 'TypeDeclaration'
  id: Identifier
  generics?: TypeDeclaration[]
}

export interface TableAstMeta {
  tablename: string
  primaryKeys: Array<string>
  columns: Array<ColumnAstMeta>
}

export interface ColumnAstMeta {
  columnName: string
  columnType: string
  columnDef: ColumnDef
}

export interface ColumnDef {
  name: string
  nullable: boolean
  length?: number
  precision?: number
  scale?: number
  columnDefinition?: string
}

export interface EntityFieldMeta extends ColumnAstMeta {
  isPrimaryKey: boolean
  isPartitionKey: boolean
  fieldName: string
  fieldType: string
  imports?: string | string[]
  defaultValue?: string
  defaultVOImport?: string
}

export interface EntityMeta {
  tablename: string
  primaryKeys: Array<string>
  entityPackage: string
  entityRepositoryPackage: string
  repositorySuperClass: {
    name: string
    package: string
  }
  entityVOPackage: string
  entitySuperClass: {
    name: string
    package: string
  }
  entityVOSuperClass: {
    name: string
    package: string
  }
  entityName: string
  columns: Array<EntityFieldMeta>
}
