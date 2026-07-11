/**
 * Interface.js
 * Javaライクな「インターフェース」をJavaScriptで表現するための機能。
 * メソッドの実装漏れを実行時に検出できます。
 */

export class InterfaceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InterfaceError';
  }
}

/**
 * インターフェースを定義する。
 * @param {string} name - インターフェース名(エラーメッセージ用)
 * @param {string[]} methodNames - 実装が必須のメソッド名の配列
 */
export function createInterface(name, methodNames = []) {
  return Object.freeze({
    __isInterface: true,
    name,
    methods: [...methodNames],
  });
}

/**
 * インスタンスが指定インターフェースを満たしているか判定する。
 */
export function implementsInterface(instance, iface) {
  if (!iface || !iface.__isInterface) {
    throw new TypeError('第2引数には createInterface() で作成したオブジェクトを渡してください。');
  }
  return iface.methods.every((methodName) => typeof instance[methodName] === 'function');
}

/**
 * クラスに対して複数インターフェースの実装を強制するクラスデコレータ関数。
 * 使い方:
 *   const Serializable = createInterface('Serializable', ['toJSON']);
 *   class Foo extends enforceInterfaces(Serializable)(Base) { ... }
 */
export function enforceInterfaces(...interfaces) {
  return function (Base) {
    return class extends Base {
      constructor(...args) {
        super(...args);
        for (const iface of interfaces) {
          if (!implementsInterface(this, iface)) {
            const missing = iface.methods.filter((m) => typeof this[m] !== 'function');
            throw new InterfaceError(
              `${this.constructor.name} はインターフェース "${iface.name}" を満たしていません。未実装: ${missing.join(', ')}`
            );
          }
        }
      }
    };
  };
}
