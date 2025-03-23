import { writeFileSync } from 'node:fs'
import { describe, it } from 'vitest'
import { formatJavaCode, generateJavaCode } from '../src'
import { SimpleJpaTransformer } from '../src/java-ast-tranform'
import { parseTable } from '../src/parse'

describe('should', () => {
  it('exported', async () => {
    const pgsqlDDL = `
      CREATE TABLE oil_manifest_pod (
        oil_manifest_pod_id_ int8 NOT NULL,
        site_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
        dealer_partition_ varchar(20) NOT NULL,
        order_product_no_ varchar(20) NULL,
        receipt_qty_ numeric(18, 2) DEFAULT 0 NULL,
        order_no_ varchar(20) NULL,
        supplier_slip_no_ varchar(40) DEFAULT ' '::character varying NULL,
        shipment_no_ varchar(40) DEFAULT ' '::character varying NULL,
        status_ varchar(40) NULL,
        receipt_price_ numeric(18, 2) DEFAULT 0 NULL,
        delivery_date_ varchar(8) DEFAULT '0' NULL,
        update_author_ varchar(40) DEFAULT ' '::character varying NOT NULL,
        update_date_ timestamptz NOT NULL,
        create_author_ varchar(40) DEFAULT ' '::character varying NOT NULL,
        create_date_ timestamptz NOT NULL,
        update_program_ varchar(20) DEFAULT ' '::character varying NOT NULL,
        update_counter_ int4 DEFAULT 0 NOT NULL,
        CONSTRAINT pk_oil_manifest_pod PRIMARY KEY (oil_manifest_pod_id_, dealer_partition_)
      )
      PARTITION BY LIST (dealer_partition_);
    `
    const CreateTableStatement = await parseTable(pgsqlDDL)
    const simpleJpaTransformer = new SimpleJpaTransformer()
    const javaAst = await simpleJpaTransformer.transform(CreateTableStatement)
    const entityCode = generateJavaCode(javaAst.entity)
    const repositoryCode = generateJavaCode(javaAst.repository)
    writeFileSync('./test/entity.java', await formatJavaCode(entityCode.join('\n')))
    writeFileSync('./test/repository.java', await formatJavaCode(repositoryCode.join('\n')))
  })
})
