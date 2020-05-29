import { Project, SourceFile, IndentationText, QuoteKind } from 'ts-morph'
import { ParsedType, parseSchema } from '@zcong/mongoose-schema-parser/dist/v2'
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
    this.generateDtoByParsedSchema(parsed, name, false)
  }

  generateDtoByParsedSchema(parsed: ParsedType, name: string, isSub?: boolean) {
    const declar = this.useInterface
      ? this.file.addInterface({
          name: camelcase(`${name}Dto`, { pascalCase: true }),
          isExported: true,
          extends: isSub ? [] : ['Document'],
        })
      : this.file.addClass({
          name: camelcase(`${name}Dto`, { pascalCase: true }),
          isExported: true,
          extends: isSub ? null : 'Document',
        })

    this.mongoseImports.add('Document')

    Object.keys(parsed).forEach((propKey) => {
      const field = parsed[propKey]

      let hasQuestionToken = false
      if (!field.options) {
        hasQuestionToken = true
      } else {
        hasQuestionToken = !field.options.required
      }

      const isArray = field.type.isArray

      switch (field.type.type) {
        case 'Boolean':
        case 'String':
        case 'Number': {
          const t =
            field.type.type === 'String' && field.type.enumValues
              ? field.type.enumValues.map((s) => `'${s}'`).join(' | ')
              : field.type.type.toLocaleLowerCase()
          declar.addProperty({
            hasQuestionToken,
            name: propKey,
            type: this.arrayWrap(t, isArray),
          })
          break
        }
        case 'Date': {
          declar.addProperty({
            hasQuestionToken,
            name: propKey,
            type: this.arrayWrap('Date', isArray),
          })
          break
        }
        case 'ObjectID': {
          this.mongoseImports.add('Types')
          let type: string
          // handle ref type
          if (field.options && field.options.ref) {
            type = this.arrayWrapOr(
              ['string', 'Types.ObjectId', `${field.options.ref}Dto`],
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
        }
        case 'Schema':
        case 'Embedded': {
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
        }
        default:
          break
      }
    })
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
