import { Project, SourceFile, IndentationText, QuoteKind } from 'ts-morph'
import {
  ParsedType,
  TypeEnum,
  parseSchema,
} from '@zcong/mongoose-schema-parser'
import * as mongoose from 'mongoose'
import * as camelcase from 'camelcase'

export interface DtoGeneratorInitOptions {
  file?: SourceFile
  filename?: string
  useInterface?: boolean
}

export class DtoGenerator {
  private file: SourceFile
  private useInterface: boolean
  constructor(opts: DtoGeneratorInitOptions) {
    this.useInterface = opts.useInterface
    if (opts.file) {
      this.file = opts.file
    } else {
      // init
      const project = new Project({
        manipulationSettings: {
          indentationText: IndentationText.TwoSpaces,
          quoteKind: QuoteKind.Single,
        },
      })
      this.file = project.createSourceFile(
        opts.filename || 'tmp.ts',
        {},
        { overwrite: true }
      )
    }

    this.init()
  }

  generateDtoBySchema(schema: mongoose.Schema, name: string) {
    const parsed = parseSchema(schema)
    this.generateDtoByParsedSchema(parsed, name)
  }

  generateDtoByParsedSchema(parsed: ParsedType, name: string) {
    const declar = this.useInterface
      ? this.file.addInterface({
          name: camelcase(`${name}Dto`, { pascalCase: true }),
          isExported: true,
        })
      : this.file.addClass({
          name: camelcase(`${name}Dto`, { pascalCase: true }),
          isExported: true,
        })
    Object.keys(parsed).forEach((propKey) => {
      const field = parsed[propKey]

      let hasQuestionToken = false
      if (!field.details) {
        hasQuestionToken = true
      } else {
        hasQuestionToken = !field.details.required
      }

      const isArray = field.type.isArray

      switch (field.type.type) {
        case TypeEnum.Boolean:
        case TypeEnum.String:
        case TypeEnum.Number:
          declar.addProperty({
            hasQuestionToken,
            name: propKey,
            type: this.arrayWrap(field.type.type.toLocaleLowerCase(), isArray),
          })
          break
        case TypeEnum.Date:
          declar.addProperty({
            hasQuestionToken,
            name: propKey,
            type: this.arrayWrap('Date', isArray),
          })
          break
        case TypeEnum.ObjectId:
          declar.addProperty({
            hasQuestionToken,
            name: propKey,
            type: this.arrayWrap('string', isArray),
          })
          break
        case TypeEnum.Schema:
          const subTypeName = camelcase(`${name}-${propKey}Sub`, {
            pascalCase: true,
          })
          this.generateDtoByParsedSchema(field.schema, subTypeName)
          declar.addProperty({
            hasQuestionToken,
            name: propKey,
            type: this.arrayWrap(`${subTypeName}Dto`, isArray),
          })
          break
        default:
          break
      }
    })
  }

  getGeneratedCode() {
    return this.file.getFullText()
  }

  getFile() {
    return this.file
  }

  private init() {
    this.file.removeText()
  }

  private arrayWrap(origin: string, isArray: boolean): string {
    return isArray ? `${origin}[]` : origin
  }
}
