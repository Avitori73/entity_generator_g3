import type { Annotation, Attribute, BlockComment, BlockStatement, BodyDeclaration, ClassDeclaration, Expression, FieldDeclaration, Identifier, ImportDeclaration, InterfaceDeclaration, JavaDoc, LineComment, MethodDeclaration, Modifier, PackageDeclaration, Parameter, TypeDeclaration } from './java-ast'

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

export function createAnnotation(name: string, attributes: Record<string, string | number | boolean | undefined> = {}): Annotation {
  return {
    type: 'Annotation',
    id: createIdentifier(name),
    attributes: Object.entries(attributes)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => createAttribute(key, value as string | number | boolean)),
  }
}

export function createAttribute(key: string, value: string | number | boolean): Attribute {
  return {
    type: 'Attribute',
    key: createIdentifier(key),
    value: createExpression(typeof value === 'string' ? `"${value}"` : `${value}`),
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
