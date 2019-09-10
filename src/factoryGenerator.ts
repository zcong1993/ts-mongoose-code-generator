import { inspect } from 'util'
import {
  parseSchema,
  ParsedType,
  TypeEnum,
  ParsedField
} from '@zcong/mongoose-schema-parser'
import { Project, SourceFile, IndentationText, QuoteKind } from 'ts-morph'
import * as mongoose from 'mongoose'
import * as camelcase from 'camelcase'

export interface CustomField {
  type: TypeEnum
  value: any
  fieldName: string
}

export interface FactoryGeneratorOptions {
  file?: SourceFile
  filename?: string
  dtoFilePath: string
  customFields?: CustomField[]
}

export enum helperFlags {
  shouldAddObjectIdFunc,
  shouldAddEnumPickFunc
}

export class FactoryGenerator {
  private file: SourceFile
  private opts: Readonly<FactoryGeneratorOptions>

  // maybe can migrate to options
  private stringRandom: string = 'faker.lorem.word()'
  private numberRandom: string = 'faker.random.number()'
  private booleanRandom: string = 'faker.random.boolean()'
  private dateRandom: string = 'faker.date.recent()'

  private shouldAddFuncSet: Set<helperFlags> = new Set()
  private isSettedFuncSet: Set<helperFlags> = new Set()

  constructor(opts: FactoryGeneratorOptions) {
    if (opts.file) {
      this.file = opts.file
    } else {
      // init
      const project = new Project({
        manipulationSettings: {
          indentationText: IndentationText.TwoSpaces,
          quoteKind: QuoteKind.Single
        }
      })
      this.file = project.createSourceFile(
        opts.filename || 'tmp.ts',
        {},
        { overwrite: true }
      )
    }
    this.opts = opts

    this.init()
    this.initFileImports()
  }

  generateFactoriesBySchema(schema: mongoose.Schema, name: string) {
    const parsed = parseSchema(schema)
    this.generateFactoriesByParsedSchema(parsed, name)
    this.afterGenerate()
  }

  generateFactoriesByParsedSchema(parsed: ParsedType, name: string) {
    const dtoName = camelcase(`${name}Dto`, { pascalCase: true })

    const funcName = camelcase(`${name}-Factory`)
    const func = this.file.addFunction({
      name: funcName,
      parameters: [
        {
          name: 'initial',
          type: `Partial<dto.${dtoName}>`,
          initializer: '{}'
        }
      ],
      returnType: `dto.${dtoName}`,
      isExported: true
    })

    func.setBodyText(writer => {
      writer.writeLine(`const mock: dto.${dtoName} = {`)

      Object.keys(parsed).forEach(propKey => {
        const field = parsed[propKey]
        const fd = this.getFieldByType(field, propKey, name)
        if (fd) {
          writer.writeLine(`  ${propKey}: ${fd},`)
        }
      })

      writer.writeLine('}').writeLine('return { ...mock, ...initial }')
    })
  }

  getGeneratedCode() {
    return this.file.getFullText()
  }

  getFile() {
    return this.file
  }

  private getFieldByType(
    field: ParsedField,
    propKey: string,
    name: string
  ): string | undefined {
    const isArray = field.type.isArray
    // custom default field name
    if (this.opts.customFields && this.opts.customFields.length > 0) {
      const cfs = this.opts.customFields.filter(
        cf => cf.fieldName === propKey && cf.type === field.type.type
      )

      if (cfs.length > 0) {
        return this.arrayWrap(inspect(cfs[0].value), isArray)
      }
    }

    if (field.details && field.details.enum) {
      this.shouldAddFuncSet.add(helperFlags.shouldAddEnumPickFunc)
      return this.arrayWrap(
        `enumPick(${inspect(field.details.enum)})()`,
        isArray
      )
    }

    let factoryFunc: string

    switch (field.type.type) {
      case TypeEnum.Boolean:
        factoryFunc = this.booleanRandom
        break
      case TypeEnum.String: {
        factoryFunc = this.stringRandom
        break
      }
      case TypeEnum.Number: {
        factoryFunc = this.numberRandom
        break
      }
      case TypeEnum.Date:
        factoryFunc = this.dateRandom
        break
      case TypeEnum.ObjectId:
        this.shouldAddFuncSet.add(helperFlags.shouldAddObjectIdFunc)
        factoryFunc = 'mongoObjectId()'
        break
      case TypeEnum.Schema:
        const subTypeName = camelcase(`${name}-${propKey}Sub`, {
          pascalCase: true
        })
        this.generateFactoriesByParsedSchema(field.schema, subTypeName)
        factoryFunc = `${camelcase(`${subTypeName}-Factory`)}()`
        break
      default:
        return undefined
    }

    return this.arrayWrap(factoryFunc, isArray)
  }

  private arrayWrap(origin: string, isArray: boolean) {
    return isArray ? `[${origin}]` : origin
  }

  private addObjectIdFunc() {
    const func = this.file.addFunction({
      name: 'mongoObjectId',
      returnType: 'string'
    })

    func.setBodyText(writer => {
      writer
        .writeLine(
          'const timestamp = (new Date().getTime() / 1000 | 0).toString(16)'
        )
        .writeLine(
          `return timestamp + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, () => (Math.random() * 16 | 0).toString(16)).toLowerCase()`
        )
    })
  }

  private addEnumPickFunc() {
    const func = this.file.addFunction({
      name: 'enumPick'
    })

    func.addTypeParameter({
      name: 'T',
      default: 'any'
    })

    func.addParameter({
      name: 'arr',
      type: 'T[]'
    })

    func.setReturnType('() => T')

    func.setBodyText(writer => {
      writer
        .writeLine('function randomPick(): T {')
        .writeLine('  const randomI = Math.floor((Math.random() * arr.length))')
        .writeLine('  return arr[randomI]')
        .writeLine('}')
        .writeLine('return randomPick')
    })
  }

  private afterGenerate() {
    if (
      this.shouldAddFuncSet.has(helperFlags.shouldAddObjectIdFunc) &&
      !this.isSettedFuncSet.has(helperFlags.shouldAddObjectIdFunc)
    ) {
      this.addObjectIdFunc()
      this.isSettedFuncSet.add(helperFlags.shouldAddObjectIdFunc)
    }

    if (
      this.shouldAddFuncSet.has(helperFlags.shouldAddEnumPickFunc) &&
      !this.isSettedFuncSet.has(helperFlags.shouldAddEnumPickFunc)
    ) {
      this.addEnumPickFunc()
      this.isSettedFuncSet.add(helperFlags.shouldAddEnumPickFunc)
    }
  }

  private init() {
    this.file.removeText()
  }

  private initFileImports() {
    this.file.addImportDeclarations([
      {
        moduleSpecifier: 'faker',
        defaultImport: '* as faker'
      },
      {
        moduleSpecifier: this.opts.dtoFilePath,
        defaultImport: '* as dto'
      }
    ])
  }
}
