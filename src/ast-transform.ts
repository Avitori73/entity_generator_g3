import type { JavaAstAdapter } from './ast-adapter'
import type { FieldDeclaration, JavaAST, MethodDeclaration } from './type'
import { ClassDeclarationBuilder, createExpression, createTypeDeclaration, FieldDeclarationBuilder, InterfaceDeclarationBuilder, JavaAstBuilder, MethodDeclarationBuilder } from './ast-builder'

export const BASE_ENTITY_IMPORTS = [
  'jakarta.persistence.Column',
  'jakarta.persistence.Entity',
  'jakarta.persistence.Id',
  'jakarta.persistence.PostLoad',
  'jakarta.persistence.PostPersist',
  'jakarta.persistence.Table',
  'jakarta.persistence.Transient',
  'lombok.Getter',
  'lombok.Setter',
  'org.springframework.data.domain.Persistable',
]

export const SNOWFLAKE_IMPORT = 'com.ymsl.solid.jpa.uuid.annotation.SnowflakeGenerator'

export const BASE_ENTITY_KEY_IMPORTS = [
  'com.a1stream.common.utils.UserDetailsUtil',
  'java.io.Serializable',
  'lombok.AllArgsConstructor',
  'lombok.Data',
  'lombok.NoArgsConstructor',
]

export const BASE_ENTITY_REPOSITORY_IMPORTS = [
  'org.springframework.stereotype.Repository',
]

export const BASE_ENTITY_VO_IMPORTS = [
  'com.ymsl.solid.base.util.IdUtils',
  'lombok.AllArgsConstructor',
  'lombok.Builder',
  'lombok.Data',
  'lombok.EqualsAndHashCode',
  'lombok.NoArgsConstructor',
]

export const BASE_PARTITION_ENTITY_VO_IMPORTS = [
  'com.a1stream.common.utils.UserDetailsUtil',
]

export const BASE_ENTITY_JAVADOC = [
  `@author Entity Generator G3`,
]

export interface SimpleJpaUnit {
  entity: JavaAST
  repository: JavaAST
  vo: JavaAST
}

export interface PartitionJpaUnit {
  entity: JavaAST
  repository: JavaAST
  vo: JavaAST
}

export class PartitionJpaTransformer {
  private adapter: JavaAstAdapter

  constructor(adapter: JavaAstAdapter) {
    this.adapter = adapter
  }

  async transform(): Promise<PartitionJpaUnit> {
    const entityAST = this.transformToEntityAST()
    const repositoryAST = this.transformToRepositoryAST()
    const voAST = this.transformToVOAST()
    return {
      entity: entityAST,
      repository: repositoryAST,
      vo: voAST,
    }
  }

  private transformToEntityAST(): JavaAST {
    const meta = this.adapter.getEntityMeta()

    const primaryKeys = meta.columns.filter(key => key.isPrimaryKey && !key.isPartitionKey)
    if (primaryKeys.length === 0) {
      throw new Error(`No primary key found for entity ${meta.entityName}`)
    }
    const primaryKey = primaryKeys[0]

    const javaAstBuilder = JavaAstBuilder.create()
      .setPackageDeclaration(meta.entityPackage)
      .addImports([
        ...BASE_ENTITY_IMPORTS,
        meta.entitySuperClass.package,
      ])
      .setJavaDoc(BASE_ENTITY_JAVADOC)

    const classDeclarationBuilder = ClassDeclarationBuilder.create(['public'], meta.entityName)
      .setSuperClass(meta.entitySuperClass.name)
      .addImplement('Persistable', [createTypeDeclaration(primaryKey.fieldType)])
      .addAnnotation('Entity')
      .addAnnotation('Getter')
      .addAnnotation('Setter')
      .addAnnotation('Table', { name: meta.tablename })

    classDeclarationBuilder.addField(createSerialVersionUID())

    meta.columns.forEach((column) => {
      const fieldDeclarationBuilder = FieldDeclarationBuilder.create(['private'], column.fieldName, createTypeDeclaration(column.fieldType))

      if (isJsonType(column.columnType)) {
        fieldDeclarationBuilder.addAnnotation('Type', { value: createTypeDeclaration('StringJsonUserType') })
      }
      if (column.isPrimaryKey && !column.isPartitionKey) {
        fieldDeclarationBuilder.addAnnotation('Id')
        if (column.fieldType === 'Long') {
          fieldDeclarationBuilder.addAnnotation('SnowflakeGenerator')
          javaAstBuilder.addImport(SNOWFLAKE_IMPORT)
        }
      }
      fieldDeclarationBuilder.addAnnotation('Column', { ...column.columnDef })

      classDeclarationBuilder.addField(fieldDeclarationBuilder.build())

      if (column.imports) {
        const imports = Array.isArray(column.imports) ? column.imports : [column.imports]
        imports.forEach(importPath => javaAstBuilder.addImport(importPath))
      }
    })

    classDeclarationBuilder.addField(createIsNew())
    classDeclarationBuilder.addMethod(this.createGetIdMethod(primaryKey.fieldName, primaryKey.fieldType))
    classDeclarationBuilder.addMethod(createIsNewMethod())
    classDeclarationBuilder.addMethod(createMarkAsNotNewMethod())

    javaAstBuilder.setClassDeclaration(classDeclarationBuilder.build())

    return javaAstBuilder.build()
  }

  private createGetIdMethod(keyName: string, keyType: string): MethodDeclaration {
    return MethodDeclarationBuilder.create(['public'], 'getId', createTypeDeclaration(keyType))
      .addAnnotation('Override')
      .addExpressions([createExpression(`return ${keyName};`)])
      .build()
  }

  private transformToRepositoryAST(): JavaAST {
    const meta = this.adapter.getEntityMeta()

    const primaryKeys = meta.columns.filter(key => key.isPrimaryKey && !key.isPartitionKey)
    if (primaryKeys.length === 0) {
      throw new Error(`No primary key found for entity ${meta.entityName}`)
    }
    const primaryKey = primaryKeys[0]

    const javaAstBuilder = JavaAstBuilder.create()
      .setPackageDeclaration(meta.entityRepositoryPackage)
      .addImports([
        `${meta.entityPackage}.${meta.entityName}`,
        ...BASE_ENTITY_REPOSITORY_IMPORTS,
        meta.repositorySuperClass.package,
      ])
      .setJavaDoc(BASE_ENTITY_JAVADOC)

    const interfaceDeclaration = InterfaceDeclarationBuilder.create(['public'], `${meta.entityName}Repository`)
      .addAnnotation('Repository')
      .addExtend(meta.repositorySuperClass.name, [createTypeDeclaration(meta.entityName), createTypeDeclaration(primaryKey.fieldType)])
      .build()

    javaAstBuilder.setInterfaceDeclaration(interfaceDeclaration)

    return javaAstBuilder.build()
  }

  private transformToVOAST(): JavaAST {
    const meta = this.adapter.getEntityMeta()

    const primaryKeys = meta.columns.filter(key => key.isPrimaryKey && !key.isPartitionKey)
    if (primaryKeys.length === 0) {
      throw new Error(`No primary key found for entity ${meta.entityName}`)
    }
    const primaryKey = primaryKeys[0]

    const javaAstBuilder = JavaAstBuilder.create()
      .setPackageDeclaration(meta.entityVOPackage)
      .addImports([...BASE_ENTITY_VO_IMPORTS, ...BASE_PARTITION_ENTITY_VO_IMPORTS, meta.entityVOSuperClass.package])
      .setJavaDoc(BASE_ENTITY_JAVADOC)

    const entityVOName = `${meta.entityName}VO`

    const classDeclarationBuilder = ClassDeclarationBuilder.create(['public'], entityVOName)
      .setSuperClass(meta.entityVOSuperClass.name)
      .addAnnotation('Data')
      .addAnnotation('Builder')
      .addAnnotation('AllArgsConstructor')
      .addAnnotation('NoArgsConstructor')
      .addAnnotation('EqualsAndHashCode', { callSuper: true })
      .addField(createSerialVersionUID())

    meta.columns.forEach((column) => {
      const fieldDeclarationBuilder = FieldDeclarationBuilder.create(['private'], column.fieldName, createTypeDeclaration(column.fieldType))
      if (column.defaultValue) {
        fieldDeclarationBuilder.setValue(createExpression(column.defaultValue))
        fieldDeclarationBuilder.addAnnotation('Builder.Default')
      }
      classDeclarationBuilder.addField(fieldDeclarationBuilder.build())

      if (column.defaultVOImport) {
        javaAstBuilder.addImport(column.defaultVOImport)
      }
    })

    if (primaryKey.fieldType === 'Long') {
      classDeclarationBuilder.addMethod(createBuilderWithId(entityVOName, primaryKey.fieldName, true))
      classDeclarationBuilder.addMethod(createBuilderWithDefault(entityVOName, primaryKey.fieldName, true))
    }
    else if (primaryKey.fieldType === 'String') {
      classDeclarationBuilder.addMethod(createBuilderWithId(entityVOName, primaryKey.fieldName, false))
      classDeclarationBuilder.addMethod(createBuilderWithDefault(entityVOName, primaryKey.fieldName, false))
    }

    javaAstBuilder.setClassDeclaration(classDeclarationBuilder.build())

    return javaAstBuilder.build()
  }
}

export class SimpleJpaTransformer {
  private adapter: JavaAstAdapter

  constructor(adapter: JavaAstAdapter) {
    this.adapter = adapter
  }

  async transform(): Promise<SimpleJpaUnit> {
    const entityAST = this.transformToEntityAST()
    const repositoryAST = this.transformToRepositoryAST()
    const voAST = this.transformToVOAST()
    return {
      entity: entityAST,
      repository: repositoryAST,
      vo: voAST,
    }
  }

  private transformToEntityAST(): JavaAST {
    const meta = this.adapter.getEntityMeta()

    const primaryKeys = meta.columns.filter(key => key.isPrimaryKey && !key.isPartitionKey)
    if (primaryKeys.length === 0) {
      throw new Error(`No primary key found for entity ${meta.entityName}`)
    }
    const primaryKey = primaryKeys[0]

    const javaAstBuilder = JavaAstBuilder.create()
      .setPackageDeclaration(meta.entityPackage)
      .addImports([...BASE_ENTITY_IMPORTS, meta.entitySuperClass.package])
      .setJavaDoc(BASE_ENTITY_JAVADOC)

    const classDeclarationBuilder = ClassDeclarationBuilder.create(['public'], meta.entityName)
      .setSuperClass(meta.entitySuperClass.name)
      .addImplement('Persistable', [createTypeDeclaration(primaryKey.fieldType)])
      .addAnnotation('Entity')
      .addAnnotation('Getter')
      .addAnnotation('Setter')
      .addAnnotation('Table', { name: meta.tablename })

    classDeclarationBuilder.addField(createSerialVersionUID())

    meta.columns.forEach((column) => {
      const fieldDeclarationBuilder = FieldDeclarationBuilder.create(['private'], column.fieldName, createTypeDeclaration(column.fieldType))

      if (isJsonType(column.columnType)) {
        fieldDeclarationBuilder.addAnnotation('Type', { value: createTypeDeclaration('StringJsonUserType') })
      }
      if (column.isPrimaryKey) {
        fieldDeclarationBuilder.addAnnotation('Id')
        if (column.fieldType === 'Long') {
          fieldDeclarationBuilder.addAnnotation('SnowflakeGenerator')
          javaAstBuilder.addImport(SNOWFLAKE_IMPORT)
        }
      }
      fieldDeclarationBuilder.addAnnotation('Column', { ...column.columnDef })

      classDeclarationBuilder.addField(fieldDeclarationBuilder.build())

      if (column.imports) {
        const imports = Array.isArray(column.imports) ? column.imports : [column.imports]
        imports.forEach(importPath => javaAstBuilder.addImport(importPath))
      }
    })

    classDeclarationBuilder.addField(createIsNew())
    classDeclarationBuilder.addMethod(this.createGetIdMethod(primaryKey.fieldName, primaryKey.fieldType))
    classDeclarationBuilder.addMethod(createIsNewMethod())
    classDeclarationBuilder.addMethod(createMarkAsNotNewMethod())

    javaAstBuilder.setClassDeclaration(classDeclarationBuilder.build())

    return javaAstBuilder.build()
  }

  private createGetIdMethod(keyName: string, keyType: string): MethodDeclaration {
    return MethodDeclarationBuilder.create(['public'], 'getId', createTypeDeclaration(keyType))
      .addAnnotation('Override')
      .addExpressions([createExpression(`return ${keyName};`)])
      .build()
  }

  private transformToRepositoryAST(): JavaAST {
    const meta = this.adapter.getEntityMeta()

    const primaryKeys = meta.columns.filter(key => key.isPrimaryKey && !key.isPartitionKey)
    if (primaryKeys.length === 0) {
      throw new Error(`No primary key found for entity ${meta.entityName}`)
    }
    const primaryKey = primaryKeys[0]

    const javaAstBuilder = JavaAstBuilder.create()
      .setPackageDeclaration(meta.entityRepositoryPackage)
      .addImports([
        `${meta.entityPackage}.${meta.entityName}`,
        ...BASE_ENTITY_REPOSITORY_IMPORTS,
        meta.repositorySuperClass.package,
      ])
      .setJavaDoc(BASE_ENTITY_JAVADOC)

    const interfaceDeclaration = InterfaceDeclarationBuilder.create(['public'], `${meta.entityName}Repository`)
      .addAnnotation('Repository')
      .addExtend(meta.repositorySuperClass.name, [createTypeDeclaration(meta.entityName), createTypeDeclaration(primaryKey.fieldType)])
      .build()

    javaAstBuilder.setInterfaceDeclaration(interfaceDeclaration)

    return javaAstBuilder.build()
  }

  private transformToVOAST(): JavaAST {
    const meta = this.adapter.getEntityMeta()

    const primaryKeys = meta.columns.filter(key => key.isPrimaryKey && !key.isPartitionKey)
    if (primaryKeys.length === 0) {
      throw new Error(`No primary key found for entity ${meta.entityName}`)
    }
    const primaryKey = primaryKeys[0]

    const javaAstBuilder = JavaAstBuilder.create()
      .setPackageDeclaration(meta.entityVOPackage)
      .addImports([...BASE_ENTITY_VO_IMPORTS, meta.entityVOSuperClass.package])
      .setJavaDoc(BASE_ENTITY_JAVADOC)

    const entityVOName = `${meta.entityName}VO`

    const classDeclarationBuilder = ClassDeclarationBuilder.create(['public'], entityVOName)
      .setSuperClass(meta.entityVOSuperClass.name)
      .addAnnotation('Data')
      .addAnnotation('Builder')
      .addAnnotation('AllArgsConstructor')
      .addAnnotation('NoArgsConstructor')
      .addAnnotation('EqualsAndHashCode', { callSuper: true })
      .addField(createSerialVersionUID())

    meta.columns.forEach((column) => {
      const fieldDeclarationBuilder = FieldDeclarationBuilder.create(['private'], column.fieldName, createTypeDeclaration(column.fieldType))
      if (column.defaultValue) {
        fieldDeclarationBuilder.setValue(createExpression(column.defaultValue))
        fieldDeclarationBuilder.addAnnotation('Builder.Default')
      }
      classDeclarationBuilder.addField(fieldDeclarationBuilder.build())

      if (column.defaultVOImport) {
        javaAstBuilder.addImport(column.defaultVOImport)
      }
    })

    if (primaryKey.fieldType === 'Long') {
      classDeclarationBuilder.addMethod(createBuilderWithId(entityVOName, primaryKey.fieldName, true))
    }
    else if (primaryKey.fieldType === 'String') {
      classDeclarationBuilder.addMethod(createBuilderWithId(entityVOName, primaryKey.fieldName, false))
    }

    javaAstBuilder.setClassDeclaration(classDeclarationBuilder.build())

    return javaAstBuilder.build()
  }
}

// common utility functions for creating fields and methods
function createSerialVersionUID(): FieldDeclaration {
  return FieldDeclarationBuilder.create(['private', 'static', 'final'], 'serialVersionUID', createTypeDeclaration('long'))
    .setValue(createExpression('1L'))
    .build()
}

function createIsNew(): FieldDeclaration {
  return FieldDeclarationBuilder.create(['private'], 'isNew', createTypeDeclaration('boolean'))
    .addAnnotation('Transient')
    .setValue(createExpression('true'))
    .build()
}

function createIsNewMethod(): MethodDeclaration {
  return MethodDeclarationBuilder.create(['public'], 'isNew', createTypeDeclaration('boolean'))
    .addAnnotation('Override')
    .addExpressions([createExpression(`return isNew;`)])
    .build()
}

function createMarkAsNotNewMethod(): MethodDeclaration {
  return MethodDeclarationBuilder.create(['public'], 'markAsNotNew', createTypeDeclaration('void'))
    .addAnnotation('PostPersist')
    .addAnnotation('PostLoad')
    .addExpressions([createExpression(`this.isNew = false;`)])
    .build()
}

function createBuilderWithDefault(keyName: string, primaryKey: string, isLong: boolean): MethodDeclaration {
  return MethodDeclarationBuilder.create(['public', 'static'], 'builderWithDefault', createTypeDeclaration(`${keyName}Builder`))
    .addExpressions([
      createExpression(`return ${keyName}.builder()`),
      createExpression(`    .${primaryKey}(IdUtils.getSnowflakeIdWorker().${isLong ? 'nextId' : 'nextIdStr'}())`),
      createExpression(`    .dealerPartition(UserDetailsUtil.getDealerPartition());`),
    ])
    .build()
}

function createBuilderWithId(keyName: string, primaryKey: string, isLong: boolean): MethodDeclaration {
  return MethodDeclarationBuilder.create(['public', 'static'], 'builderWithId', createTypeDeclaration(`${keyName}Builder`))
    .addExpressions([createExpression(`return ${keyName}.builder().${primaryKey}(IdUtils.getSnowflakeIdWorker().${isLong ? 'nextId' : 'nextIdStr'}());`)])
    .build()
}

function isJsonType(columnType: string): boolean {
  return columnType === 'jsonb' || columnType === 'json'
}
