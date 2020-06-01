import { Project, SourceFile, IndentationText, QuoteKind } from 'ts-morph'
import { ParsedType, parseSchema } from '@zcong/mongoose-schema-parser/dist/v2'
import * as mongoose from 'mongoose'
import * as camelcase from 'camelcase'

export interface ModelGeneratorInitOptions {
  file?: SourceFile
  filename?: string
  useInterface?: boolean
  stringEnumUseUnionType?: boolean
}

export class ModelGenerator {
  private readonly opts: ModelGeneratorInitOptions
  private file: SourceFile
  private useInterface: boolean
  private mongoseImports: Set<string> = new Set()
  constructor(opts: ModelGeneratorInitOptions) {
    this.opts = opts
    this.useInterface = opts.useInterface
    /* istanbul ignore next */
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
        `// This file is created by @zcong/ts-mongoose-code-generator`,
        { overwrite: true }
      )
    }
  }

  generateModelBySchema(schema: mongoose.Schema, name: string) {
    const parsed = parseSchema(schema)
    this.generateModelByParsedSchema(parsed, name)
  }

  generateModelByParsedSchema(parsed: ParsedType, name: string) {
    const declar = this.useInterface
      ? this.file.addInterface({
          name: camelcase(`${name}Model`, { pascalCase: true }),
          isExported: true,
        })
      : this.file.addClass({
          name: camelcase(`${name}Model`, { pascalCase: true }),
          isExported: true,
        })

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
            field.type.type === 'String' &&
            field.type.enumValues &&
            this.opts.stringEnumUseUnionType
              ? field.type.enumValues.map((s: string) => `'${s}'`).join(' | ')
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
              [
                'string',
                'Types.ObjectId',
                `(${field.options.ref}Model & Document)`,
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
        }
        case 'Schema':
        case 'Embedded': {
          const subTypeName = camelcase(`${name}-${propKey}Sub`, {
            pascalCase: true,
          })
          this.generateModelByParsedSchema(field.schema, subTypeName)
          declar.addProperty({
            hasQuestionToken,
            name: propKey,
            type: this.arrayWrap(`${subTypeName}Model`, isArray),
          })
          break
        }
        case 'Mixed': {
          declar.addProperty({
            hasQuestionToken,
            name: propKey,
            type: this.arrayWrap('any', isArray),
          })
          break
        }
        case 'Buffer': {
          declar.addProperty({
            hasQuestionToken,
            name: propKey,
            type: this.arrayWrap('Buffer', isArray),
          })
          break
        }
        case 'Map': {
          declar.addProperty({
            hasQuestionToken,
            name: propKey,
            type: this.arrayWrap('any', isArray), // todo: use any
          })
          break
        }
        case 'Decimal128': {
          declar.addProperty({
            hasQuestionToken,
            name: propKey,
            type: this.arrayWrap('Types.Decimal128', isArray),
          })
          this.mongoseImports.add('Types')
          break
        }
        /* istanbul ignore next */
        default:
          /* istanbul ignore next */
          declar.addProperty({
            hasQuestionToken,
            name: propKey,
            type: this.arrayWrap('any', isArray),
          })
          /* istanbul ignore next */
          console.log(
            `[@zcong/ts-mongoose-code-generator] unhandled, propKey: ${propKey}, type: ${
              field.type.type
            }, options: ${JSON.stringify(field)}`
          )
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
