# ts-mongoose-code-generator

[![NPM version](https://img.shields.io/npm/v/@zcong/ts-mongoose-code-generator.svg?style=flat)](https://npmjs.com/package/@zcong/ts-mongoose-code-generator) [![NPM downloads](https://img.shields.io/npm/dm/@zcong/ts-mongoose-code-generator.svg?style=flat)](https://npmjs.com/package/@zcong/ts-mongoose-code-generator) [![CircleCI](https://circleci.com/gh/zcong1993/ts-mongoose-code-generator/tree/master.svg?style=shield)](https://circleci.com/gh/zcong1993/ts-mongoose-code-generator/tree/master) [![codecov](https://codecov.io/gh/zcong1993/ts-mongoose-code-generator/branch/master/graph/badge.svg)](https://codecov.io/gh/zcong1993/ts-mongoose-code-generator)

> generate ts dto and model factory code for mongoose

## Install

```bash
$ yarn add @zcong/ts-mongoose-code-generator
```

## Usage

### dtoGenerator

```ts
import { DtoGenerator } from '@zcong/ts-mongoose-code-generator'

const testSchema = new Schema({
  name: String,
  age: {
    type: Number
  },
  requiredName: {
    type: String,
    required: true
  }
}

// useInterface: use class or interface as type declaration
const dtoGen = new DtoGenerator({ filename: `${__dirname}/dtoGen.ts`, useInterface: false })
dtoGen.generateDtoBySchema(testSchema, 'Test')
dtoGen.getFile().saveSync() // save generated code as file
dtoGen.getGeneratedCode() // get generated code content

// export interface TestDto {
//   name?: string;
//   age?: number;
//   requiredName: string;
// }
```

### factoryGenerator

```ts
import { FactoryGenerator } from '@zcong/ts-mongoose-code-generator'

const testSchema = new Schema({
  name: String,
  age: {
    type: Number
  },
  requiredName: {
    type: String,
    required: true
  }
}

const factoryGen = new FactoryGenerator({
  filename: `${__dirname}/factoryGen.ts`,
  dtoFilePath: './dtoGen', // dto file path, should relative with this file and without ts extension
  customFields: [
    {
      fieldName: 'name', // rewrite fieldname
      type: TypeEnum.String, // rewrite field type
      value: 'customName' // rewrited by value
    }
  ]
})
dtoGen.generateDtoBySchema(testSchema, 'Test')
dtoGen.getFile().saveSync() // save generated code as file
dtoGen.getGeneratedCode() // get generated code content

// import * as faker from 'faker';
// import * as dto from './dtoGen';

// export function testFactory(initial: Partial<dto.TestDto> = {}): dto.TestDto {
//   const mock: dto.TestDto = {
//     name: 'customName',
//     age: faker.random.number(),
//     requiredName: faker.lorem.word(),
//   }
//   return { ...mock, ...initial }
// }
```

## License

MIT &copy; zcong1993
