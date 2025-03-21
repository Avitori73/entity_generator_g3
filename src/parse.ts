import type { BasicDataTypeDef, CreateTableStatement, DataTypeDef, TableConstraint, TableConstraintUnique } from 'pgsql-ast-parser'
import type { ColumnDefinition, CreateTable } from './type'
import { astVisitor, parseFirst } from 'pgsql-ast-parser'
import { getConfig } from './config'

export async function parseTable(ddl: string): Promise<CreateTableStatement> {
  const adapterDdl = partitionTableAdapter(ddl)
  return tryParseFirst(adapterDdl)
}

export function partitionTableAdapter(ddl: string): string {
  // if ddl is partitioned table, the ddl will not be parsed correctly by 'pgsql-ast-parser'
  // so we need to remove the partition part and return the table ddl
  const partitionIndex = ddl.indexOf('PARTITION BY')
  if (partitionIndex === -1) {
    return ddl
  }
  return ddl.substring(0, partitionIndex)
}

/**
 * Extracts the table definition from a DDL statement
 * @param ddl Create table statement.
 * @param omitCols Columns to omit from the table definition, useful for excluding columns that are in BaseEntity.
 * @returns
 */
export async function extractTable(ddl: string): Promise<CreateTable> {
  const config = await getConfig()
  const omitCols = config.omitColumns
  const ast = tryParseFirst(ddl)

  const table: CreateTable = {
    name: '',
    definitions: [],
    primaryKeys: [],
  }

  table.name = ast.name.name
  table.definitions = extractColumn(ast)
  table.primaryKeys = extractPrimaryKeys(ast)

  omitColumns(table, omitCols)

  return table
}

/**
 * Parses the first statement of the DDL. Throws an error if the statement is not a create table statement or if the DDL is invalid.
 * @param ddl
 * @returns
 */
function tryParseFirst(ddl: string): CreateTableStatement {
  const ast = parseFirst(ddl)
  if (ast.type !== 'create table') {
    throw new Error('DDL is not a create table statement')
  }
  return ast
}

/**
 * Extracts the primary keys by traversing the AST.
 * @param ast
 * @returns
 */
function extractPrimaryKeys(ast: CreateTableStatement): string[] {
  const primaryKeys: string[] = []
  astVisitor(() => ({
    createTable: (t) => {
      const pk = t.constraints?.find(constraint => constraint.type === 'primary key')
      const columns = pk ? isTableConstraintUnique(pk) ? pk.columns : [] : []
      primaryKeys.push(...columns.map(col => col.name))
    },
  })).statement(ast)
  return primaryKeys
}

/**
 * Extracts the column definitions by traversing the AST.
 * @param ast
 * @returns
 */
function extractColumn(ast: CreateTableStatement): ColumnDefinition[] {
  const definitions: ColumnDefinition[] = []
  astVisitor(() => ({
    createColumn: (col) => {
      if (!isDataTypeDef(col.dataType)) {
        return
      }

      definitions.push({
        name: col.name.name,
        datatype: col.dataType.name,
        length: col.dataType.name === 'varchar' ? col.dataType.config![0] : undefined,
        precision: col.dataType.name === 'numeric' ? col.dataType.config![0] : undefined,
        scale: col.dataType.name === 'numeric' ? col.dataType.config![1] : undefined,
        nullable: col.constraints?.some(constraint => constraint.type === 'null') || false,
      })
    },
  })).statement(ast)
  return definitions
}

/**
 * Omit columns from the table definition.
 * @param table
 * @param omitColumns
 * @returns
 */
function omitColumns(table: CreateTable, omitColumns: string[]): void {
  if (omitColumns.length === 0)
    return

  table.definitions = table.definitions.filter(col => !omitColumns.includes(col.name))
  table.primaryKeys = table.primaryKeys.filter(pk => !omitColumns.includes(pk))
}

/**
 * Checks if the data type is a basic data type.
 * @param dataType
 * @returns
 */
function isDataTypeDef(dataType: DataTypeDef): dataType is BasicDataTypeDef {
  return dataType.kind !== 'array'
}

/**
 * Checks if the table constraint is primary key.
 * @param constraint
 * @returns
 */
function isTableConstraintUnique(constraint: TableConstraint): constraint is TableConstraintUnique {
  return constraint.type === 'primary key'
}
