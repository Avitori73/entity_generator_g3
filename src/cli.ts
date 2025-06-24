import type { CreateTableStatement } from 'pgsql-ast-parser'
import type { ParseResult } from './pgsql-parse'
import type { JavaAST } from './type'
import fs from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { cancel, intro, isCancel, log, outro, spinner, tasks, text } from '@clack/prompts'
import c from 'ansis'
import minimist from 'minimist'
import { rimrafSync } from 'rimraf'
import { JavaAstAdapter } from './ast-adapter'
import { PartitionJpaTransformer, SimpleJpaTransformer } from './ast-transform'
import { getConfig } from './config'
import { generateJavaCode } from './java-code-gen'
import { formatJavaCode } from './java-format'
import { parseTable } from './pgsql-parse'

const paths = {
  outputPath: './output',
  timestampOutputPath: resolve('./output', new Date().toISOString().replace(/:/g, '-')),
}

const errorStack: Array<string> = []

export async function runJavaCli(): Promise<void> {
  console.log('\n')
  intro(c.cyan(`Entity Generator For G3 Start`))

  // 直接使用 -f 或 --file 参数来指定文件名
  let filename
  const args = minimist(process.argv.slice(2))
  if (args.f || args.file) {
    filename = args.f || args.file
    if (!fs.existsSync(filename)) {
      log.error(c.red(`File not found: ${filename}`))
      process.exit(1)
    }
  }
  else {
    filename = await promptFilename()
  }

  const statements = await detectCreateTableStatements(filename!)

  await createOutput()

  const total = statements.length
  let index = 0
  let errorCount = 0
  let successCount = 0
  for (const table of statements) {
    index++
    const indexStr = `(${c.green(index)}/${c.blue(total)}) `
    const parseResult = await parseTables(indexStr, table)
    if (parseResult === null) {
      log.warn(c.yellow(`Skipping to next table... \n`))
      errorCount++
      continue
    }

    const isSuccess = await processTable(indexStr, parseResult)
    if (isSuccess) {
      successCount++
    }
    else {
      log.warn(c.yellow(`Skipping to next table... \n`))
      errorCount++
    }
  }

  outro(`${c.cyan('Entity generate finished:')} ${c.green(successCount)} tables generated, ${c.red(errorCount)} tables failed.`)

  if (errorStack.length > 0) {
    console.log(c.red(`Error stack:`))
    errorStack.forEach(e => console.log(c.red(`- ${e}`)))
  }
}

async function createOutput(): Promise<void> {
  await tasks([
    {
      title: `Creating output directory.`,
      task: async () => {
        rimrafSync(paths.outputPath)
        fs.mkdirSync(paths.timestampOutputPath, { recursive: true })
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

async function detectCreateTableStatements(filename: string): Promise<Array<string>> {
  let statements: Array<string> = []

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

async function parseTables(indexStr: string, table: string): Promise<ParseResult | null> {
  const s = spinner()
  try {
    s.start(`${indexStr}Parsing table...`)
    const astTable = await parseTable(table)
    s.stop(`${indexStr}Parsed table!`)
    return astTable
  }
  catch (error) {
    s.stop(c.red(`${indexStr}Error parse table:`))
    log.error(c.red(`${table} \n\n ${error instanceof Error ? error.message : error}`))
    errorStack.push(`${table} - ${error instanceof Error ? error.message : error}`)
    return null
  }
}

async function processTable(indexStr: string, parseResult: ParseResult): Promise<boolean> {
  const s = spinner()
  try {
    const tableName = parseResult.ast.name.name
    s.start(`${indexStr}Generating table ${c.yellow(tableName)}...`)
    await generateEntity(parseResult)
    s.stop(`${indexStr}Generated table ${c.yellow(tableName)}.`)
    return true
  }
  catch (e) {
    s.stop(c.red(`${indexStr}Error generating table:`))
    log.error(c.red(`${e instanceof Error ? e.message : e}`))
    errorStack.push(`${e instanceof Error ? e.message : e}`)
    return false
  }
}

async function generateEntity(parseResult: ParseResult): Promise<void> {
  if (parseResult.isPartition) {
    return generatePartitionEntity(parseResult.ast)
  }
  else {
    return generateSimpleEntity(parseResult.ast)
  }
}

async function generateSimpleEntity(ast: CreateTableStatement): Promise<void> {
  const config = await getConfig()
  const javaAstAdapter = new JavaAstAdapter(ast, config)
  const simpleJpaTransformer = new SimpleJpaTransformer(javaAstAdapter)
  const javaAst = await simpleJpaTransformer.transform()
  const outputDir = paths.timestampOutputPath
  javaAstToFile(javaAst.entity, 'Entity', outputDir)
  javaAstToFile(javaAst.repository, 'Repository', outputDir)
  javaAstToFile(javaAst.vo, 'VO', outputDir)
}

async function generatePartitionEntity(ast: CreateTableStatement): Promise<void> {
  const config = await getConfig()
  const javaAstAdapter = new JavaAstAdapter(ast, config)
  const partitionJpaTransformer = new PartitionJpaTransformer(javaAstAdapter)
  const partitionJavaAst = await partitionJpaTransformer.transform()
  const outputDir = paths.timestampOutputPath
  javaAstToFile(partitionJavaAst.entity, 'Entity', outputDir)
  javaAstToFile(partitionJavaAst.entityKey, 'EntityKey', outputDir)
  javaAstToFile(partitionJavaAst.repository, 'Repository', outputDir)
  javaAstToFile(partitionJavaAst.vo, 'VO', outputDir)
}

function packageToPath(packageName: string): string {
  return packageName.replace(/\./g, '/')
}

async function javaAstToFile(javaAst: JavaAST, fileName: string, rootPath: string): Promise<void> {
  const packageSrc = javaAst.body.find(node => node.type === 'PackageDeclaration')?.id.name
  const className = javaAst.body.find(node => node.type === 'ClassDeclaration' || node.type === 'InterfaceDeclaration')?.id.name
  if (!packageSrc || !className) {
    throw new Error(`${fileName}' package or class name not found.`)
  }
  const packagePath = packageToPath(packageSrc)
  const filePath = resolve(rootPath, packagePath)
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath, { recursive: true })
  }
  const fileNameWithExtension = `${className}.java`
  const filePathWithFileName = resolve(filePath, fileNameWithExtension)
  const code = generateJavaCode(javaAst)
  try {
    const formattedCode = await formatJavaCode(code.join('\n'))
    fs.writeFileSync(filePathWithFileName, formattedCode)
  }
  // eslint-disable-next-line unused-imports/no-unused-vars
  catch (error) {
    const errMsg = `Error formatting java code in file '${fileNameWithExtension}'`
    log.error(c.red(errMsg))
    errorStack.push(errMsg)
  }
}
