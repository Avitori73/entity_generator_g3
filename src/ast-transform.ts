import type { JavaAstAdapter } from './ast-adapter'
import type { ConstructorDeclaration, EntityFieldMeta, FieldDeclaration, JavaAST, MethodDeclaration } from './type'

import { ClassDeclarationBuilder, ConstructorDeclarationBuilder, createExpression, createTypeDeclaration, FieldDeclarationBuilder, InterfaceDeclarationBuilder, JavaAstBuilder, MethodDeclarationBuilder } from './ast-builder'

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
  'com.ymsl.solid.jpa.repository.JpaExtensionRepository',
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
  entityKey: JavaAST
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
    const entityKeyAST = this.transformToEntityKeyAST()
    const repositoryAST = this.transformToRepositoryAST()
    const voAST = this.transformToVOAST()
    return {
      entity: entityAST,
      entityKey: entityKeyAST,
      repository: repositoryAST,
      vo: voAST,
    }
  }

  private transformToEntityAST(): JavaAST {
    const meta = this.adapter.getEntityMeta()

    const javaAstBuilder = JavaAstBuilder.create()
      .setPackageDeclaration(meta.entityPackage)
      .addImports([...BASE_ENTITY_IMPORTS, 'jakarta.persistence.IdClass', meta.entitySuperClass.package])
      .setJavaDoc(BASE_ENTITY_JAVADOC)

    const classDeclarationBuilder = ClassDeclarationBuilder.create(['public'], meta.entityName)
      .setSuperClass(meta.entitySuperClass.name)
      .addImplement('Persistable', [createTypeDeclaration(meta.entityKeyName)])
      .addAnnotation('Entity')
      .addAnnotation('Getter')
      .addAnnotation('Setter')
      .addAnnotation('IdClass', { value: createTypeDeclaration(meta.entityKeyName) })
      .addAnnotation('Table', { name: meta.tablename })

    classDeclarationBuilder.addField(createSerialVersionUID())

    meta.columns.forEach((column) => {
      const fieldDeclarationBuilder = FieldDeclarationBuilder.create(['private'], column.fieldName, createTypeDeclaration(column.fieldType))

      if (isJsonType(column.columnType)) {
        fieldDeclarationBuilder.addAnnotation('Type', { value: createTypeDeclaration('StringJsonUserType') })
      }
      if (column.isPrimaryKey) {
        fieldDeclarationBuilder.addAnnotation('Id')
      }
      fieldDeclarationBuilder.addAnnotation('Column', { ...column.columnDef })

      classDeclarationBuilder.addField(fieldDeclarationBuilder.build())

      if (column.imports) {
        const imports = Array.isArray(column.imports) ? column.imports : [column.imports]
        imports.forEach(importPath => javaAstBuilder.addImport(importPath))
      }
    })

    classDeclarationBuilder.addField(createIsNew())
    classDeclarationBuilder.addMethod(this.createGetIdMethod(meta.entityKeyName, meta.primaryKeys))
    classDeclarationBuilder.addMethod(createIsNewMethod())
    classDeclarationBuilder.addMethod(createMarkAsNotNewMethod())

    javaAstBuilder.setClassDeclaration(classDeclarationBuilder.build())

    return javaAstBuilder.build()
  }

  private createGetIdMethod(keyName: string, primaryKeys: string[]): MethodDeclaration {
    return MethodDeclarationBuilder.create(['public'], 'getId', createTypeDeclaration(keyName))
      .addAnnotation('Override')
      .addExpressions([createExpression(`return new ${keyName}(${primaryKeys.join(', ')});`)])
      .build()
  }

  private transformToEntityKeyAST(): JavaAST {
    const meta = this.adapter.getEntityMeta()

    const javaAstBuilder = JavaAstBuilder.create()
      .setPackageDeclaration(meta.entityPackage)
      .addImports(BASE_ENTITY_KEY_IMPORTS)
      .setJavaDoc(BASE_ENTITY_JAVADOC)

    const classDeclarationBuilder = ClassDeclarationBuilder.create(['public'], meta.entityKeyName)
      .addImplement('Serializable')
      .addAnnotation('Data')
      .addAnnotation('NoArgsConstructor')
      .addAnnotation('AllArgsConstructor')

    classDeclarationBuilder.addField(createSerialVersionUID())
    const primaryKeysFields = meta.columns.filter(column => column.isPrimaryKey)
    primaryKeysFields.forEach((column) => {
      const fieldDeclarationBuilder = FieldDeclarationBuilder.create(['private'], column.fieldName, createTypeDeclaration(column.fieldType))
      classDeclarationBuilder.addField(fieldDeclarationBuilder.build())
    })

    classDeclarationBuilder.addConstructor(this.createEntityKeyConstructor(meta.entityKeyName, primaryKeysFields))
    classDeclarationBuilder.addMethod(this.createOfFactoryMethod(meta.entityKeyName, primaryKeysFields))
    classDeclarationBuilder.addMethod(this.createOfFactoryMethod(meta.entityKeyName, primaryKeysFields, false))

    javaAstBuilder.setClassDeclaration(classDeclarationBuilder.build())

    return javaAstBuilder.build()
  }

  private createEntityKeyConstructor(keyName: string, primaryKeys: Array<EntityFieldMeta>): ConstructorDeclaration {
    const constructorDeclarationBuilder = ConstructorDeclarationBuilder.create(['public'], keyName)
    for (const key of primaryKeys) {
      if (!key.isPartitionKey) {
        constructorDeclarationBuilder.addParameter(key.fieldName, createTypeDeclaration(key.fieldType))
        constructorDeclarationBuilder.addExpression(createExpression(`this.${key.fieldName} = ${key.fieldName};`))
      }
    }
    constructorDeclarationBuilder.addExpression(createExpression('this.dealerPartition = UserDetailsUtil.getDealerPartition();'))
    return constructorDeclarationBuilder.build()
  }

  private createOfFactoryMethod(keyName: string, primaryKeys: Array<EntityFieldMeta>, isExcludePartition: boolean = true): MethodDeclaration {
    let primaryFields
    if (isExcludePartition)
      primaryFields = primaryKeys.filter(key => !key.isPartitionKey)
    else
      primaryFields = primaryKeys

    const methodDeclarationBuilder = MethodDeclarationBuilder.create(['public', 'static'], 'of', createTypeDeclaration(keyName))
    for (const key of primaryFields) {
      methodDeclarationBuilder.addParameter(key.fieldName, createTypeDeclaration(key.fieldType))
    }
    methodDeclarationBuilder.addExpressions([createExpression(`return new ${keyName}(${primaryFields.map(v => v.fieldName).join(', ')});`)])

    return methodDeclarationBuilder.build()
  }

  private transformToRepositoryAST(): JavaAST {
    const meta = this.adapter.getEntityMeta()
    const javaAstBuilder = JavaAstBuilder.create()
      .setPackageDeclaration(meta.entityRepositoryPackage)
      .addImports([
        `${meta.entityPackage}.${meta.entityName}`,
        `${meta.entityPackage}.${meta.entityKeyName}`,
        ...BASE_ENTITY_REPOSITORY_IMPORTS,
      ])
      .setJavaDoc(BASE_ENTITY_JAVADOC)

    const interfaceDeclaration = InterfaceDeclarationBuilder.create(['public'], `${meta.entityName}Repository`)
      .addAnnotation('Repository')
      .addExtend('JpaExtensionRepository', [createTypeDeclaration(meta.entityName), createTypeDeclaration(meta.entityKeyName)])
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
      classDeclarationBuilder.addMethod(createBuilderWithId(entityVOName, primaryKey.fieldName))
      classDeclarationBuilder.addMethod(this.createBuilderWithDefault(entityVOName, primaryKey.fieldName))
    }

    javaAstBuilder.setClassDeclaration(classDeclarationBuilder.build())

    return javaAstBuilder.build()
  }

  private createBuilderWithDefault(keyName: string, primaryKey: string): MethodDeclaration {
    return MethodDeclarationBuilder.create(['public', 'static'], 'builderWithDefault', createTypeDeclaration(`${keyName}Builder`))
      .addExpressions([
        createExpression(`return ${keyName}.builder()`),
        createExpression(`    .${primaryKey}(IdUtils.getSnowflakeIdWorker().nextId())`),
        createExpression(`    .dealerPartition(UserDetailsUtil.getDealerPartition());`),
      ])
      .build()
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
      ])
      .setJavaDoc(BASE_ENTITY_JAVADOC)

    const interfaceDeclaration = InterfaceDeclarationBuilder.create(['public'], `${meta.entityName}Repository`)
      .addAnnotation('Repository')
      .addExtend('JpaExtensionRepository', [createTypeDeclaration(meta.entityName), createTypeDeclaration(primaryKey.fieldType)])
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
      classDeclarationBuilder.addMethod(createBuilderWithId(entityVOName, primaryKey.fieldName))
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

function createBuilderWithId(keyName: string, primaryKey: string): MethodDeclaration {
  return MethodDeclarationBuilder.create(['public', 'static'], 'builderWithId', createTypeDeclaration(`${keyName}Builder`))
    .addExpressions([createExpression(`return ${keyName}.builder().${primaryKey}(IdUtils.getSnowflakeIdWorker().nextId());`)])
    .build()
}

function isJsonType(columnType: string): boolean {
  return columnType === 'jsonb' || columnType === 'json'
}
