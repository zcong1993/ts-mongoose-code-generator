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
  t: PopulateType<T>
): t is PopulateModelType<T>
export function forcePopulateModelType<T>(
  t: ArrayPopulateType<T>
): t is ArrayPopulateModelType<Array<T>>
export function forcePopulateModelType(_: any): boolean {
  return true
}

export function forceStringType<T>(t: PopulateType<T>): t is string
export function forceStringType<T>(t: ArrayPopulateType<T>): t is Array<string>
export function forceStringType(_: any): boolean {
  return true
}

export function forceObjectIDType<T>(t: PopulateType<T>): t is Types.ObjectId
export function forceObjectIDType<T>(
  t: ArrayPopulateType<T>
): t is Array<Types.ObjectId>
export function forceObjectIDType(_: any): boolean {
  return true
}
