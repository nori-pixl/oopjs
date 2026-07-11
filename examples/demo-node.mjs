// Node.js での使用例(ESM)
// 実行方法: node examples/demo-node.mjs

import {
  createInterface,
  enforceInterfaces,
  abstractClass,
  createMixin,
  singleton,
  EventEmitter,
  observable,
  typed,
} from '../src/index.js';

// ---- 1. インターフェース ----
const Comparable = createInterface('Comparable', ['compareTo']);

class Money extends enforceInterfaces(Comparable)(Object) {
  constructor(amount) {
    super();
    this.amount = amount;
  }
  compareTo(other) {
    return this.amount - other.amount;
  }
}
console.log('[Interface]', new Money(100).compareTo(new Money(50)));

// ---- 2. 抽象クラス ----
class Shape extends abstractClass(Object, ['area', 'perimeter']) {
  describe() {
    return `面積は ${this.area().toFixed(2)}、周囲は ${this.perimeter().toFixed(2)} です`;
  }
}
class Circle extends Shape {
  constructor(radius) {
    super();
    this.radius = radius;
  }
  area() {
    return Math.PI * this.radius ** 2;
  }
  perimeter() {
    return 2 * Math.PI * this.radius;
  }
}
console.log('[Abstract]', new Circle(3).describe());

// ---- 3. Mixin ----
const Flyable = createMixin({
  fly() {
    return `${this.name} が空を飛んでいます`;
  },
});
const Swimmable = createMixin({
  swim() {
    return `${this.name} が泳いでいます`;
  },
});
class Animal {
  constructor(name) {
    this.name = name;
  }
}
class Duck extends Flyable(Swimmable(Animal)) {}
const duck = new Duck('アヒル');
console.log('[Mixin]', duck.fly());
console.log('[Mixin]', duck.swim());

// ---- 4. シングルトン ----
class AppConfigBase {
  constructor() {
    this.createdAt = Date.now();
  }
}
class AppConfig extends singleton(AppConfigBase) {}
const config1 = new AppConfig();
const config2 = new AppConfig();
console.log('[Singleton] 同一インスタンス?', config1 === config2);

// ---- 5. イベントエミッター ----
const emitter = new EventEmitter();
emitter.on('level-up', (level) => console.log(`[EventEmitter] レベル${level}になりました!`));
emitter.emit('level-up', 5);

// ---- 6. オブザーバブル ----
class Player {
  constructor() {
    observable(this, 'hp', 100);
  }
}
const player = new Player();
player.onHpChange((newVal, oldVal) => {
  console.log(`[Observable] HPが ${oldVal} から ${newVal} に変化しました`);
});
player.hp = 70;

// ---- 7. 型チェック ----
const add = typed(['number', 'number'], 'number')((a, b) => a + b);
console.log('[TypeCheck] 1 + 2 =', add(1, 2));
try {
  add(1, '文字列');
} catch (err) {
  console.log('[TypeCheck] エラー捕捉:', err.message);
}
