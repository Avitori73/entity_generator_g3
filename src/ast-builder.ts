import type {
  Annotation,
  Attribute,
  BlockComment,
  BlockStatement,
  BodyDeclaration,
  ClassDeclaration,
  ConstructorDeclaration,
  Expression,
  FieldDeclaration,
  Identifier,
  ImportDeclaration,
  InterfaceDeclaration,
  JavaAST,
  JavaDoc,
  LineComment,
  MethodDeclaration,
  Modifier,
  ModifierType,
  PackageDeclaration,
  Parameter,
  TypeDeclaration
} from './type'

export function createJavaDoc(value: Array<string>): JavaDoc {
  return {
    type: 'JavaDoc',
    value
  }
}

export function createLineComment(value: string): LineComment {
  return {
    type: 'LineComment',
    value
  }
}

export function createBlockComment(value: Array<string>): BlockComment {
  return {
    type: 'BlockComment',
    value
  }
}

export function createIdentifier(name: string): Identifier {
  return {
    type: 'Identifier',
    name
  }
}

export function createExpression(value: string): Expression {
  return {
    type: 'Expression',
    value
  }
}

type AttributeType = string | number | boolean | TypeDeclaration

type AnnotationAttrs = Record<string, AttributeType | AttributeType[] | undefined>

export function createAnnotation(name: string, attributes: AnnotationAttrs = {}): Annotation {
  return {
    type: 'Annotation',
    id: createIdentifier(name),
    attributes: Object.entries(attributes)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => createAttribute(key, value as AttributeType | AttributeType[]))
  }
}

export function createAttribute(key: string, value: AttributeType | AttributeType[]): Attribute {
  function getVExpression(v: AttributeType): Expression {
    if (typeof v === 'string') {
      return createExpression(`"${v}"`)
    }
    if (typeof v === 'number' || typeof v === 'boolean') {
      return createExpression(v.toString())
    }
    return createExpression(`${v.id.name}.class`)
  }
  const v = Array.isArray(value) ? value.map(getVExpression) : getVExpression(value)
  return {
    type: 'Attribute',
    key: createIdentifier(key),
    value: v
  }
}

export function createModifier(name: ModifierType): Modifier {
  return {
    type: 'Modifier',
    name
  }
}

export function createPackageDeclaration(name: string): PackageDeclaration {
  return {
    type: 'PackageDeclaration',
    id: createIdentifier(name)
  }
}

export function createImportDeclaration(name: string): ImportDeclaration {
  return {
    type: 'ImportDeclaration',
    id: createIdentifier(name)
  }
}

export function createInterfaceDeclaration(
  name: string,
  body: BodyDeclaration
): InterfaceDeclaration {
  return {
    type: 'InterfaceDeclaration',
    id: createIdentifier(name),
    modifiers: [],
    annotations: [],
    extends: [],
    body
  }
}
export function createClassDeclaration(name: string, body: BodyDeclaration): ClassDeclaration {
  return {
    type: 'ClassDeclaration',
    id: createIdentifier(name),
    modifiers: [],
    annotations: [],
    implements: [],
    body
  }
}

export function createBodyDeclaration(
  body: Array<MethodDeclaration | FieldDeclaration>
): BodyDeclaration {
  return {
    type: 'BodyDeclaration',
    body
  }
}

export function createConstructorDeclaration(name: string): ConstructorDeclaration {
  return {
    type: 'ConstructorDeclaration',
    id: createIdentifier(name),
    modifiers: [],
    annotations: [],
    params: [],
    body: createBlockStatement([])
  }
}

export function createMethodDeclaration(
  name: string,
  returnType: TypeDeclaration = createTypeDeclaration('void')
): MethodDeclaration {
  return {
    type: 'MethodDeclaration',
    id: createIdentifier(name),
    modifiers: [],
    annotations: [],
    params: [],
    returnType
  }
}

export function createParameter(name: string, typeDeclaration: TypeDeclaration): Parameter {
  return {
    type: 'Parameter',
    id: createIdentifier(name),
    typeDeclaration
  }
}

export function createBlockStatement(body: Array<Expression | BlockStatement>): BlockStatement {
  return {
    type: 'BlockStatement',
    body
  }
}

export function createFieldDeclaration(
  name: string,
  typeDeclaration: TypeDeclaration
): FieldDeclaration {
  return {
    type: 'FieldDeclaration',
    id: createIdentifier(name),
    modifiers: [],
    annotations: [],
    typeDeclaration
  }
}

export function createTypeDeclaration(name: string, generics?: TypeDeclaration[]): TypeDeclaration {
  return {
    type: 'TypeDeclaration',
    id: createIdentifier(name),
    generics
  }
}

export class FieldDeclarationBuilder {
  private id!: Identifier
  private modifier!: Set<Modifier>
  private typeDeclaration!: TypeDeclaration
  private annotations: Annotation[] = []
  private value?: Expression

  private constructor(modifiers: ModifierType[], id: string, typeDeclaration: TypeDeclaration) {
    if (!id) {
      throw new Error('FieldDeclaration Error: Field identifier cannot be empty.')
    }
    if (!Array.isArray(modifiers) || modifiers.length === 0) {
      throw new Error('FieldDeclaration Error: Modifiers must be a non-empty array.')
    }
    if (!typeDeclaration) {
      throw new Error('FieldDeclaration Error: Type declaration cannot be empty.')
    }
    this.id = createIdentifier(id)
    this.modifier = new Set(modifiers.map(createModifier))
    this.typeDeclaration = typeDeclaration
  }

  public static create(
    modifiers: ModifierType[],
    id: string,
    typeDeclaration: TypeDeclaration
  ): FieldDeclarationBuilder {
    return new FieldDeclarationBuilder(modifiers, id, typeDeclaration)
  }

  public addAnnotation(name: string, attributes?: AnnotationAttrs): FieldDeclarationBuilder {
    this.annotations.push(createAnnotation(name, attributes))
    return this
  }

  public setValue(value: Expression): FieldDeclarationBuilder {
    if (!value) {
      throw new Error('FieldDeclaration Error: Value cannot be empty.')
    }
    this.value = value
    return this
  }

  public build(): FieldDeclaration {
    return {
      type: 'FieldDeclaration',
      id: this.id,
      modifiers: Array.from(this.modifier),
      annotations: this.annotations,
      typeDeclaration: this.typeDeclaration,
      value: this.value
    }
  }
}

export class MethodDeclarationBuilder {
  private id!: Identifier
  private modifier!: Set<Modifier>
  private returnType!: TypeDeclaration
  private annotations: Annotation[] = []
  private params: Parameter[] = []
  private body: BlockStatement = {
    type: 'BlockStatement',
    body: []
  }

  private constructor(modifiers: ModifierType[], id: string, returnType?: TypeDeclaration) {
    if (!id) {
      throw new Error('MethodDeclaration Error: Method identifier cannot be empty.')
    }
    if (!Array.isArray(modifiers) || modifiers.length === 0) {
      throw new Error('MethodDeclaration Error: Modifiers must be a non-empty array.')
    }
    this.id = createIdentifier(id)
    this.modifier = new Set(modifiers.map(createModifier))
    this.returnType = returnType || createTypeDeclaration('void')
  }

  public static create(
    modifiers: ModifierType[],
    id: string,
    returnType?: TypeDeclaration
  ): MethodDeclarationBuilder {
    return new MethodDeclarationBuilder(modifiers, id, returnType)
  }

  public addAnnotation(name: string, attributes?: AnnotationAttrs): MethodDeclarationBuilder {
    this.annotations.push(createAnnotation(name, attributes))
    return this
  }

  public addParameter(name: string, typeDeclaration: TypeDeclaration): MethodDeclarationBuilder {
    if (!name || !typeDeclaration) {
      throw new Error(
        'MethodDeclaration Error: Parameter name and type declaration cannot be empty.'
      )
    }
    this.params.push(createParameter(name, typeDeclaration))
    return this
  }

  public addExpression(statement: Expression): MethodDeclarationBuilder {
    if (!statement) {
      throw new Error('MethodDeclaration Error: Statement cannot be empty.')
    }
    if (!this.body) {
      this.body = createBlockStatement([])
    }
    this.body.body.push(statement)
    return this
  }

  public addExpressions(statements: Expression[]): MethodDeclarationBuilder {
    if (!Array.isArray(statements) || statements.length === 0) {
      throw new Error('MethodDeclaration Error: Statements must be a non-empty array.')
    }
    this.body.body.push(...statements)
    return this
  }

  public build(): MethodDeclaration {
    return {
      type: 'MethodDeclaration',
      id: this.id,
      modifiers: Array.from(this.modifier),
      annotations: this.annotations,
      params: this.params,
      returnType: this.returnType,
      body: this.body || createBlockStatement([])
    }
  }
}

export class ConstructorDeclarationBuilder {
  private id!: Identifier
  private modifier!: Set<Modifier>
  private annotations: Annotation[] = []
  private params: Parameter[] = []
  private body: BlockStatement = {
    type: 'BlockStatement',
    body: []
  }

  private constructor(modifiers: ModifierType[], id: string) {
    if (!id) {
      throw new Error('ConstructorDeclaration Error: Constructor identifier cannot be empty.')
    }
    if (!Array.isArray(modifiers) || modifiers.length === 0) {
      throw new Error('ConstructorDeclaration Error: Modifiers must be a non-empty array.')
    }
    this.id = createIdentifier(id)
    this.modifier = new Set(modifiers.map(createModifier))
  }

  public static create(modifiers: ModifierType[], id: string): ConstructorDeclarationBuilder {
    return new ConstructorDeclarationBuilder(modifiers, id)
  }

  public addAnnotation(name: string, attributes?: AnnotationAttrs): ConstructorDeclarationBuilder {
    this.annotations.push(createAnnotation(name, attributes))
    return this
  }

  public addParameter(
    name: string,
    typeDeclaration: TypeDeclaration
  ): ConstructorDeclarationBuilder {
    if (!name || !typeDeclaration) {
      throw new Error(
        'ConstructorDeclaration Error: Parameter name and type declaration cannot be empty.'
      )
    }
    this.params.push(createParameter(name, typeDeclaration))
    return this
  }

  public addExpression(statement: Expression): ConstructorDeclarationBuilder {
    if (!statement) {
      throw new Error('ConstructorDeclaration Error: Statement cannot be empty.')
    }
    this.body.body.push(statement)
    return this
  }

  public addExpressions(statements: Expression[]): ConstructorDeclarationBuilder {
    if (!Array.isArray(statements) || statements.length === 0) {
      throw new Error('ConstructorDeclaration Error: Statements must be a non-empty array.')
    }
    this.body.body.push(...statements)
    return this
  }

  public build(): ConstructorDeclaration {
    return {
      type: 'ConstructorDeclaration',
      id: this.id,
      modifiers: Array.from(this.modifier),
      annotations: this.annotations,
      params: this.params,
      body: this.body
    }
  }
}

export class InterfaceDeclarationBuilder {
  private body: BodyDeclaration = {
    type: 'BodyDeclaration',
    body: []
  }

  private id!: Identifier
  private modifier!: Set<Modifier>
  private annotations: Annotation[] = []
  private extends: TypeDeclaration[] = []
  private methodDeclarations: MethodDeclaration[] = []
  private FieldDeclarations: FieldDeclaration[] = []

  private constructor(modifiers: ModifierType[], id: string) {
    if (!id) {
      throw new Error('InterfaceDeclarationBuilder Error: Class identifier cannot be empty.')
    }
    if (!Array.isArray(modifiers) || modifiers.length === 0) {
      throw new Error('InterfaceDeclarationBuilder Error: Modifiers must be a non-empty array.')
    }
    this.id = createIdentifier(id)
    this.modifier = new Set(modifiers.map(createModifier))
  }

  public static create(modifiers: ModifierType[], id: string): InterfaceDeclarationBuilder {
    return new InterfaceDeclarationBuilder(modifiers, id)
  }

  public addExtend(extend: string, generics?: TypeDeclaration[]): InterfaceDeclarationBuilder {
    if (!extend) {
      throw new Error('InterfaceDeclaration Error: Extend cannot be empty.')
    }
    this.extends.push(createTypeDeclaration(extend, generics))
    return this
  }

  public addAnnotation(name: string, attributes?: AnnotationAttrs): InterfaceDeclarationBuilder {
    this.annotations.push(createAnnotation(name, attributes))
    return this
  }

  public addMethod(declaration: MethodDeclaration): InterfaceDeclarationBuilder {
    this.methodDeclarations.push(declaration)
    return this
  }

  public addField(declaration: FieldDeclaration): InterfaceDeclarationBuilder {
    this.FieldDeclarations.push(declaration)
    return this
  }

  public build(): InterfaceDeclaration {
    if (this.FieldDeclarations.length > 0) {
      this.body.body.push(...this.FieldDeclarations)
    }
    if (this.methodDeclarations.length > 0) {
      this.body.body.push(...this.methodDeclarations)
    }

    return {
      type: 'InterfaceDeclaration',
      id: this.id,
      modifiers: Array.from(this.modifier),
      annotations: this.annotations,
      extends: this.extends,
      body: this.body
    }
  }
}

export class ClassDeclarationBuilder {
  private body: BodyDeclaration = {
    type: 'BodyDeclaration',
    body: []
  }

  private id!: Identifier
  private modifier!: Set<Modifier>
  private annotations: Annotation[] = []
  private superClass?: TypeDeclaration
  private implements: TypeDeclaration[] = []
  private constructorDeclarations: ConstructorDeclaration[] = []
  private methodDeclarations: MethodDeclaration[] = []
  private fieldDeclarations: FieldDeclaration[] = []

  private constructor(modifiers: ModifierType[], id: string) {
    if (!id) {
      throw new Error('ClassDeclaration Error: Class identifier cannot be empty.')
    }
    if (!Array.isArray(modifiers) || modifiers.length === 0) {
      throw new Error('ClassDeclaration Error: Modifiers must be a non-empty array.')
    }
    this.id = createIdentifier(id)
    this.modifier = new Set(modifiers.map(createModifier))
  }

  public static create(modifiers: ModifierType[], id: string): ClassDeclarationBuilder {
    return new ClassDeclarationBuilder(modifiers, id)
  }

  public setSuperClass(superClass: string, generics?: TypeDeclaration[]): ClassDeclarationBuilder {
    if (this.superClass) {
      throw new Error('ClassDeclaration Error: Super class is already set.')
    }
    if (!superClass) {
      throw new Error('ClassDeclaration Error: Super class cannot be empty.')
    }
    this.superClass = createTypeDeclaration(superClass, generics)
    return this
  }

  public addImplement(implement: string, generics?: TypeDeclaration[]): ClassDeclarationBuilder {
    if (!implement) {
      throw new Error('ClassDeclaration Error: Implement cannot be empty.')
    }
    this.implements.push(createTypeDeclaration(implement, generics))
    return this
  }

  public addAnnotation(name: string, attributes?: AnnotationAttrs): ClassDeclarationBuilder {
    this.annotations.push(createAnnotation(name, attributes))
    return this
  }

  public addConstructor(declaration: ConstructorDeclaration): ClassDeclarationBuilder {
    this.constructorDeclarations.push(declaration)
    return this
  }

  public addMethod(declaration: MethodDeclaration): ClassDeclarationBuilder {
    this.methodDeclarations.push(declaration)
    return this
  }

  public addField(declaration: FieldDeclaration): ClassDeclarationBuilder {
    this.fieldDeclarations.push(declaration)
    return this
  }

  public build(): ClassDeclaration {
    if (this.fieldDeclarations.length > 0) {
      this.body.body.push(...this.fieldDeclarations)
    }
    if (this.constructorDeclarations.length > 0) {
      this.body.body.push(...this.constructorDeclarations)
    }
    if (this.methodDeclarations.length > 0) {
      this.body.body.push(...this.methodDeclarations)
    }

    return {
      type: 'ClassDeclaration',
      id: this.id,
      modifiers: Array.from(this.modifier),
      annotations: this.annotations,
      superClass: this.superClass,
      implements: this.implements,
      body: this.body
    }
  }
}

export class JavaAstBuilder {
  private packageDeclaration?: PackageDeclaration
  private javaDoc?: JavaDoc
  private imports: Set<string> = new Set()
  private classDeclaration?: ClassDeclaration
  private interfaceDeclaration?: InterfaceDeclaration

  private constructor() {}

  public static create(): JavaAstBuilder {
    return new JavaAstBuilder()
  }

  public setPackageDeclaration(name: string): JavaAstBuilder {
    if (this.packageDeclaration) {
      throw new Error('JavaAst Error: Package declaration is already set.')
    }
    if (!name) {
      throw new Error('JavaAst Error: Package name cannot be empty.')
    }
    this.packageDeclaration = createPackageDeclaration(name)
    return this
  }

  public setJavaDoc(docs: Array<string>): JavaAstBuilder {
    if (this.javaDoc) {
      throw new Error('JavaAst Error: Version JavaDoc is already set.')
    }
    if (!Array.isArray(docs) || docs.length === 0) {
      throw new Error('JavaAst Error: Version JavaDoc must be a non-empty array.')
    }
    this.javaDoc = createJavaDoc(docs)
    return this
  }

  public addImport(name: string): JavaAstBuilder {
    if (!name) {
      throw new Error('JavaAst Error: Import name cannot be empty.')
    }
    this.imports.add(name)
    return this
  }

  public addImports(names: string[]): JavaAstBuilder {
    if (!Array.isArray(names) || names.length === 0) {
      throw new Error('JavaAst Error: Imports must be a non-empty array.')
    }
    names.forEach((name) => this.addImport(name))
    return this
  }

  public setInterfaceDeclaration(declaration: InterfaceDeclaration): JavaAstBuilder {
    if (this.interfaceDeclaration || this.classDeclaration) {
      throw new Error(
        'JavaAst Error: Interface declaration or class declaration should be only one.'
      )
    }
    if (!declaration) {
      throw new Error('JavaAst Error: Interface declaration cannot be empty.')
    }
    this.interfaceDeclaration = declaration
    return this
  }

  public setClassDeclaration(declaration: ClassDeclaration): JavaAstBuilder {
    if (this.interfaceDeclaration || this.classDeclaration) {
      throw new Error(
        'JavaAst Error: Interface declaration or class declaration should be only one.'
      )
    }
    if (!declaration) {
      throw new Error('JavaAst Error: Class declaration cannot be empty.')
    }
    this.classDeclaration = declaration
    return this
  }

  public build(): JavaAST {
    if (!this.packageDeclaration) {
      throw new Error('JavaAst Error: Package declaration is not set.')
    }
    if (!this.classDeclaration && !this.interfaceDeclaration) {
      throw new Error('JavaAst Error: Class declaration or interface declaration is not set.')
    }
    const javaAst: JavaAST = {
      type: 'JavaAST',
      body: [this.packageDeclaration, ...Array.from(this.imports).map(createImportDeclaration)]
    }
    if (this.javaDoc) {
      javaAst.body.push(this.javaDoc)
    }
    if (this.interfaceDeclaration) {
      javaAst.body.push(this.interfaceDeclaration)
    } else if (this.classDeclaration) {
      javaAst.body.push(this.classDeclaration)
    }
    return javaAst
  }
}
