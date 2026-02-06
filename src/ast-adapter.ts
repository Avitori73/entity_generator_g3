import type { BasicDataTypeDef, CreateColumnDef, CreateTableStatement } from 'pgsql-ast-parser'
import type { ColumnAstMeta, Config, EntityFieldMeta, EntityMeta, TableAstMeta } from './type'
import { camelCase, pascalCase } from 'change-case'
import { astVisitor } from 'pgsql-ast-parser'

export const LENGTH_REQUIRED = ['character varying', 'varchar']
export const PRECISION_AND_SCALE_REQUIRED = ['numeric']

class TableAstMetaBuilder {
  private tableAstMeta: TableAstMeta = {
    tablename: '',
    primaryKeys: [] as Array<string>,
    columns: [] as Array<ColumnAstMeta>,
  }

  public static create(): TableAstMetaBuilder {
    return new TableAstMetaBuilder()
  }

  public tablename(name: string): void {
    this.tableAstMeta.tablename = name
  }

  public primaryKeys(columnName: Array<string>): void {
    this.tableAstMeta.primaryKeys.push(...columnName)
  }

  public column(column: ColumnAstMeta): void {
    this.tableAstMeta.columns.push(column)
  }

  public build(): TableAstMeta {
    return this.tableAstMeta
  }
}

class ColumnAstMetaBuilder {
  private columnAstMeta: ColumnAstMeta = {
    columnName: '',
    columnType: '',
    columnDef: {
      name: '',
      length: undefined,
      precision: undefined,
      scale: undefined,
      nullable: false,
      columnDefinition: undefined,
    },
    columnDefaultValue: undefined,
  }

  public static create(): ColumnAstMetaBuilder {
    return new ColumnAstMetaBuilder()
  }

  public columnName(name: string): ColumnAstMetaBuilder {
    this.columnAstMeta.columnName = name
    return this
  }

  public dataType(type: string): ColumnAstMetaBuilder {
    this.columnAstMeta.columnType = type
    return this
  }

  public columnDefName(name: string): ColumnAstMetaBuilder {
    this.columnAstMeta.columnDef.name = name
    return this
  }

  public columnDefNullable(nullable: boolean): ColumnAstMetaBuilder {
    this.columnAstMeta.columnDef.nullable = nullable
    return this
  }

  public columnDefLength(length: number): ColumnAstMetaBuilder {
    this.columnAstMeta.columnDef.length = length
    return this
  }

  public columnDefPrecision(precision: number): ColumnAstMetaBuilder {
    this.columnAstMeta.columnDef.precision = precision
    return this
  }

  public columnDefScale(scale: number): ColumnAstMetaBuilder {
    this.columnAstMeta.columnDef.scale = scale
    return this
  }

  public columnDefColumnDefinition(columnDefinition: string): ColumnAstMetaBuilder {
    this.columnAstMeta.columnDef.columnDefinition = columnDefinition
    return this
  }

  public columnDefaultValue(defaultValue: string): ColumnAstMetaBuilder {
    this.columnAstMeta.columnDefaultValue = defaultValue
    return this
  }

  public build(): ColumnAstMeta {
    return this.columnAstMeta
  }
}

export class JavaAstAdapter {
  private tableAstMeta: TableAstMeta
  private isPartitioned: boolean = false
  private config: Config
  private entityMeta: EntityMeta

  public constructor(ast: CreateTableStatement, config: Config) {
    this.config = config
    this.tableAstMeta = this.extraTableAstMeta(ast)
    this.isPartitioned = this.tableAstMeta.primaryKeys.includes(config.partitionKey)
    this.entityMeta = this.convertToEntityMeta(config)
  }

  private convertToEntityMeta(config: Config): EntityMeta {
    const entityPackage = this.isPartitioned ? config.partitionEntityPackage : config.entityPackage

    const entitySuperClass = this.isPartitioned
      ? config.partitionEntitySuperClazz
      : config.entitySuperClazz

    const entityRepositoryPackage = this.isPartitioned
      ? config.partitionRepositoryPackage
      : config.repositoryPackage

    const repositorySuperClass = config.repositorySuperClazz

    const entityVOPackage = this.isPartitioned
      ? config.partitionVoPackage
      : config.voPackage

    const entityVOSuperClass = this.isPartitioned
      ? config.partitionVoSuperClazz
      : config.voSuperClazz

    const entityName = pascalCase(this.tableAstMeta.tablename)

    const convertToEntityFieldMeta = (column: ColumnAstMeta): EntityFieldMeta => {
      return {
        isPrimaryKey: this.tableAstMeta.primaryKeys.includes(column.columnName),
        isPartitionKey: this.isPartitioned && column.columnName === config.partitionKey,
        fieldName: camelCase(column.columnName),
        fieldType: this.config.dataTypeMap[column.columnType] || 'String',
        imports: this.config.dataImportMap[column.columnType],
        defaultValue: this.config.defaultVOValueMap[column.columnType],
        defaultVOImport: this.config.defaultVOImportMap[column.columnType],
        ...column,
      }
    }

    const columns = this.tableAstMeta.columns
      .filter(column => !config.omitColumns.includes(column.columnName))
      .map(convertToEntityFieldMeta)

    const meta: EntityMeta = {
      tablename: this.tableAstMeta.tablename,
      primaryKeys: this.tableAstMeta.primaryKeys.map(pk => camelCase(pk)),
      entityPackage,
      entityRepositoryPackage,
      repositorySuperClass,
      entityVOPackage,
      entitySuperClass,
      entityVOSuperClass,
      entityName,
      columns,
    }
    return meta
  }

  private extraTableAstMeta(ast: CreateTableStatement): TableAstMeta {
    const tableAstMetaBuilder = TableAstMetaBuilder.create()

    // visit table
    astVisitor(() => ({
      createTable: (table: CreateTableStatement) => {
        tableAstMetaBuilder.tablename(table.name.name)

        table.constraints?.forEach((constraint) => {
          if (constraint.type === 'primary key') {
            tableAstMetaBuilder.primaryKeys(constraint.columns.map(col => col.name))
          }
        })
      },
    })).statement(ast)

    astVisitor(() => ({
      createColumn: (column: CreateColumnDef) => {
        const isBasicDataTypeDef = column.dataType.kind !== 'array'
        if (!isBasicDataTypeDef) {
          return
        }

        const dataType = column.dataType as BasicDataTypeDef
        const constraints = column.constraints || []

        const columnAstMetaBuilder = ColumnAstMetaBuilder.create()
          .columnName(column.name.name)
          .dataType((column.dataType as BasicDataTypeDef).name)
          .columnDefName(column.name.name)
          .columnDefNullable(constraints.some(c => c.type === 'null') ?? false)

        const defaultConstraint = constraints.find(c => c.type === 'default')
        if (defaultConstraint) {
          // TODO： handle more complex default expressions
        }

        if (LENGTH_REQUIRED.includes(dataType.name) && dataType.config?.[0]) {
          columnAstMetaBuilder.columnDefLength(dataType.config?.[0])
        }

        if (PRECISION_AND_SCALE_REQUIRED.includes(dataType.name) && dataType.config?.[0] && dataType.config?.[1]) {
          columnAstMetaBuilder.columnDefPrecision(dataType.config[0])
          columnAstMetaBuilder.columnDefScale(dataType.config[1])
        }

        if (dataType.name === 'jsonb' || dataType.name === 'json') {
          columnAstMetaBuilder.columnDefColumnDefinition(dataType.name)
        }

        tableAstMetaBuilder.column(columnAstMetaBuilder.build())
      },
    })).statement(ast)

    return tableAstMetaBuilder.build()
  }

  public getEntityMeta(): EntityMeta {
    return this.entityMeta
  }
}
