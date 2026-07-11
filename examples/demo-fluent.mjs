// oopjs.class / oopjs.init / oopjs.method の宣言的DSLの使用例
// 実行方法: node examples/demo-fluent.mjs
//
// ポイント: oopjs.init("変数名", () => { oopjs.変数名 = 変数名 }) という
// 「書いたまま」の見た目で動く。渡した文字列がそのままコールバックの
// 実引数名として動的に組み直されるため、宣言していないはずの変数が
// 自然に参照できる。

import { oopjs } from '../src/index.js';

// ---- 日本語の型名・変数名でもそのまま書ける ----
oopjs.class("人間", () => {
  oopjs.init("名前", () => {
    oopjs.名前 = 名前;
  });
  oopjs.init("年齢", () => {
    oopjs.年齢 = 年齢;
  });
  oopjs.method("挨拶", () => {
    return `こんにちは、${oopjs.名前}です。${oopjs.年齢}歳です。`;
  });
});

const 太郎 = new oopjs.人間("太郎", 25);
console.log(太郎.名前, 太郎.年齢);
console.log(太郎.挨拶());

// ---- もちろん英語名でも同様 ----
oopjs.class("Player", () => {
  oopjs.init("name", () => {
    oopjs.name = name;
  });
  oopjs.init("hp", () => {
    oopjs.hp = hp;
  });
  oopjs.method("takeDamage", (amount) => {
    oopjs.hp = oopjs.hp - amount;
    return oopjs.hp;
  });
});

const player = new oopjs.Player("Nori", 100);
console.log(player.name, player.hp);
console.log("残りHP:", player.takeDamage(30));

// ---- 使い方を誤るとエラーメッセージで教えてくれる ----
try {
  oopjs.init("x", () => {
    oopjs.x = x;
  });
} catch (err) {
  console.log("エラー捕捉:", err.message);
}
