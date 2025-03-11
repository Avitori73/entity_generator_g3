import type { JavaFile, JavaProperty } from './type'

export function generateJavaCode(javaFile: JavaFile): string[] {
  const lines = []

  lines.push(javaFile.package)

  javaFile.imports?.forEach((i) => {
    lines.push(i)
  })

  javaFile.interfaces?.forEach((i) => {
    lines.push(`@${i.name}${i.attributes ? `(${i.attributes.join(', ')})` : ''}`)
  })

  lines.push(`${javaFile.accessModifier} ${javaFile.type} ${javaFile.name} ${javaFile.extends
    ? `extends ${javaFile.extends}`
    : ''} {`)

  javaFile.properties?.forEach((p) => {
    lines.push(...generateJavaPropertyDeclaration(p))
  })

  lines.push('}')

  return lines
}

export function generateJavaPropertyDeclaration(property: JavaProperty): string[] {
  const lines = []

  property.interfaces?.forEach((i) => {
    const attributes = i.attributes ? `(${i.attributes.join(', ')})` : ''
    lines.push(`@${i.name}${attributes}`)
  })

  const field = property.field
  lines.push(`${field.accessModifier} ${field.isStatic ? 'static ' : ''}${field.isFinal ? 'final ' : ''}${field.type} ${field.name}${field.defaultValue !== null ? ` = ${field.defaultValue}` : ''};`)

  return lines
}
