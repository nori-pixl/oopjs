/**
 * Mixin.js
 * JavaScriptは多重継承ができないため、Mixin(部分的な機能の合成)を
 * 実現するためのユーティリティ。
 */

/**
 * ベースクラスに複数のmixin関数を順番に適用する。
 * 使い方:
 *   class Player extends mixin(Base, Flyable, Swimmable) {}
 */
export function mixin(Base, ...mixins) {
  return mixins.reduce((acc, mixinFn) => mixinFn(acc), Base);
}

/**
 * メソッド/静的メソッドのオブジェクトから簡単にmixin関数を作成する。
 * 使い方:
 *   const Flyable = createMixin({
 *     fly() { return `${this.name}が飛んでいます`; }
 *   });
 *   class Bird extends Flyable(Animal) {}
 */
export function createMixin(instanceMethods = {}, staticMethods = {}) {
  return function (Base) {
    const Mixed = class extends Base {};
    Object.assign(Mixed.prototype, instanceMethods);
    Object.assign(Mixed, staticMethods);
    return Mixed;
  };
}

/**
 * 既にあるクラス(prototypeを持つオブジェクト)をそのままmixinとして
 * 合成したい場合のヘルパー。名前の衝突があると上書きされる点に注意。
 */
export function mixClasses(Base, ...classes) {
  const Mixed = class extends Base {};
  for (const Cls of classes) {
    Object.getOwnPropertyNames(Cls.prototype).forEach((key) => {
      if (key !== 'constructor') {
        Object.defineProperty(
          Mixed.prototype,
          key,
          Object.getOwnPropertyDescriptor(Cls.prototype, key)
        );
      }
    });
  }
  return Mixed;
}
