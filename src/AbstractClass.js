/**
 * AbstractClass.js
 * 抽象クラス(直接インスタンス化不可)と抽象メソッド(サブクラスでの実装必須)を
 * JavaScriptで表現するための機能。
 */

export class AbstractError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AbstractError';
  }
}

/**
 * 抽象クラスを作成する。
 * @param {Function} Base - 継承元クラス(省略可)
 * @param {string[]} abstractMethods - サブクラスでの実装が必須なメソッド名
 *
 * 使い方:
 *   class Shape extends abstractClass(Object, ['area', 'perimeter']) {
 *     describe() { return `面積: ${this.area()}`; }
 *   }
 *   class Circle extends Shape {
 *     constructor(r) { super(); this.r = r; }
 *     area() { return Math.PI * this.r ** 2; }
 *     perimeter() { return 2 * Math.PI * this.r; }
 *   }
 *   new Shape();   // AbstractError
 *   new Circle(3); // OK
 */
export function abstractClass(Base = Object, abstractMethods = []) {
  class AbstractBase extends Base {
    constructor(...args) {
      if (new.target === AbstractBase) {
        throw new AbstractError(`抽象クラス "${AbstractBase.name || Base.name}" を直接インスタンス化することはできません。`);
      }
      super(...args);
      for (const methodName of abstractMethods) {
        if (typeof this[methodName] !== 'function') {
          throw new AbstractError(
            `${this.constructor.name} は抽象メソッド "${methodName}()" を実装する必要があります。`
          );
        }
      }
    }
  }
  AbstractBase.__isAbstract = true;
  AbstractBase.__abstractMethods = [...abstractMethods];
  return AbstractBase;
}

/**
 * 個別メソッドを「抽象メソッド(未実装ならエラー)」として定義するヘルパー。
 * クラスのprototypeに直接生やしたい場合に使用。
 */
export function abstractMethod(name) {
  return function () {
    throw new AbstractError(`抽象メソッド "${name}()" はサブクラスで実装してください。`);
  };
}
