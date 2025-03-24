import type { CreateTableStatement } from 'pgsql-ast-parser'
import { parseFirst } from 'pgsql-ast-parser'

export interface ParseResult {
  ast: CreateTableStatement
  isPartition: boolean
}

export async function parseTable(ddl: string): Promise<ParseResult> {
  const adapterDdl = partitionTableAdapter(ddl)
  return { ast: tryParseFirst(adapterDdl.ddl), isPartition: adapterDdl.isPartition }
}

export function partitionTableAdapter(ddl: string): { ddl: string, isPartition: boolean } {
  // if ddl is partitioned table, the ddl will not be parsed correctly by 'pgsql-ast-parser'
  // so we need to remove the partition part and return the table ddl
  const partitionIndex = ddl.indexOf('PARTITION BY')
  if (partitionIndex === -1) {
    return { ddl, isPartition: false }
  }
  return { ddl: ddl.substring(0, partitionIndex), isPartition: true }
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
