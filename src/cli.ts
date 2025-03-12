import type { CreateTable } from './type'
import fs from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { cancel, intro, isCancel, log, outro, spinner, tasks, text } from '@clack/prompts'
import c from 'ansis'
import { rimrafSync } from 'rimraf'
import { generateJavaCode } from './codeGen'
import { formatJavaCode } from './format'
import { extractTable } from './parse'
import { transformCreateTableToJavaEntityClass, transformCreateTableToJavaRepositoryInterface } from './transform'

const paths = {
  outputPath: './output',
  entityPath: join('./output', '/entity'),
  repositoryPath: join('./output', '/repository'),
}

export async function runCli(): Promise<void> {
  console.log('\n')
  intro(c.cyan(`Entity Generator For G3 Start`))

  const filename = await promptFilename()

  const statements = await detectCreateTableStatements(filename)

  await createOutput()

  const total = statements.length
  let index = 0
  let errorCount = 0
  let successCount = 0
  for (const table of statements) {
    index++
    const indexStr = `(${c.green(index)}/${c.blue(total)}) `
    const ast = await parseTable(indexStr, table)
    if (ast === null) {
      log.warn(c.yellow(`Skipping to next table... \n`))
      errorCount++
      continue
    }

    const isSuccess = await processTable(indexStr, ast)
    if (isSuccess) {
      successCount++
    }
    else {
      log.warn(c.yellow(`Skipping to next table... \n`))
      errorCount++
    }
  }

  outro(`${c.cyan('Entity generate finished:')} ${c.green(successCount)} tables generated, ${c.red(errorCount)} tables failed.`)
}

async function createOutput(): Promise<void> {
  await tasks([
    {
      title: `Creating output directory.`,
      task: async () => {
        rimrafSync(paths.outputPath)
        fs.mkdirSync(paths.entityPath, { recursive: true })
        fs.mkdirSync(paths.repositoryPath, { recursive: true })
        return 'Created output directory.'
      },
    },
  ])
}

async function promptFilename(): Promise<string> {
  const filename = String(await text({
    message: 'What is the filename that contains the create table statements?',
    placeholder: 'create.sql',
    initialValue: 'create.sql',
    validate(value) {
      if (!fs.existsSync(value)) {
        return 'File not found!'
      }
    },
  }))

  if (isCancel(filename)) {
    cancel('Operation cancelled.')
    process.exit(0)
  }

  return filename
}

async function detectCreateTableStatements(filename: string): Promise<string[]> {
  let statements: string[] = []

  await tasks([
    {
      title: `Detecting create table statements in the file ${filename}.`,
      task: async () => {
        const createTables = fs.readFileSync(filename, 'utf-8')
        statements = Array.from(createTables.match(/create table.*?;/gis) ?? [])
        return `Detected ${c.blue(statements.length)} create table statements.`
      },
    },
  ])

  if (statements.length === 0) {
    log.error('No create table statements found in the file.')
    process.exit(1)
  }

  return statements
}

async function parseTable(indexStr: string, table: string): Promise<CreateTable | null> {
  const s = spinner()
  try {
    s.start(`${indexStr}Parsing table...`)
    const astTable = await extractTable(table)
    s.stop(`${indexStr}Parsed table!`)
    return astTable
  }
  catch (error) {
    s.stop(c.red(`${indexStr}Error parse table:`))
    log.error(c.red(`${table} \n\n ${error instanceof Error ? error.message : error}`))
    return null
  }
}

async function processTable(indexStr: string, parseTable: CreateTable): Promise<boolean> {
  const s = spinner()
  try {
    s.start(`${indexStr}Generating table ${c.yellow(parseTable.name)}...`)
    const [javaEntityClass, javaRepositoryInterface] = await Promise.all([
      transformCreateTableToJavaEntityClass(parseTable),
      transformCreateTableToJavaRepositoryInterface(parseTable),
    ])
    const [javaEntityFile, javaRepositoryFile] = await Promise.all([
      generateJavaCode(javaEntityClass),
      generateJavaCode(javaRepositoryInterface),
    ])
    const [formattedEntityFile, formattedRepositoryFile] = await Promise.all([
      formatJavaCode(javaEntityFile.join('\n')),
      formatJavaCode(javaRepositoryFile.join('\n')),
    ])
    const entityFile = resolve(paths.entityPath, `${javaEntityClass.name}.java`)
    const repositoryFile = resolve(paths.repositoryPath, `${javaRepositoryInterface.name}.java`)
    fs.writeFileSync(entityFile, formattedEntityFile)
    fs.writeFileSync(repositoryFile, formattedRepositoryFile)
    s.stop(`${indexStr}Generated table ${c.yellow(parseTable.name)}.`)
    return true
  }
  catch (e) {
    s.stop(c.red(`${indexStr}Error generating table:`))
    log.error(c.red(`${e instanceof Error ? e.message : e}`))
    return false
  }
}
