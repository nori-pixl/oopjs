// オブジェクト指向の代表的な10要素をすべてoopjs DSLで表現するデモ。
// 実行方法: node examples/demo-oop10.mjs

import { oopjs, oopjsDuck, AbstractDslError, FluentError } from '../src/index.js';
import { createInterface } from '../src/Interface.js';

console.log('========== 1. クラス ==========');
oopjs.class("Animal", () => {
  oopjs.init("name", () => { oopjs.name = name; });
  oopjs.method("speak", () => `${oopjs.name}が鳴きます`);
});
const pochi = new oopjs.Animal("ぽち");
const tama = new oopjs.Animal("たま");
console.log(pochi.speak());
console.log(tama.speak());
console.log("→ 同じ設計図(Animal)からインスタンスを何個でも量産できる");

console.log('\n========== 2. カプセル化 / 10. アクセス修飾子 ==========');
oopjs.class("BankAccount", () => {
  oopjs.init("owner", () => { oopjs.owner = owner; });      // public
  oopjs.private("balance", () => { oopjs.balance = 0; });   // private
  oopjs.method("deposit", (amount) => {
    if (amount <= 0) throw new Error("入金額は正の数にしてください");
    oopjs.balance = oopjs.balance + amount;
  });
  oopjs.method("getBalance", () => oopjs.balance);
});
const account = new oopjs.BankAccount("太郎");
account.deposit(1000);
console.log("残高(メソッド経由):", account.getBalance());
console.log("balanceに直接アクセス:", account.balance, "← 外からは見えない(隠蔽されている)");

console.log('\n========== 3. 継承(多重継承も可能) ==========');
oopjs.class("Flyer", () => { oopjs.method("fly", () => "空を飛ぶ"); });
oopjs.class("Swimmer", () => { oopjs.method("swim", () => "水中を泳ぐ"); });
oopjs.class("Duck", () => {
  oopjs.extends("Flyer", "Swimmer"); // 素のJSでは書けない多重継承
  oopjs.init("name", () => { oopjs.name = name; });
  oopjs.method("quack", () => `${oopjs.name}: ガーガー`);
});
const duck = new oopjs.Duck("ドナルド");
console.log(duck.fly(), "/", duck.swim(), "/", duck.quack());

console.log('\n========== 4. ポリモーフィズム ==========');
oopjs.class("Shape", () => { oopjs.method("area", () => 0); });
oopjs.class("Circle", () => {
  oopjs.extends("Shape");
  oopjs.init("r", () => { oopjs.r = r; });
  oopjs.method("area", () => Math.PI * oopjs.r ** 2);
});
oopjs.class("Rectangle", () => {
  oopjs.extends("Shape");
  oopjs.init("w", () => { oopjs.w = w; });
  oopjs.init("h", () => { oopjs.h = h; });
  oopjs.method("area", () => oopjs.w * oopjs.h);
});
const shapes = [new oopjs.Circle(2), new oopjs.Rectangle(3, 4)];
for (const s of shapes) {
  console.log(`${s.constructor.name} の面積: ${s.area().toFixed(2)}`);
}

console.log('\n========== 5. インターフェース ==========');
const Comparable = createInterface("Comparable", ["compareTo"]);
oopjs.class("Money", () => {
  oopjs.implements(Comparable);
  oopjs.init("amount", () => { oopjs.amount = amount; });
  oopjs.method("compareTo", (other) => oopjs.amount - other.amount);
});
console.log("Money は Comparable を満たすので定義できた:", !!oopjs.Money);
try {
  oopjs.class("BrokenMoney", () => {
    oopjs.implements(Comparable); // compareTo を実装していない
  });
} catch (e) {
  console.log("実装漏れは定義時にエラーになる:", e.message);
}

console.log('\n========== 6. 抽象クラス ==========');
oopjs.class("AbstractShape", () => {
  oopjs.abstract("area");
  oopjs.abstract("perimeter");
  oopjs.method("describe", () => `面積:${oopjs.area()} 周囲:${oopjs.perimeter()}`);
});
oopjs.class("Square", () => {
  oopjs.extends("AbstractShape");
  oopjs.init("side", () => { oopjs.side = side; });
  oopjs.method("area", () => oopjs.side ** 2);
  oopjs.method("perimeter", () => oopjs.side * 4);
});
try {
  new oopjs.AbstractShape();
} catch (e) {
  console.log("抽象クラスは直接生成できない:", e.message, `(${e instanceof AbstractDslError})`);
}
console.log(new oopjs.Square(3).describe());

console.log('\n========== 7. ダックタイピング ==========');
class NativeJSBird {
  fly() { return "生粋のJSクラスも飛べます"; }
}
console.log("継承関係が無くても fly() があれば「飛べるもの」として扱える:");
console.log(" NativeJSBird:", oopjsDuck(new NativeJSBird(), ["fly"]));
console.log(" oopjsのDuck:", oopjsDuck(duck, ["fly", "swim"]));
console.log(" oopjsのSquare(flyが無い):", oopjsDuck(new oopjs.Square(1), ["fly"]));

console.log('\n========== 8. トレイト / モジュール ==========');
oopjs.trait("Loggable", () => {
  oopjs.method("log", (msg) => console.log(`[LOG] ${msg}`));
});
oopjs.trait("Timestamped", () => {
  oopjs.method("timestamp", () => new Date(2026, 6, 11).toDateString());
});
oopjs.class("OrderService", () => {
  oopjs.use("Loggable", "Timestamped"); // 継承ではなく機能の部品化・混ぜ込み
  oopjs.method("placeOrder", () => {
    oopjs.log(`注文完了 (${oopjs.timestamp()})`);
  });
});
new oopjs.OrderService().placeOrder();

console.log('\n========== 9. コンポジション ==========');
oopjs.class("Engine", () => {
  oopjs.method("start", () => "エンジン始動");
});
oopjs.class("Car", () => {
  oopjs.has("engine", () => new oopjs.Engine()); // 継承ではなく「持つ」関係
  oopjs.method("drive", () => `${oopjs.engine.start()} → 走行開始`);
});
console.log(new oopjs.Car().drive());

console.log('\n========== まとめ ==========');
console.log("10個の要素すべてを oopjs.class(...) の中の宣言的なアロー関数だけで表現しました。");
