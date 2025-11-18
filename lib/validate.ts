export const _toString = Object.prototype.toString

/**
 * Checks if the given value is an object.
 *
 * @param val - The value to be checked.
 * @returns Returns true if the value is an object, otherwise false.
 */
export function isObject(val: unknown): val is object {
  return _toString.call(val) === '[object Object]'
}

/**
 * Checks if the given value is an symbol.
 *
 * @param val - The value to be checked.
 * @returns Returns true if the value is an object, otherwise false.
 */

export function isSymbol(val: unknown): val is symbol {
  return typeof val === 'symbol'
}
/**
 * Checks if the given value is a function.
 *
 * @param val - The value to be checked.
 * @returns Returns true if the value is a function, false otherwise.
 */
export function isFn(val: unknown): val is Function {
  return typeof val === 'function'
}

/**
 * Checks if the given value is a string.
 *
 * @param val - The value to be checked.
 * @returns Returns true if the value is a string, false otherwise.
 */
export function isStr(val: unknown): val is string {
  return typeof val === 'string'
}

/**
 * Checks if the provided value is a boolean.
 *
 * @param val - The value to check.
 * @returns Returns true if the value is a boolean, false otherwise.
 */
export function isBool(val: unknown): val is boolean {
  return typeof val === 'boolean'
}

/**
 * Checks if a value is undefined.
 *
 * @param val - The value to check.
 * @returns Returns true if the value is undefined, otherwise false.
 */
export function isUndef(val: unknown): val is undefined {
  return typeof val === 'undefined'
}

/**
 * Checks if the given value is null.
 *
 * @param val - The value to check.
 * @returns Returns true if the value is null, false otherwise.
 */
export function isNull(val: unknown): val is null {
  return val === null
}

export const isNil = isNull

/**
 * Determines whether a value is a primitive.
 *
 * @param val - The value to check.
 * @returns Returns `true` if the value is a primitive, `false` otherwise.
 */
export function isPrimitive(val: unknown) {
  return typeof val !== 'object' || val === null
}

/**
 * Checks if a value is falsy.
 *
 * @param val - The value to check.
 * @returns Returns true if the value is falsy, otherwise false.
 */
export function isFalsy(val: unknown): val is false {
  return !val
}

/**
 * Checks if the given value is a number.
 *
 * @param val - The value to be checked.
 * @returns Returns true if the value is a number, false otherwise.
 */
export function isNumber(val: unknown): val is number {
  return typeof val === 'number'
}

/**
 * determines if it is a valid value other than NaN
 * @param val
 * @returns
 */
export function isEffectiveNumber(val: unknown): val is number {
  if (!isNumber(val)) return false
  return !isNaN(val)
}

/**
 * Checks if a value is a Promise.
 *
 * @param val - The value to check.
 * @returns Returns `true` if the value is a Promise, else `false`.
 */
export function isPromise(val: unknown): val is Promise<unknown> {
  return (
    typeof val === 'object' &&
    !isNull(val) &&
    (_toString.call(val) === '[object Promise]' ||
      isFn(Reflect.get(val, 'then')))
  )
}

/**
 * Checks if the given object has its own property.
 *
 * @param obj - The object to check.
 * @param prop - The property to check.
 * @returns Returns true if the object has its own property, otherwise false.
 */
export function hasOwn(obj: object, prop: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(obj, prop)
}

/**
 * An array is considered valid if it is an array and its length is greater than or equal to 0.
 *
 * @param arr - The array to be checked.
 * @returns Returns true if the array is valid, false otherwise.
 */
export function isValidArray(arr: unknown[]): boolean {
  return Array.isArray(arr) && arr.length > 0
}

/**
 * Checks if a given value is a valid PropertyKey.
 * A PropertyKey is a string, number, or symbol that can be used as a property name.
 *
 * @param val - The value to check.
 * @returns True if the value is a PropertyKey, false otherwise.
 */

export function isPropertyKey(val: unknown): val is PropertyKey {
  return isStr(val) || isNumber(val) || isSymbol(val)
}

/**
 * Checks if a given date is valid.
 *
 * @param date - The date to check.
 * @returns True if the date is valid, false otherwise.
 */

export function isValidDate(date: Date) {
  return date.toString() !== 'Invalid Date'
}

/**
 * Determines whether the provided user agent string belongs to a mobile device.
 *
 * @param ua - The user agent string to check.
 * @returns Returns true if the UA indicates a mobile device, otherwise false.
 */
export function isMobile(ua?: string): boolean {
  if (!ua) return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Windows Phone|Kindle|Silk|Opera Mini|Mobile/i.test(ua)
}
