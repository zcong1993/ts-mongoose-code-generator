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
  private mongoseImports: Set<string> = new Set()
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
    this.generateDtoByParsedSchema(parsed, name, false, schema)
  }

  generateDtoByParsedSchema(
    parsed: ParsedType,
    name: string,
    isSub?: boolean,
    schema?: mongoose.Schema
  ) {
    const declar = this.useInterface
      ? this.file.addInterface({
          name: camelcase(`${name}Dto`, { pascalCase: true }),
          isExported: true,
        })
      : this.file.addClass({
          name: camelcase(`${name}Dto`, { pascalCase: true }),
          isExported: true,
        })

    if (isSub) {
      declar.addProperty({
        hasQuestionToken: true,
        name: '_id',
        type: 'string | Types.ObjectId',
      })

      this.mongoseImports.add('Types')
    }

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
          this.mongoseImports.add('Types')
          let type: string
          // handle ref type
          if (field.details && field.details.ref) {
            type = this.arrayWrapOr(
              [
                'string',
                'Types.ObjectId',
                `(${field.details.ref}Dto & Document)`,
              ],
              isArray
            )
            this.mongoseImports.add('Document')
          } else {
            type = this.arrayWrapOr(['string', 'Types.ObjectId'], isArray)
          }
          declar.addProperty({
            type,
            hasQuestionToken,
            name: propKey,
          })
          break
        case TypeEnum.Schema:
          const subTypeName = camelcase(`${name}-${propKey}Sub`, {
            pascalCase: true,
          })
          this.generateDtoByParsedSchema(field.schema, subTypeName, true)
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

    // handle timestamp
    if (
      schema &&
      (schema as any).options &&
      (schema as any).options.timestamps
    ) {
      const opt: mongoose.SchemaOptions = (schema as any).options
      let createdAtFieldName: string
      let updatedAtFieldName: string
      if (typeof opt.timestamps === 'boolean') {
        if (opt.timestamps) {
          createdAtFieldName = 'createdAt'
          updatedAtFieldName = 'updatedAt'
        }
      } else {
        if (
          typeof opt.timestamps.createdAt === 'boolean' &&
          opt.timestamps.createdAt
        ) {
          createdAtFieldName = 'createdAt'
        }
        if (
          typeof opt.timestamps.updatedAt === 'boolean' &&
          opt.timestamps.updatedAt
        ) {
          updatedAtFieldName = 'updatedAt'
        }

        if (
          typeof opt.timestamps.createdAt === 'string' &&
          opt.timestamps.createdAt
        ) {
          createdAtFieldName = opt.timestamps.createdAt
        }

        if (
          typeof opt.timestamps.updatedAt === 'string' &&
          opt.timestamps.updatedAt
        ) {
          updatedAtFieldName = opt.timestamps.updatedAt
        }
      }

      if (createdAtFieldName) {
        declar.addProperty({
          hasQuestionToken: true,
          name: createdAtFieldName,
          type: 'Date',
        })
      }

      if (updatedAtFieldName) {
        declar.addProperty({
          hasQuestionToken: true,
          name: updatedAtFieldName,
          type: 'Date',
        })
      }
    }
  }

  getGeneratedCode() {
    this.handleMongooseImports()
    return this.file.getFullText()
  }

  getFile() {
    this.handleMongooseImports()
    return this.file
  }

  private init() {
    this.file.removeText()
  }

  private arrayWrap(origin: string, isArray: boolean): string {
    return isArray ? `Array<${origin}>` : origin
  }

  private arrayWrapOr(types: string[], isArray: boolean) {
    if (!isArray) {
      return types.join(' | ')
    }
    return types.map((t) => `Array<${t}>`).join(' | ')
  }

  private handleMongooseImports() {
    if (this.mongoseImports.size > 0) {
      this.file.addImportDeclaration({
        moduleSpecifier: 'mongoose',
        namedImports: [...this.mongoseImports].map((name) => ({ name })),
      })
      this.mongoseImports.clear()
    }
  }
}
