/**
 * Observable.js
 * プロパティの変更を監視できる「オブザーバブル」プロパティを
 * 通常のオブジェクト/クラスインスタンスに追加する。
 */

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 単一プロパティをobservable化する。
 * onXxxChange(callback) が自動生成される。
 * 使い方:
 *   class Player {
 *     constructor() { observable(this, 'hp', 100); }
 *   }
 *   const p = new Player();
 *   p.onHpChange((newVal, oldVal) => console.log(newVal, oldVal));
 *   p.hp = 80; // コールバックが発火
 */
export function observable(target, propertyName, initialValue) {
  const valueKey = Symbol(`__${propertyName}_value`);
  const listenersKey = Symbol(`__${propertyName}_listeners`);

  target[valueKey] = initialValue;
  target[listenersKey] = new Set();

  Object.defineProperty(target, propertyName, {
    get() {
      return this[valueKey];
    },
    set(newValue) {
      const oldValue = this[valueKey];
      if (oldValue === newValue) return;
      this[valueKey] = newValue;
      this[listenersKey].forEach((cb) => cb(newValue, oldValue));
    },
    enumerable: true,
    configurable: true,
  });

  target[`on${capitalize(propertyName)}Change`] = function (callback) {
    this[listenersKey].add(callback);
    return () => this[listenersKey].delete(callback);
  };

  return target;
}

/**
 * 複数プロパティをまとめてobservable化する。
 * 使い方:
 *   makeObservable(this, { hp: 100, mp: 50 });
 */
export function makeObservable(instance, properties) {
  for (const [name, initial] of Object.entries(properties)) {
    observable(instance, name, initial);
  }
  return instance;
}
