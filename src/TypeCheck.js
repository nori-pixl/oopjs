/**
 * TypeCheck.js
 * メソッドの引数・戻り値に実行時の型チェックを追加するユーティリティ。
 * TypeScriptを導入するほどではないが、簡易的な型安全性が欲しい場合に。
 */

export class TypeCheckError extends TypeError {
  constructor(message) {
    super(message);
    this.name = 'TypeCheckError';
  }
}

const validators = {
  string: (v) => typeof v === 'string',
  number: (v) => typeof v === 'number',
  boolean: (v) => typeof v === 'boolean',
  function: (v) => typeof v === 'function',
  object: (v) => typeof v === 'object' && v !== null,
  array: (v) => Array.isArray(v),
  any: () => true,
};

function checkType(value, type) {
  if (typeof type === 'string') {
    return validators[type] ? validators[type](value) : true;
  }
  if (typeof type === 'function') {
    return value instanceof type;
  }
  return true;
}

function describeType(type) {
  return typeof type === 'string' ? type : type.name;
}

/**
 * 関数に型チェックを付与する高階関数。
 * 使い方:
 *   const add = typed(['number', 'number'], 'number')((a, b) => a + b);
 *   add(1, 2);     // 3
 *   add(1, '2');   // TypeCheckError
 */
export function typed(paramTypes = [], returnType = null) {
  return function decorate(fn) {
    return function (...args) {
      paramTypes.forEach((type, i) => {
        if (type && !checkType(args[i], type)) {
          throw new TypeCheckError(
            `引数 ${i} は "${describeType(type)}" 型である必要がありますが、実際は ${typeof args[i]} でした。`
          );
        }
      });
      const result = fn.apply(this, args);
      if (returnType && !checkType(result, returnType)) {
        throw new TypeCheckError(
          `戻り値は "${describeType(returnType)}" 型である必要がありますが、条件を満たしませんでした。`
        );
      }
      return result;
    };
  };
}

/**
 * クラスメソッドに型チェックを適用するためのヘルパー。
 * 使い方:
 *   class Calculator {
 *     add = typed(['number', 'number'], 'number')(function (a, b) {
 *       return a + b;
 *     });
 *   }
 */
export function typedMethod(paramTypes, returnType) {
  return typed(paramTypes, returnType);
}
