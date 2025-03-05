import type { CreateTable } from '../parse'
/* eslint-disable no-console */
import fs from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import c from 'ansis'
import { rimrafSync } from 'rimraf'
import { formatJavaCode } from '../format'
import { extractTable } from '../parse'
import { transformCreateTableToJavaEntityClass, transformCreateTableToJavaRepositoryInterface, writeJavaFile } from '../transform'

const outputPath = './output'
const entityPath = join(outputPath, '/entity')
const repositoryPath = join(outputPath, '/repository')

// clear output directory
rimrafSync(outputPath)

// create output directory
fs.mkdirSync(entityPath, { recursive: true })
fs.mkdirSync(repositoryPath, { recursive: true })

// read local file 'create.sql', if not exists, throw error
if (!fs.existsSync('create.sql')) {
  console.log(c.red('\u2717 `create.sql` not found in current directory, please create it first!'))
  process.exit(1)
}

// read content from 'create.sql'
const ddls = fs.readFileSync('create.sql', 'utf-8')
// extract create table statement from ddls
const createTable = ddls.match(/create table.*?;/gis)
console.log(c.green(`\u2713 Found ${createTable?.length} create table statement:`))

async function runCli(): Promise<void> {
  let index = 0
  for (const table of createTable ?? []) {
    console.log(c.blue(`\u25B6 Processing table ${++index}...`))
    console.log(c.yellow(`\u25B6 1. Parsing table...`))

    let parseTable: CreateTable
    try {
      parseTable = extractTable(table)
      console.log(c.green(`\u2713 Table parsed successfully!`))
    }
    catch (error) {
      console.log(c.red(`\u2717 Error parsing table: \n ${table} \n ${error instanceof Error ? error.message : error}`))
      console.log(c.red(`\u2717 Skipping to next table... \n`))
      continue
    }

    console.log(c.yellow(`\u25B6 2. Transforming to Java Entity And Repository...`))

    try {
      const [javaEntityClass, javaRepositoryInterface] = await Promise.all([
        transformCreateTableToJavaEntityClass(parseTable),
        transformCreateTableToJavaRepositoryInterface(parseTable),
      ])
      const [javaEntityFile, javaRepositoryFile] = await Promise.all([
        writeJavaFile(javaEntityClass),
        writeJavaFile(javaRepositoryInterface),
      ])
      console.log(c.green(`\u2713 Transformed to Java Entity And Repository successfully!`))

      console.log(c.yellow(`\u25B6 3. Formatting Java Code...`))
      const [formattedEntityFile, formattedRepositoryFile] = await Promise.all([
        formatJavaCode(javaEntityFile.join('\n')),
        formatJavaCode(javaRepositoryFile.join('\n')),
      ])
      console.log(c.green(`\u2713 Java Code formatted successfully!`))

      console.log(c.yellow(`\u25B6 4. Writing Entity and Repository to file...`))
      const entityFile = resolve(entityPath, `${javaEntityClass.name}.java`)
      const repositoryFile = resolve(repositoryPath, `${javaRepositoryInterface.name}.java`)
      fs.writeFileSync(entityFile, formattedEntityFile)
      fs.writeFileSync(repositoryFile, formattedRepositoryFile)
      console.log(c.green(`\u2713 Entity and Repository written successfully!`))

      console.log(c.green(`\u2713 Done \n`))
    }
    catch (error) {
      console.log(c.red(`\u2717 Error transforming to Java Entity And Repository: \n ${error instanceof Error ? error.message : error}`))
      console.log(c.red(`\u2717 Skipping to next table... \n`))
    }
  }
  console.log(c.green(`\u2713 All tables processed successfully!`))
}

runCli()
