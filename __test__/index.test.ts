import * as fs from 'fs'
import { Schema } from 'mongoose'
import { DtoGenerator, FactoryGenerator } from '../src'
import { TypeEnum } from '@zcong/mongoose-schema-parser'

const ObjectId = Schema.Types.ObjectId

const nestedSchema = new Schema({
  nestedName: String,
})

const testSchema = new Schema({
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
    ref: 'Test',
  },
  refs: [
    {
      type: ObjectId,
      ref: 'Test',
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
})

const expectedDtoClassCode = `
export class TestDto {
  id?: string;
  name?: string;
  age?: number;
  requiredName: string;
  enumString?: string;
  date?: Date;
  bool?: boolean;
  nested?: TestNestedSubDto;
  nestedArr?: TestNestedArrSubDto[];
  nestedArr2?: TestNestedArr2SubDto[];
  simpleArr?: string[];
  simpleArr2?: string[];
  directNested?: TestDirectNestedSubDto;
  directNestedArr?: TestDirectNestedArrSubDto[];
  ref?: string;
  refs?: string[];
  withTypeField?: TestWithTypeFieldSubDto[];
}

export class TestNestedSubDto {
  nestedName?: string;
}

export class TestNestedArrSubDto {
  nestedName?: string;
}

export class TestNestedArr2SubDto {
  type?: TestNestedArr2SubTypeSubDto;
}

export class TestNestedArr2SubTypeSubDto {
  nestedName?: string;
}

export class TestDirectNestedSubDto {
  name?: string;
  age?: number;
}

export class TestDirectNestedArrSubDto {
  name?: string;
  age?: number;
}

export class TestWithTypeFieldSubDto {
  type?: string;
  other?: string;
}

`

it('dtoGenerator should work well', () => {
  const dtoGen = new DtoGenerator({ filename: `${__dirname}/dtoGen.ts` })
  dtoGen.generateDtoBySchema(testSchema, 'Test')
  dtoGen.getFile().saveSync()
  const content = fs.readFileSync(`${__dirname}/dtoGen.ts`, 'utf8')
  const generated = dtoGen.getGeneratedCode()
  expect(content).toEqual(generated)
  expect(generated).toMatchSnapshot()
  fs.unlinkSync(`${__dirname}/dtoGen.ts`)
})

it('dtoGenerator use interface should work well', () => {
  const dtoGen = new DtoGenerator({
    filename: `${__dirname}/dtoGen.ts`,
    useInterface: true,
  })
  dtoGen.generateDtoBySchema(testSchema, 'Test')
  dtoGen.getFile().saveSync()
  const content = fs.readFileSync(`${__dirname}/dtoGen.ts`, 'utf8')
  const generated = dtoGen.getGeneratedCode()
  expect(content).toEqual(generated)
  expect(generated).toMatchSnapshot()
  fs.unlinkSync(`${__dirname}/dtoGen.ts`)
})

it('factoryGenerator should work well', () => {
  const factoryGen = new FactoryGenerator({
    filename: `${__dirname}/factoryGen.ts`,
    dtoFilePath: './dtoGen',
    customFields: [
      {
        value: 'customName',
        fieldName: 'name',
        type: TypeEnum.String,
      },
    ],
  })
  factoryGen.generateFactoriesBySchema(testSchema, 'Test')
  factoryGen.getFile().saveSync()
  const content = fs.readFileSync(`${__dirname}/factoryGen.ts`, 'utf8')
  const generated = factoryGen.getGeneratedCode()
  expect(content).toEqual(generated)
  expect(generated).toMatchSnapshot()
  fs.unlinkSync(`${__dirname}/factoryGen.ts`)
})
