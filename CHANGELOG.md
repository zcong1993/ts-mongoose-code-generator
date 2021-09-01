# [2.0.0-beta.0](https://github.com/zcong1993/ts-mongoose-code-generator/compare/v1.3.1...v2.0.0-beta.0) (2021-09-01)

### Features

- rewrite ref type, and prefer split models to single file ([d075896](https://github.com/zcong1993/ts-mongoose-code-generator/commit/d075896d57db9059a1d16dc146baeccee83f6c29))

### BREAKING CHANGES

- remove & Document type for ref, always try to import ref type from './', so you should generate a index.ts which contains all generated model types yourself.

## [1.3.1](https://github.com/zcong1993/ts-mongoose-code-generator/compare/v1.3.0...v1.3.1) (2020-08-19)
