export interface BaseNode {
  type: string
}

export interface JavaAST {
  type: 'JavaAST'
  body: Array<JavaDoc | LineComment | BlockComment | PackageDeclaration | ImportDeclaration | ClassDeclaration | InterfaceDeclaration>
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
  value: Expression
}

export interface Modifier extends BaseNode {
  type: 'Modifier'
  name: 'public' | 'private' | 'protected' | 'static' | 'abstract' | 'final'
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

export interface BodyDeclaration extends BaseNode {
  type: 'BodyDeclaration'
  body: Array<MethodDeclaration | FieldDeclaration>
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
