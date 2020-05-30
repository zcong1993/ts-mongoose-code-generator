import * as fs from 'fs'
import { Schema } from 'mongoose'
import { ModelGenerator } from '../src'

const ObjectId = Schema.Types.ObjectId

const nestedSchema = new Schema({
  nestedName: String,
})

const refSchema = new Schema(
  {
    refName: String,
  },
  { timestamps: true }
)

const testSchema = new Schema(
  {
    id: ObjectId,
    name: String,
    age: {
      type: Number,
    },
    requiredName: {
      type: String,
      required: true,
    },
    enumString: {
      type: String,
      enum: ['test1', 'test2'],
    },
    date: Date,
    bool: Boolean,
    nested: nestedSchema,
    nestedArr: [nestedSchema],
    nestedArr2: [
      {
        type: nestedSchema,
      },
    ],
    simpleArr: [String],
    simpleArr2: [
      {
        type: String,
      },
    ],
    directNested: {
      name: String,
      age: Number,
    },
    directNestedArr: [
      {
        name: String,
        age: Number,
      },
    ],
    ref: {
      type: ObjectId,
      ref: 'Ref',
    },
    refs: [
      {
        type: ObjectId,
        ref: 'Ref',
      },
    ],
    withTypeField: [
      {
        type: {
          type: String,
        },
        other: String,
      },
    ],
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

it('v2 modelGenerator should work well', () => {
  const dtoGen = new ModelGenerator({ filename: `${__dirname}/dtoGenv2.ts` })
  dtoGen.generateModelBySchema(testSchema, 'Test')
  dtoGen.generateModelBySchema(refSchema, 'Ref')
  dtoGen.getFile().saveSync()
  const content = fs.readFileSync(`${__dirname}/dtoGenv2.ts`, 'utf8')
  const generated = dtoGen.getGeneratedCode()
  expect(content).toEqual(generated)
  expect(generated).toMatchSnapshot()
  fs.unlinkSync(`${__dirname}/dtoGenv2.ts`)
})

it('v2 modelGenerator use interface should work well', () => {
  const dtoGen = new ModelGenerator({
    filename: `${__dirname}/dtoGenv2.ts`,
    useInterface: true,
  })
  dtoGen.generateModelBySchema(testSchema, 'Test')
  dtoGen.generateModelBySchema(refSchema, 'Ref')
  dtoGen.getFile().saveSync()
  const content = fs.readFileSync(`${__dirname}/dtoGenv2.ts`, 'utf8')
  const generated = dtoGen.getGeneratedCode()
  expect(content).toEqual(generated)
  expect(generated).toMatchSnapshot()
  fs.unlinkSync(`${__dirname}/dtoGenv2.ts`)
})

it('v2 modelGenerator stringEnumUseUnionType flag should work well', () => {
  const dtoGen = new ModelGenerator({
    filename: `${__dirname}/dtoGenv2.ts`,
    useInterface: true,
    stringEnumUseUnionType: true,
  })
  dtoGen.generateModelBySchema(testSchema, 'Test')
  dtoGen.generateModelBySchema(refSchema, 'Ref')
  dtoGen.getFile().saveSync()
  const content = fs.readFileSync(`${__dirname}/dtoGenv2.ts`, 'utf8')
  const generated = dtoGen.getGeneratedCode()
  expect(content).toEqual(generated)
  expect(generated).toMatchSnapshot()
  fs.unlinkSync(`${__dirname}/dtoGenv2.ts`)
})
