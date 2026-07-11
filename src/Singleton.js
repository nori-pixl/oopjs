/**
 * Singleton.js
 * クラスをシングルトン化するデコレータ関数。
 * 使い方:
 *   class Config extends singleton(class { constructor() { this.value = 42; } }) {}
 *   const a = new Config();
 *   const b = new Config();
 *   a === b // true
 */

const instanceRegistry = new WeakMap();

export function singleton(Base) {
  class SingletonClass extends Base {
    constructor(...args) {
      if (instanceRegistry.has(SingletonClass)) {
        return instanceRegistry.get(SingletonClass);
      }
      super(...args);
      instanceRegistry.set(SingletonClass, this);
    }

    static resetInstance() {
      instanceRegistry.delete(SingletonClass);
    }

    static getInstance(...args) {
      return new SingletonClass(...args);
    }
  }
  return SingletonClass;
}
