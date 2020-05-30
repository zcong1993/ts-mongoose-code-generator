# ts-mongoose-code-generator

[![NPM version](https://img.shields.io/npm/v/@zcong/ts-mongoose-code-generator.svg?style=flat)](https://npmjs.com/package/@zcong/ts-mongoose-code-generator) [![NPM downloads](https://img.shields.io/npm/dm/@zcong/ts-mongoose-code-generator.svg?style=flat)](https://npmjs.com/package/@zcong/ts-mongoose-code-generator) [![CircleCI](https://circleci.com/gh/zcong1993/ts-mongoose-code-generator/tree/master.svg?style=shield)](https://circleci.com/gh/zcong1993/ts-mongoose-code-generator/tree/master) [![codecov](https://codecov.io/gh/zcong1993/ts-mongoose-code-generator/branch/master/graph/badge.svg)](https://codecov.io/gh/zcong1993/ts-mongoose-code-generator)

> generate ts model types from mongoose schema

## Install

```bash
$ yarn add @zcong/ts-mongoose-code-generator
```

## Usage

### modelGenerator

```ts
import { ModelGenerator } from '@zcong/ts-mongoose-code-generator'

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
const dtoGen = new ModelGenerator({ filename: `${__dirname}/modelGen.ts`, useInterface: false })
dtoGen.generateModelBySchema(testSchema, 'Test')
dtoGen.getFile().saveSync() // save generated code as file
dtoGen.getGeneratedCode() // get generated code content

// export interface TestDto {
//   name?: string;
//   age?: number;
//   requiredName: string;
// }
```

## License

MIT &copy; zcong1993
