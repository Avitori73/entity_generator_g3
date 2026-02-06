import type {
  Annotation,
  Attribute,
  BaseNode,
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
  PackageDeclaration,
  Parameter,
  TypeDeclaration
} from './type'

export const modifierOrder = ['public', 'protected', 'private', 'abstract', 'static', 'final']

export const javaAstBodyNodePriority: Record<string, number> = {
  PackageDeclaration: 0,
  ImportDeclaration: 1,
  JavaDoc: 2,
  ClassDeclaration: 3,
  InterfaceDeclaration: 3
}

function sortByPriority<T extends BaseNode>(a: T, b: T): number {
  const aPriority = javaAstBodyNodePriority[a.type] ?? 100
  const bPriority = javaAstBodyNodePriority[b.type] ?? 100
  return aPriority - bPriority
}

export function generateJavaCode(javaAst: JavaAST): Array<string> {
  return javaAst.body.sort(sortByPriority).map(generateNode).flat()
}

export function generateJavaDoc(javaDoc: JavaDoc): Array<string> {
  return ['/**', ...javaDoc.value.map((v) => ` * ${v}`), ' */']
}

export function generateLineComment(lineComment: LineComment): string {
  return `// ${lineComment.value}`
}

export function generateBlockComment(blockComment: BlockComment): Array<string> {
  return ['/*', ...blockComment.value.map((v) => ` ${v}`), ' */']
}

export function generateIdentifier(identifier: Identifier): string {
  return identifier.name
}

export function generateExpression(expression: Expression): string {
  return expression.value
}

export function generateAnnotation(annotation: Annotation): Array<string> {
  return [
    `@${annotation.id.name}${annotation.attributes.length ? `(${annotation.attributes.map(generateAttribute).join(', ')})` : ''}`
  ]
}

export function generateAttribute(attribute: Attribute): string {
  const attributeKey = attribute.key.name === 'value' ? '' : `${attribute.key.name} = `
  if (Array.isArray(attribute.value)) {
    return `${attributeKey}{${attribute.value.map(generateExpression).join(', ')}}`
  } else {
    return `${attributeKey}${generateExpression(attribute.value)}`
  }
}

export function generateModifiers(modifiers: Array<Modifier>): string {
  return modifiers
    .sort((a, b) => modifierOrder.indexOf(a.name) - modifierOrder.indexOf(b.name))
    .map((m) => m.name)
    .join(' ')
}

export function generatePackageDeclaration(packageDeclaration: PackageDeclaration): Array<string> {
  return [`package ${packageDeclaration.id.name};`]
}

export function generateImportDeclaration(importDeclaration: ImportDeclaration): Array<string> {
  return [`import ${importDeclaration.id.name};`]
}

export function generateInterfaceDeclaration(
  interfaceDeclaration: InterfaceDeclaration
): Array<string> {
  const annotations = interfaceDeclaration.annotations.map(generateAnnotation).flat()
  const modifiers = generateModifiers(interfaceDeclaration.modifiers)
  const extendsInterfaces = interfaceDeclaration.extends.length
    ? `extends ${interfaceDeclaration.extends.map(generateTypeDeclaration).join(', ')}`
    : ''
  const body = generateBodyDeclaration(interfaceDeclaration.body)
  return [
    ...annotations,
    `${modifiers} interface ${interfaceDeclaration.id.name} ${extendsInterfaces}`,
    ...body
  ]
}

export function generateClassDeclaration(classDeclaration: ClassDeclaration): Array<string> {
  const annotations = classDeclaration.annotations.map(generateAnnotation).flat()
  const modifiers = generateModifiers(classDeclaration.modifiers)
  const superClass = classDeclaration.superClass
    ? `extends ${generateTypeDeclaration(classDeclaration.superClass)}`
    : ''
  const implementsInterfaces = classDeclaration.implements.length
    ? `implements ${classDeclaration.implements.map(generateTypeDeclaration).join(', ')}`
    : ''
  const body = generateBodyDeclaration(classDeclaration.body)
  return [
    ...annotations,
    `${modifiers} class ${classDeclaration.id.name} ${superClass} ${implementsInterfaces}`,
    ...body
  ]
}

export function generateBodyDeclaration(bodyDeclaration: BodyDeclaration): Array<string> {
  return ['{', ...bodyDeclaration.body.map(generateNode).flat(), '}']
}

export function generateConstructorDeclaration(
  constructorDeclaration: ConstructorDeclaration
): Array<string> {
  const annotations = constructorDeclaration.annotations.map(generateAnnotation).flat()
  const modifiers = generateModifiers(constructorDeclaration.modifiers)
  const constructorName = constructorDeclaration.id.name
  const params = constructorDeclaration.params.map(generateParameter).join(', ')
  const body = generateBlockStatement(constructorDeclaration.body)
  return [...annotations, `${modifiers} ${constructorName}(${params})`, ...body]
}

export function generateMethodDeclaration(methodDeclaration: MethodDeclaration): Array<string> {
  const annotations = methodDeclaration.annotations.map(generateAnnotation).flat()
  const modifiers = generateModifiers(methodDeclaration.modifiers)
  const returnType = generateTypeDeclaration(methodDeclaration.returnType)
  const methodName = methodDeclaration.id.name
  const params = methodDeclaration.params.map(generateParameter).join(', ')
  const body = methodDeclaration.body ? generateBlockStatement(methodDeclaration.body) : []
  if (body.length) {
    return [...annotations, `${modifiers} ${returnType} ${methodName}(${params})`, ...body]
  } else {
    return [...annotations, `${modifiers} ${returnType} ${methodName}(${params});`]
  }
}

export function generateParameter(parameter: Parameter): string {
  return `${generateTypeDeclaration(parameter.typeDeclaration)} ${parameter.id.name}`
}

export function generateBlockStatement(blockStatement: BlockStatement): Array<string> {
  return ['{', ...blockStatement.body.map(generateNode).flat(), '}']
}

export function generateFieldDeclaration(fieldDeclaration: FieldDeclaration): Array<string> {
  const annotations = fieldDeclaration.annotations.map(generateAnnotation).flat()
  const modifiers = generateModifiers(fieldDeclaration.modifiers)
  const typeDeclaration = generateTypeDeclaration(fieldDeclaration.typeDeclaration)
  const fieldName = fieldDeclaration.id.name
  if (fieldDeclaration.value) {
    return [
      ...annotations,
      `${modifiers} ${typeDeclaration} ${fieldName} = ${generateExpression(fieldDeclaration.value)};`
    ]
  } else {
    return [...annotations, `${modifiers} ${typeDeclaration} ${fieldName};`]
  }
}

export function generateTypeDeclaration(typeDeclaration: TypeDeclaration): string {
  return `${typeDeclaration.id.name}${typeDeclaration.generics ? `<${typeDeclaration.generics.map(generateTypeDeclaration).join(', ')}>` : ''}`
}

export function generateNode(node: BaseNode): Array<string> | string {
  switch (node.type) {
    case 'JavaAST':
      return generateJavaCode(node as JavaAST)
    case 'JavaDoc':
      return generateJavaDoc(node as JavaDoc)
    case 'LineComment':
      return generateLineComment(node as LineComment)
    case 'BlockComment':
      return generateBlockComment(node as BlockComment)
    case 'Identifier':
      return generateIdentifier(node as Identifier)
    case 'Expression':
      return generateExpression(node as Expression)
    case 'Annotation':
      return generateAnnotation(node as Annotation)
    case 'Attribute':
      return generateAttribute(node as Attribute)
    case 'Modifier':
      return generateModifiers([node as Modifier])
    case 'PackageDeclaration':
      return generatePackageDeclaration(node as PackageDeclaration)
    case 'ImportDeclaration':
      return generateImportDeclaration(node as ImportDeclaration)
    case 'InterfaceDeclaration':
      return generateInterfaceDeclaration(node as InterfaceDeclaration)
    case 'ClassDeclaration':
      return generateClassDeclaration(node as ClassDeclaration)
    case 'BodyDeclaration':
      return generateBodyDeclaration(node as BodyDeclaration)
    case 'ConstructorDeclaration':
      return generateConstructorDeclaration(node as ConstructorDeclaration)
    case 'MethodDeclaration':
      return generateMethodDeclaration(node as MethodDeclaration)
    case 'FieldDeclaration':
      return generateFieldDeclaration(node as FieldDeclaration)
    case 'TypeDeclaration':
      return generateTypeDeclaration(node as TypeDeclaration)
    default:
      return []
  }
}
