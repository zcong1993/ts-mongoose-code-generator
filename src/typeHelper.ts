import { Types } from 'mongoose'

export type PopulateType<T> = NonPopulateModelType | T
export type ArrayPopulateType<T> =
  | Array<string>
  | Array<Types.ObjectId>
  | Array<T>
export type NonPopulateModelType = string | Types.ObjectId
export type PopulateModelType<T> = T extends NonPopulateModelType ? never : T
export type ArrayPopulateModelType<T> = T extends Array<NonPopulateModelType>
  ? never
  : T

export function forcePopulateModelType<T>(
  _: PopulateType<T>
): _ is PopulateModelType<T> {
  return true
}

export function forcePopulateModelArrayType<T>(
  _: ArrayPopulateType<T>
): _ is ArrayPopulateModelType<Array<T>> {
  return true
}

export function forceStringType<T>(_: PopulateType<T>): _ is string {
  return true
}

export function forceStringArrayType<T>(
  _: ArrayPopulateType<T>
): _ is Array<string> {
  return true
}

export function forceObjectIDType<T>(_: PopulateType<T>): _ is Types.ObjectId {
  return true
}

export function forceObjectIDArrayType<T>(
  _: ArrayPopulateType<T>
): _ is Array<Types.ObjectId> {
  return true
}
