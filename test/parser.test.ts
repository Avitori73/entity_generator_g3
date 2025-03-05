import { describe, expect, it } from 'vitest'
import { extractTable } from '../src'

describe('test extractTable', () => {
  it('should return table.definitions without [site_id_]', () => {
    const pgsqlDDL = `
      CREATE TABLE users (
        user_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
        site_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
        user_name_ varchar(40) DEFAULT ' '::character varying NOT NULL,
        age_ integer DEFAULT 0 NOT NULL,
        balance_ NUMERIC(16,2) NULL,
        remark_ text NULL,
        created_at_ timestamp DEFAULT now() NOT NULL,
        CONSTRAINT users_pk PRIMARY KEY (user_id_)
      );
    `
    const createTable = extractTable(pgsqlDDL, ['site_id_'])
    expect(createTable).toEqual({
      name: 'users',
      definitions: [
        { name: 'user_id_', datatype: 'varchar', nullable: false, length: 40 },
        { name: 'user_name_', datatype: 'varchar', nullable: false, length: 40 },
        { name: 'age_', datatype: 'integer', nullable: false },
        { name: 'balance_', datatype: 'numeric', nullable: true, precision: 16, scale: 2 },
        { name: 'remark_', datatype: 'text', nullable: true },
        { name: 'created_at_', datatype: 'timestamp', nullable: false },
      ],
      primaryKeys: ['user_id_'],
    })
  })

  it('should throw an Error', () => {
    const notCreateTableSql = `
      create index users_user_id_index on users (user_id_);
    `
    expect(() => extractTable(notCreateTableSql, [])).toThrowError('DDL is not a create table statement')
  })

  it('should throw a Syntax Error', () => {
    const syntaxErrorDDL = `
      CREATE TABLE users (
        user_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
        site_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
        user_name_ varchar(40) DEFAULT ' '::character varying NOT NULL,
        age_ integer DEFAULT 0 NOT NULL,
        balance_ numeric(16,2) NULL,
        remark_ text NULL,
        created_at_ timestamp DEFAULT now() NOT NULL,
        CONSTRAINT users_pk PRIMARY KEY (user_id_)
    `
    expect(() => extractTable(syntaxErrorDDL, [])).toThrowError()
  })
})
