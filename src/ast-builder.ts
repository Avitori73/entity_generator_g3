import type { Annotation, Attribute, BlockComment, BlockStatement, BodyDeclaration, ClassDeclaration, ConstructorDeclaration, Expression, FieldDeclaration, Identifier, ImportDeclaration, InterfaceDeclaration, JavaDoc, LineComment, MethodDeclaration, Modifier, PackageDeclaration, Parameter, TypeDeclaration } from './type'

export function createJavaDoc(value: Array<string>): JavaDoc {
  return {
    type: 'JavaDoc',
    value,
  }
}

export function createLineComment(value: string): LineComment {
  return {
    type: 'LineComment',
    value,
  }
}

export function createBlockComment(value: Array<string>): BlockComment {
  return {
    type: 'BlockComment',
    value,
  }
}

export function createIdentifier(name: string): Identifier {
  return {
    type: 'Identifier',
    name,
  }
}

export function createExpression(value: string): Expression {
  return {
    type: 'Expression',
    value,
  }
}

export type AttributeType = string | number | boolean | TypeDeclaration

export function createAnnotation(name: string, attributes: Record<string, AttributeType | AttributeType[] | undefined> = {}): Annotation {
  return {
    type: 'Annotation',
    id: createIdentifier(name),
    attributes: Object.entries(attributes)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => createAttribute(key, value as AttributeType | AttributeType[])),
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
  const v = Array.isArray(value)
    ? value.map(getVExpression)
    : getVExpression(value)
  return {
    type: 'Attribute',
    key: createIdentifier(key),
    value: v,
  }
}

export function createModifier(name: 'public' | 'private' | 'protected' | 'static' | 'abstract' | 'final'): Modifier {
  return {
    type: 'Modifier',
    name,
  }
}

export function createPackageDeclaration(name: string): PackageDeclaration {
  return {
    type: 'PackageDeclaration',
    id: createIdentifier(name),
  }
}

export function createImportDeclaration(name: string): ImportDeclaration {
  return {
    type: 'ImportDeclaration',
    id: createIdentifier(name),
  }
}

export function createInterfaceDeclaration(name: string, body: BodyDeclaration): InterfaceDeclaration {
  return {
    type: 'InterfaceDeclaration',
    id: createIdentifier(name),
    modifiers: [],
    annotations: [],
    extends: [],
    body,
  }
}
export function createClassDeclaration(name: string, body: BodyDeclaration): ClassDeclaration {
  return {
    type: 'ClassDeclaration',
    id: createIdentifier(name),
    modifiers: [],
    annotations: [],
    implements: [],
    body,
  }
}

export function createBodyDeclaration(body: Array<MethodDeclaration | FieldDeclaration>): BodyDeclaration {
  return {
    type: 'BodyDeclaration',
    body,
  }
}

export function createConstructorDeclaration(name: string): ConstructorDeclaration {
  return {
    type: 'ConstructorDeclaration',
    id: createIdentifier(name),
    modifiers: [],
    annotations: [],
    params: [],
    body: createBlockStatement([]),
  }
}

export function createMethodDeclaration(name: string, returnType: TypeDeclaration = createTypeDeclaration('void')): MethodDeclaration {
  return {
    type: 'MethodDeclaration',
    id: createIdentifier(name),
    modifiers: [],
    annotations: [],
    params: [],
    returnType,
  }
}

export function createParameter(name: string, typeDeclaration: TypeDeclaration): Parameter {
  return {
    type: 'Parameter',
    id: createIdentifier(name),
    typeDeclaration,
  }
}

export function createBlockStatement(body: Array<Expression | BlockStatement>): BlockStatement {
  return {
    type: 'BlockStatement',
    body,
  }
}
export function createFieldDeclaration(name: string, typeDeclaration: TypeDeclaration): FieldDeclaration {
  return {
    type: 'FieldDeclaration',
    id: createIdentifier(name),
    modifiers: [],
    annotations: [],
    typeDeclaration,
  }
}

export function createTypeDeclaration(name: string, generics?: TypeDeclaration[]): TypeDeclaration {
  return {
    type: 'TypeDeclaration',
    id: createIdentifier(name),
    generics,
  }
}
