import { Project, SourceFile } from 'ts-morph'
import {
  ParsedType,
  TypeEnum,
  parseSchema
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
      const project = new Project()
      this.file = project.createSourceFile(
        opts.filename || 'tmp.ts',
        {},
        { overwrite: true }
      )
    }
  }

  generateDtoBySchema(schema: mongoose.Schema, name: string) {
    const parsed = parseSchema(schema)
    this.generateDtoByParsedSchema(parsed, name)
  }

  generateDtoByParsedSchema(parsed: ParsedType, name: string) {
    let declar = this.useInterface
      ? this.file.addInterface({
          name: camelcase(`${name}Dto`, { pascalCase: true }),
          isExported: true
        })
      : this.file.addClass({
          name: camelcase(`${name}Dto`, { pascalCase: true }),
          isExported: true
        })
    Object.keys(parsed).forEach(propKey => {
      const field = parsed[propKey]

      let hasQuestionToken = false
      if (!field.details) {
        hasQuestionToken = true
      } else {
        hasQuestionToken = !field.details.required
      }

      switch (field.type.type) {
        case TypeEnum.Boolean:
        case TypeEnum.String:
        case TypeEnum.Number:
          declar.addProperty({
            name: propKey,
            type: field.type.isArray
              ? `${field.type.type.toLocaleLowerCase()}[]`
              : field.type.type.toLocaleLowerCase(),
            hasQuestionToken
          })
          break
        case TypeEnum.Date:
          declar.addProperty({
            name: propKey,
            type: field.type.isArray ? 'Date[]' : 'Date',
            hasQuestionToken
          })
          break
        case TypeEnum.ObjectId:
          declar.addProperty({
            name: propKey,
            type: field.type.isArray ? 'string[]' : 'string',
            hasQuestionToken
          })
          break
        case TypeEnum.Schema:
          const subTypeName = camelcase(`${name}-${propKey}Sub`, {
            pascalCase: true
          })
          this.generateDtoByParsedSchema(field.schema, subTypeName)
          declar.addProperty({
            name: propKey,
            type: field.type.isArray
              ? `${subTypeName}Dto[]`
              : `${subTypeName}Dto`,
            hasQuestionToken
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
}
