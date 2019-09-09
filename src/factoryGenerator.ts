import {
  parseSchema,
  ParsedType,
  TypeEnum,
  ParsedField
} from '@zcong/mongoose-schema-parser'
import { Project, SourceFile, IndentationText, QuoteKind } from 'ts-morph'
import * as mongoose from 'mongoose'
import * as camelcase from 'camelcase'

export interface FactoryGeneratorOptions {
  file?: SourceFile
  filename?: string
  useInterface?: boolean
  dtoFilePath: string
  customFields?: {
    [key: string]: {
      rawVal: string
      type: TypeEnum
    }
  }
}

export enum helperFlags {
  shouldAddObjectIdFunc
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

  generateFactoriesByParsedSchema(
    parsed: ParsedType,
    name: string,
    isSubSchema: boolean = false
  ) {
    const dtoName = camelcase(`${name}Dto`, { pascalCase: true })

    const funcName = camelcase(`${name}-Factory`)
    const func = this.file.addFunction({
      name: funcName,
      parameters: [
        {
          name: 'initial',
          type: `Partial<dto.${dtoName}>`,
          hasQuestionToken: true
        }
      ],
      returnType: `dto.${dtoName}`,
      isExported: !isSubSchema
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
    if (
      this.opts.customFields.hasOwnProperty(propKey) &&
      field.type.type === this.opts.customFields[propKey].type
    ) {
      return this.arrayWrap(this.opts.customFields[propKey].rawVal, isArray)
    }
    switch (field.type.type) {
      case TypeEnum.Boolean:
        return this.arrayWrap(this.booleanRandom, isArray)
      case TypeEnum.String:
        return this.arrayWrap(this.stringRandom, isArray)
      case TypeEnum.Number:
        return this.arrayWrap(this.numberRandom, isArray)
      case TypeEnum.Date:
        return this.arrayWrap(this.dateRandom, isArray)
      case TypeEnum.ObjectId:
        this.shouldAddFuncSet.add(helperFlags.shouldAddObjectIdFunc)
        return this.arrayWrap('mongoObjectId()', isArray)
      case TypeEnum.Schema:
        const subTypeName = camelcase(`${name}-${propKey}Sub`, {
          pascalCase: true
        })
        this.generateFactoriesByParsedSchema(field.schema, subTypeName, true)
        return this.arrayWrap(
          `${camelcase(`${subTypeName}-Factory`)}()`,
          isArray
        )
      default:
        return undefined
    }
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

  private afterGenerate() {
    if (
      this.shouldAddFuncSet.has(helperFlags.shouldAddObjectIdFunc) &&
      !this.isSettedFuncSet.has(helperFlags.shouldAddObjectIdFunc)
    ) {
      this.addObjectIdFunc()
      this.isSettedFuncSet.add(helperFlags.shouldAddObjectIdFunc)
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
