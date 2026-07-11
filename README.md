# oop-lib

JavaScriptのオブジェクト指向プログラミングを強化する、依存ゼロの軽量ライブラリです。
Java/C#にあるような「インターフェース」「抽象クラス」に加えて、Mixin・シングルトン・イベント発行・オブザーバブル・実行時型チェックを提供します。

## 特徴

- 依存ライブラリなし、純粋なJavaScriptのみ
- Node.js(ESM / CommonJS)、ブラウザ(`<script>`タグ直読み)の両方に対応
- ビルドツール不要 — `dist/oop-lib.js` を読み込むだけで使えます

## ファイル構成

```
oop-lib/
├── package.json
├── README.md
├── src/                     # ESモジュール版のソース(Node.jsやバンドラー向け)
│   ├── package.json         # (このディレクトリだけ ESM として解釈させるための設定)
│   ├── index.js             # すべての機能をまとめてexport
│   ├── Interface.js         # インターフェース
│   ├── AbstractClass.js     # 抽象クラス・抽象メソッド
│   ├── Mixin.js             # Mixin合成
│   ├── Singleton.js         # シングルトンパターン
│   ├── EventEmitter.js      # イベント発行/購読
│   ├── Observable.js        # プロパティの変更監視
│   ├── TypeCheck.js         # 実行時型チェック
│   └── Fluent.js            # oopjs.class/init/method の宣言的DSL
├── dist/
│   └── oop-lib.js           # ブラウザ/CommonJS向けの単一バンドル(UMD)
└── examples/
    ├── demo-node.mjs         # Node.jsでの使用例 (node examples/demo-node.mjs)
    ├── demo-fluent.mjs       # oopjs DSLの使用例 (node examples/demo-fluent.mjs)
    ├── demo-oop10.mjs        # OOPの代表的な10要素まとめデモ (node examples/demo-oop10.mjs)
    └── demo.html             # ブラウザでの使用例(script tagのみ、ビルド不要)
```

## 使い方

### ブラウザ(ビルド不要)

```html
<script src="dist/oop-lib.js"></script>
<script>
  const Comparable = OOP.createInterface('Comparable', ['compareTo']);
  class Money extends OOP.enforceInterfaces(Comparable)(Object) {
    constructor(amount) { super(); this.amount = amount; }
    compareTo(other) { return this.amount - other.amount; }
  }
</script>
```

`examples/demo.html` をブラウザで直接開くと全機能の動作を確認できます。

### Node.js (ESM)

```js
import { createInterface, enforceInterfaces } from './src/index.js';
```

### Node.js (CommonJS)

```js
const OOP = require('./dist/oop-lib.js');
```

## 機能一覧

### 1. インターフェース (`Interface.js`)

メソッドの実装漏れを実行時にチェックします。

```js
const Serializable = createInterface('Serializable', ['toJSON']);

class User extends enforceInterfaces(Serializable)(Object) {
  toJSON() { return { name: this.name }; }
}
new User(); // OK

class Broken extends enforceInterfaces(Serializable)(Object) {}
new Broken(); // InterfaceError: 未実装: toJSON
```

`implementsInterface(instance, iface)` で単純な真偽値チェックも可能です。

### 2. 抽象クラス (`AbstractClass.js`)

直接インスタンス化できないクラスと、サブクラスでの実装が必須なメソッドを定義します。

```js
class Shape extends abstractClass(Object, ['area', 'perimeter']) {
  describe() { return `面積: ${this.area()}`; }
}

class Circle extends Shape {
  constructor(r) { super(); this.r = r; }
  area() { return Math.PI * this.r ** 2; }
  perimeter() { return 2 * Math.PI * this.r; }
}

new Shape();     // AbstractError
new Circle(3);   // OK
```

### 3. Mixin (`Mixin.js`)

多重継承できないJavaScriptで、複数の機能を1つのクラスに合成します。

```js
const Flyable = createMixin({ fly() { return `${this.name}が飛んでいます`; } });
const Swimmable = createMixin({ swim() { return `${this.name}が泳いでいます`; } });

class Animal { constructor(name) { this.name = name; } }
class Duck extends Flyable(Swimmable(Animal)) {}

new Duck('アヒル').fly();
new Duck('アヒル').swim();
```

3つ以上まとめて適用したい場合は `mixin(Base, MixinA, MixinB, MixinC)` も使えます。

### 4. シングルトン (`Singleton.js`)

```js
class ConfigBase { constructor() { this.createdAt = Date.now(); } }
class Config extends singleton(ConfigBase) {}

new Config() === new Config(); // true
Config.resetInstance();        // インスタンスをリセット(テスト用途など)
```

### 5. イベントエミッター (`EventEmitter.js`)

```js
const emitter = new EventEmitter();
emitter.on('level-up', (level) => console.log(`レベル${level}!`));
emitter.emit('level-up', 5);
```

既存クラスにmixinとして追加することもできます: `class Model extends withEventEmitter(Base) {}`

### 6. オブザーバブル (`Observable.js`)

プロパティの変更を検知して自動的にコールバックを呼び出します。

```js
class Player {
  constructor() { observable(this, 'hp', 100); }
}
const p = new Player();
p.onHpChange((newVal, oldVal) => console.log(`${oldVal} -> ${newVal}`));
p.hp = 80; // コールバック発火
```

複数プロパティをまとめて設定する場合は `makeObservable(this, { hp: 100, mp: 50 })` を使います。

### 7. 実行時型チェック (`TypeCheck.js`)

TypeScriptを導入するほどではないが、簡易的な型安全性が欲しい場合に。

```js
const add = typed(['number', 'number'], 'number')((a, b) => a + b);
add(1, 2);     // 3
add(1, '2');   // TypeCheckError
```

型には `'string' | 'number' | 'boolean' | 'function' | 'object' | 'array' | 'any'` の文字列、
またはクラス(コンストラクタ関数)を渡して `instanceof` チェックをすることも可能です。

### 8. 宣言的DSL: `oopjs.class` / `oopjs.init` / `oopjs.method` (`Fluent.js`)

アロー関数だけでクラスを宣言できる実験的なDSLです。次のように、
**宣言していないはずの変数名がそのまま参照できる**のが特徴です。

```js
import { oopjs } from './src/index.js';

oopjs.class("Person", () => {
  oopjs.init("name", () => {
    oopjs.name = name; // "name" は自由変数のはずだが、そのまま使える
  });
  oopjs.init("age", () => {
    oopjs.age = age;
  });
  oopjs.method("greet", () => {
    return `こんにちは、${oopjs.name}です`;
  });
});

const p = new oopjs.Person("Nori", 30);
console.log(p.name, p.age, p.greet());
```

日本語の型名・変数名もそのまま使えます。

```js
oopjs.class("人間", () => {
  oopjs.init("名前", () => { oopjs.名前 = 名前 });
});
const 太郎 = new oopjs.人間("太郎");
```

**仕組み:** `oopjs.init("name", callback)` は `callback` を一度ソースコード化し、
`new Function('oopjs', 'name', 本体)` という形で「`name` を実引数名として持つ
本物の関数」に組み直してから呼び出しています。`with`文やグローバル変数の
汚染は一切使わず、渡された文字列を関数の仮引数名として動的に生成する
だけなので、見た目通りの構文が安全に成立します。

> **注意:** これは実用的な設計というより、JavaScriptの動的な性質を使った
> 実験的なDSLです。Proxyと`new Function`によるソース再構築を使うため、
> 通常の`class`構文に比べてデバッグはしづらくなります。学習用途や
> 遊び心のあるプロトタイプ向けの機能として位置づけています。

`examples/demo-fluent.mjs` で基本の動作例を確認できます。

### 9. `oopjs` DSLで表現できるオブジェクト指向の10要素

`oopjs.class(...)` の中だけで、オブジェクト指向の代表的な10要素を
すべて宣言的に書けます。素の`class`構文には無い機能(多重継承・真の
プライベート・読み取り専用定数・method_missing的フォールバックなど)
も含みます。`examples/demo-oop10.mjs`に全部まとめた動作例があります。

| # | 要素 | API | 素の`class`にはない点 |
|---|------|-----|----------------------|
| 1 | クラス | `oopjs.class(name, body)` | - |
| 2 | カプセル化 | `oopjs.private(name, fn)` | インスタンスに一切プロパティが生えない、真の非公開 |
| 3 | 継承 | `oopjs.extends(...parents)` | 複数指定で**多重継承**ができる |
| 4 | ポリモーフィズム | サブクラスで同名の`oopjs.method`を再定義するだけ | - |
| 5 | インターフェース | `oopjs.implements(iface)` | 実装漏れは**クラス定義した瞬間**にエラーになる |
| 6 | 抽象クラス | `oopjs.abstract(methodName)` | - |
| 7 | ダックタイピング | `oopjsDuck(obj, [...methodNames])` | oopjsクラスにも普通のJSクラスにも使える |
| 8 | トレイト/モジュール | `oopjs.trait(name, body)` + `oopjs.use(...names)` | 継承関係を作らずにメソッド群だけ混ぜ込める |
| 9 | コンポジション | `oopjs.has(name, factory)` | 保持したオブジェクトは自動的に非公開になる |
| 10 | アクセス修飾子 | 何もつけない=public、`oopjs.private`/`oopjs.protected` | 定数(`oopjs.const`)は再代入すると即エラー |

```js
import { oopjs, oopjsDuck } from './src/index.js';
import { createInterface } from './src/Interface.js';

// 5. インターフェース
const Comparable = createInterface("Comparable", ["compareTo"]);

// 6. 抽象クラス + 3. 継承の土台
oopjs.class("Shape", () => {
  oopjs.abstract("area");                 // サブクラスに実装を強制
  oopjs.const("KIND", "shape");           // 読み取り専用の定数
  oopjs.method("describe", () => `面積:${oopjs.area()}`);
});

// 8. トレイト(継承関係を作らずにメソッドだけ混ぜる)
oopjs.trait("Loggable", () => {
  oopjs.method("log", (msg) => console.log(`[LOG] ${msg}`));
});

// 1-4-5 クラス定義 + ポリモーフィズム + インターフェース実装 + トレイト利用
oopjs.class("Circle", () => {
  oopjs.extends("Shape");        // 3. 継承
  oopjs.use("Loggable");         // 8. トレイト利用
  oopjs.implements(Comparable);  // 5. インターフェース実装を宣言
  oopjs.init("r", () => { oopjs.r = r; });          // public
  oopjs.private("id", () => { oopjs.id = Math.random(); }); // 2/10. private
  oopjs.method("area", () => Math.PI * oopjs.r ** 2);       // 4. ポリモーフィズムの実体
  oopjs.method("compareTo", (other) => oopjs.area() - other.area());
});

// 9. コンポジション(継承せず、他のオブジェクトを保持して使う)
oopjs.class("Wheel", () => { oopjs.method("roll", () => "回転中"); });
oopjs.class("Car", () => {
  oopjs.has("wheel", () => new oopjs.Wheel());
  oopjs.method("drive", () => oopjs.wheel.roll());
});

const c = new oopjs.Circle(3);
c.log(`面積は${c.area().toFixed(2)}`);   // トレイトのメソッド
console.log(c.id);                       // undefined (privateなので見えない)

// 7. ダックタイピング(継承関係と無関係にメソッドの有無だけで判定)
class PlainJsCircle { area() { return 1; } }
console.log(oopjsDuck(new PlainJsCircle(), ["area"])); // true
```

> **仕組みの補足:** `oopjs.init` / `oopjs.private` は `() => { oopjs.x = x }`
> のように「宣言されていない自由変数」をそのまま使えるようにするため、
> コールバックを一度ソースコード化して `new Function('oopjs', 'x', 本体)`
> という形に組み直しています。`oopjs.method` / `getter` / `setter` /
> `operator` / `fallback` / `has` は普通に宣言された引数・クロージャで
> 動くので、この特殊な変換は行っていません。
>
> `oopjs.protected` は現状 `oopjs.private` と同じ実装(サブクラスからは
> 参照でき、クラスの外からは見えない)のエイリアスです。「サブクラスにも
> 見せない真のprivate」までは区別していません。

> **注意:** これは実用的な設計というより、JavaScriptの動的な性質を使った
> 実験的なDSLです。Proxyと`new Function`によるソース再構築を使うため、
> 通常の`class`構文に比べてデバッグはしづらくなります。学習用途や
> 遊び心のあるプロトタイプ向けの機能として位置づけています。

## ライセンス

MIT
