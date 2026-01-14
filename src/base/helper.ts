
export const remove = <T>(arr: T[], el: T) => {
    const i = arr.indexOf(el)
    if (i > -1) {
      arr.splice(i, 1)
    }
}

export const objectToString = Object.prototype.toString
export const toTypeString = (value: unknown): string =>
  objectToString.call(value)

export const isArray = Array.isArray
export const isMap = (val: unknown): val is Map<any, any> =>
  toTypeString(val) === '[object Map]'
export const isSet = (val: unknown): val is Set<any> =>
  toTypeString(val) === '[object Set]'

export const isDate = (val: unknown): val is Date => val instanceof Date
export const isFunction = (val: unknown): val is Function =>
  typeof val === 'function'
export const isString = (val: unknown): val is string => typeof val === 'string'
export const isSymbol = (val: unknown): val is symbol => typeof val === 'symbol'
export const isObject = (val: unknown): val is Record<any, any> =>
  val !== null && typeof val === 'object'

export const isPromise = <T = any>(val: unknown): val is Promise<T> => {
  return isObject(val) && isFunction(val.then) && isFunction(val.catch)
}

export function isNumber (object: any) {
  return typeof object === 'number' || object instanceof Number;
}

// export const isPlainObject = (val: unknown): val is object =>
//   toTypeString(val) === '[object Object]'

function looseCompareArrays(a: any[], b: any[]) {
    if (a.length !== b.length) return false
    let equal = true
    for (let i = 0; equal && i < a.length; i++) {
        equal = looseEqual(a[i], b[i])
    }

    return equal
}

export function looseEqual(a: any, b: any): boolean {
  if (a === b) return true

  let aValidType = isDate(a)
  let bValidType = isDate(b)

  if (aValidType || bValidType) {
    return aValidType && bValidType ? a.getTime() === b.getTime() : false
  }

  aValidType = isArray(a)
  bValidType = isArray(b)
  if (aValidType || bValidType) {
    return aValidType && bValidType ? looseCompareArrays(a, b) : false
  }
  aValidType = isObject(a)
  bValidType = isObject(b)

  if (aValidType || bValidType) {
    /* istanbul ignore if: this if will probably never be called */
    if (!aValidType || !bValidType) {
      return false
    }
    const aKeysCount = Object.keys(a).length
    const bKeysCount = Object.keys(b).length
    if (aKeysCount !== bKeysCount) {
      return false
    }

    for (const key in a) {
      const aHasKey = a.hasOwnProperty(key)
      const bHasKey = b.hasOwnProperty(key)

      if (
        (aHasKey && !bHasKey) ||
        (!aHasKey && bHasKey) ||
        !looseEqual(a[key], b[key])
      ) {
        return false
      }
    }
  }
  return String(a) === String(b)
}