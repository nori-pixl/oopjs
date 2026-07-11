/**
 * Fluent.js
 *
 * oopjs.class("型の名前", () => {
 *   oopjs.init("変数名", () => { oopjs.変数名 = 変数名 })
 * })
 *
 * という「見た目そのまま」で動く宣言的DSL。
 * オブジェクト指向の代表的な10要素をすべてこのDSLの中で表現できるようにしてある。
 *
 *  1. クラス          oopjs.class(name, body)
 *  2. カプセル化      oopjs.private(name, fn) / oopjs.protected(name, fn)
 *  3. 継承            oopjs.extends(...parents)  ※複数指定で多重継承も可
 *  4. ポリモーフィズム  同名メソッドをサブクラスで再定義すれば自動的に多態動作する
 *  5. インターフェース  oopjs.implements(...interfaces)
 *  6. 抽象クラス       oopjs.abstract(methodName)
 *  7. ダックタイピング  oopjs.duck(obj, [...methodNames])
 *  8. トレイト/モジュール oopjs.trait(name, body) + oopjs.use(...traitNames)
 *  9. コンポジション    oopjs.has(name, factory)
 * 10. アクセス修飾子    public(デフォルト) / oopjs.private / oopjs.protected
 *
 * 「変数名がそのまま使える」魔法は oopjs.init だけに使っている。
 * コールバックが `() => { oopjs.x = x }` のように引数を取らない形で書かれ、
 * `x` がどこにも宣言されていない自由変数だから — その場合だけコールバックを
 * ソースコード化し `new Function('oopjs', 'x', 本体)` という「xを実引数名として
 * 持つ本物の関数」に組み直して解決している。他のAPI(method/getter/setter/
 * operator/fallback/has/trait)は普通に宣言された引数やクロージャで動くので
 * 魔法は不要。
 */

class FluentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FluentError';
  }
}

class AbstractDslError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AbstractDslError';
  }
}

function extractArrowBody(fn) {
  const src = fn.toString();
  const blockMatch = src.match(/=>\s*\{([\s\S]*)\}\s*$/);
  if (blockMatch) return blockMatch[1];
  const exprMatch = src.match(/=>\s*([\s\S]*?);?\s*$/);
  if (exprMatch) return `return (${exprMatch[1]});`;
  throw new FluentError(`アロー関数の解析に失敗しました: ${src}`);
}

function isValidIdentifier(name) {
  return typeof name === 'string' && /^[$A-Za-z_\u00A0-\uFFFF][$\w\u00A0-\uFFFF]*$/.test(name);
}

function emptyDef() {
  return {
    fields: [],
    privateInits: [],
    methods: {},
    getters: {},
    setters: {},
    staticProps: {},
    staticMethods: {},
    consts: {},
    privateNames: new Set(),
    constNames: new Set(),
    operators: {},
    parentNames: [],
    traitNames: [],
    interfaces: [],
    abstractMethods: new Set(),
    fallbackFn: null,
  };
}

/** def(親/トレイト)の内容を dest にマージする(dest側は上書き優先で後からマージする) */
function mergeInto(dest, src) {
  dest.fields.push(...src.fields);
  dest.privateInits.push(...src.privateInits);
  Object.assign(dest.methods, src.methods);
  Object.assign(dest.getters, src.getters);
  Object.assign(dest.setters, src.setters);
  Object.assign(dest.staticProps, src.staticProps);
  Object.assign(dest.staticMethods, src.staticMethods);
  Object.assign(dest.consts, src.consts);
  src.privateNames.forEach((n) => dest.privateNames.add(n));
  src.constNames.forEach((n) => dest.constNames.add(n));
  Object.assign(dest.operators, src.operators);
  if (src.abstractMethods) src.abstractMethods.forEach((m) => dest.abstractMethods.add(m));
  if (src.fallbackFn) dest.fallbackFn = src.fallbackFn;
}

export function createOopjs() {
  const metaRegistry = {}; // typeName -> 生成後のmeta(継承チェーン解決用)
  const classRegistry = {}; // typeName -> 生成されたクラス(Proxyの場合あり)
  const traitRegistry = {}; // traitName -> def(トレイト定義)
  const privateStorage = new WeakMap(); // instance -> { フィールド名: 値 }
  const defStack = []; // oopjs.class / oopjs.trait 実行中の定義バッファ
  const activeStack = []; // 実行時の { instance, meta }

  function currentDef() {
    return defStack[defStack.length - 1];
  }
  function currentActive() {
    return activeStack[activeStack.length - 1];
  }
  function requireDef(apiName) {
    const def = currentDef();
    if (!def) {
      throw new FluentError(`oopjs.${apiName}() は oopjs.class() または oopjs.trait() のボディ内で呼び出してください。`);
    }
    return def;
  }

  const oopjsProxy = new Proxy(function () {}, {
    get(target, prop) {
      switch (prop) {
        case 'class': return defineClass;
        case 'trait': return defineTrait;
        case 'use': return defineUse;
        case 'init': return defineInit;
        case 'private': return definePrivate;
        case 'protected': return definePrivate; // 意味的なエイリアス(詳細はREADME参照)
        case 'has': return defineHas;
        case 'method': return defineMethod;
        case 'getter': return defineGetter;
        case 'setter': return defineSetter;
        case 'const': return defineConst;
        case 'static': return defineStatic;
        case 'extends': return defineExtends;
        case 'implements': return defineImplements;
        case 'abstract': return defineAbstract;
        case 'operator': return defineOperator;
        case 'fallback': return defineFallback;
        case 'op': return op;
        case 'duck': return duck;
        default: break;
      }

      const ctx = currentActive();
      if (ctx) {
        if (ctx.meta.privateNames.has(prop)) {
          const store = privateStorage.get(ctx.instance);
          return store ? store[prop] : undefined;
        }
        if (ctx.instance && prop in ctx.instance) {
          const val = ctx.instance[prop];
          return typeof val === 'function' ? val.bind(ctx.instance) : val;
        }
        if (ctx.meta.classRef && prop in ctx.meta.classRef) {
          return ctx.meta.classRef[prop];
        }
      }
      if (prop in classRegistry) return classRegistry[prop];
      return undefined;
    },
    set(target, prop, value) {
      const ctx = currentActive();
      if (!ctx) {
        throw new FluentError(
          `oopjs.${String(prop)} への代入は oopjs.init/private/method/getter/setter/static のコールバック内でのみ有効です。`
        );
      }
      if (ctx.meta.constNames.has(prop)) {
        throw new FluentError(`"${String(prop)}" は oopjs.const() で定義された定数のため再代入できません。`);
      }
      if (ctx.meta.privateNames.has(prop)) {
        let store = privateStorage.get(ctx.instance);
        if (!store) {
          store = {};
          privateStorage.set(ctx.instance, store);
        }
        store[prop] = value;
        return true;
      }
      if (!ctx.instance) {
        ctx.meta.classRef[prop] = value; // 静的メソッド文脈
        return true;
      }
      ctx.instance[prop] = value;
      return true;
    },
  });

  // ---------------- 2. トレイト/モジュール ----------------
  function defineTrait(traitName, bodyFn) {
    if (typeof traitName !== 'string' || !traitName) {
      throw new FluentError('oopjs.trait() の第1引数には名前の文字列を指定してください。');
    }
    const def = emptyDef();
    defStack.push(def);
    try {
      bodyFn();
    } finally {
      defStack.pop();
    }
    traitRegistry[traitName] = def;
    return def;
  }

  function defineUse(...traitNames) {
    const def = requireDef('use');
    def.traitNames.push(...traitNames);
  }

  // ---------------- 1. クラス ----------------
  function defineClass(typeName, bodyFn) {
    if (typeof typeName !== 'string' || !typeName) {
      throw new FluentError('oopjs.class() の第1引数にはクラス名の文字列を指定してください。');
    }
    if (typeof bodyFn !== 'function') {
      throw new FluentError('oopjs.class() の第2引数には () => {...} 形式の関数を指定してください。');
    }

    const def = emptyDef();
    defStack.push(def);
    try {
      bodyFn();
    } finally {
      defStack.pop();
    }

    // ---- 3. 継承(複数指定なら多重継承) ----
    const merged = emptyDef();
    for (const parentRef of def.parentNames) {
      const parentName = typeof parentRef === 'string' ? parentRef : parentRef.__oopjsName;
      const parentMeta = metaRegistry[parentName];
      if (!parentMeta) {
        throw new FluentError(`oopjs.extends("${parentName}"): そのようなクラスは見つかりません。先に定義してください。`);
      }
      mergeInto(merged, parentMeta.def);
    }
    // ---- 8. トレイトの合成(継承より弱い優先度、自分自身より強い優先度は無い) ----
    for (const traitName of def.traitNames) {
      const traitDef = traitRegistry[traitName];
      if (!traitDef) {
        throw new FluentError(`oopjs.use("${traitName}"): そのようなトレイトは見つかりません。先に oopjs.trait("${traitName}", ...) を定義してください。`);
      }
      mergeInto(merged, traitDef);
    }
    // ---- 自分自身の定義で上書き ----
    mergeInto(merged, def);

    // ---- 6. 抽象メソッド未実装チェック用データ ----
    const unimplementedAbstracts = [...merged.abstractMethods].filter((m) => !(m in merged.methods));

    const meta = {
      name: typeName,
      def: merged, // 継承チェーン解決のため、マージ後の定義そのものを保持しておく
      fields: merged.fields,
      privateInits: merged.privateInits,
      methods: merged.methods,
      getters: merged.getters,
      setters: merged.setters,
      privateNames: merged.privateNames,
      constNames: merged.constNames,
      operators: merged.operators,
      fallbackFn: merged.fallbackFn,
      unimplementedAbstracts,
      classRef: null,
    };

    // ---- 5. インターフェース実装チェック(クラス定義時点で即座に検査) ----
    for (const ifaceSpec of def.interfaces) {
      const required = Array.isArray(ifaceSpec) ? ifaceSpec : ifaceSpec.methods;
      const ifaceName = Array.isArray(ifaceSpec) ? '(無名インターフェース)' : (ifaceSpec.name || '(無名インターフェース)');
      const missing = required.filter((m) => !(m in merged.methods));
      if (missing.length > 0) {
        throw new FluentError(
          `"${typeName}" はインターフェース "${ifaceName}" を満たしていません。未実装: ${missing.join(', ')}`
        );
      }
    }

    class Generated {
      constructor(...args) {
        if (meta.unimplementedAbstracts.length > 0) {
          throw new AbstractDslError(
            `"${typeName}" は抽象メソッド ${meta.unimplementedAbstracts.map((m) => `"${m}()"`).join(', ')} が未実装のためインスタンス化できません。`
          );
        }
        privateStorage.set(this, {});
        activeStack.push({ instance: this, meta });
        try {
          meta.fields.forEach((field, i) => field.run(oopjsProxy, args[i]));
          meta.privateInits.forEach((field) => field.run(oopjsProxy));
        } finally {
          activeStack.pop();
        }
      }
    }
    Object.defineProperty(Generated, 'name', { value: typeName });
    Generated.__oopjsName = typeName;

    for (const [k, v] of Object.entries(merged.consts)) {
      Object.defineProperty(Generated, k, { value: v, writable: false, enumerable: true, configurable: false });
    }
    for (const [k, v] of Object.entries(merged.staticProps)) {
      Generated[k] = v;
    }
    for (const [sname, fn] of Object.entries(merged.staticMethods)) {
      Generated[sname] = function (...args) {
        activeStack.push({ instance: null, meta });
        try {
          return fn.apply(Generated, args);
        } finally {
          activeStack.pop();
        }
      };
    }
    // ---- 4. ポリモーフィズム: 同名メソッドは merged.methods の時点で
    //         「継承元 → トレイト → 自分自身」の順に上書きされているので、
    //         サブクラスごとに違う実装を持たせるだけで自然に多態動作する ----
    for (const [iname, fn] of Object.entries(merged.methods)) {
      Generated.prototype[iname] = function (...args) {
        activeStack.push({ instance: this, meta });
        try {
          return fn.apply(this, args);
        } finally {
          activeStack.pop();
        }
      };
    }
    const accessorNames = new Set([...Object.keys(merged.getters), ...Object.keys(merged.setters)]);
    for (const aname of accessorNames) {
      const getFn = merged.getters[aname];
      const setFn = merged.setters[aname];
      Object.defineProperty(Generated.prototype, aname, {
        configurable: true,
        enumerable: true,
        get: getFn
          ? function () {
              activeStack.push({ instance: this, meta });
              try {
                return getFn.call(this);
              } finally {
                activeStack.pop();
              }
            }
          : undefined,
        set: setFn
          ? function (value) {
              activeStack.push({ instance: this, meta });
              try {
                setFn.call(this, value);
              } finally {
                activeStack.pop();
              }
            }
          : undefined,
      });
    }

    meta.classRef = Generated;

    let ExportedClass = Generated;
    if (meta.fallbackFn) {
      const fallbackFn = meta.fallbackFn;
      ExportedClass = new Proxy(Generated, {
        construct(target, args) {
          const instance = new target(...args);
          return new Proxy(instance, {
            get(obj, prop, receiver) {
              if (prop in obj) return Reflect.get(obj, prop, receiver);
              activeStack.push({ instance: obj, meta });
              try {
                return fallbackFn.call(obj, prop);
              } finally {
                activeStack.pop();
              }
            },
          });
        },
      });
      ExportedClass.__oopjsName = typeName;
    }

    metaRegistry[typeName] = meta;
    classRegistry[typeName] = ExportedClass;
    return ExportedClass;
  }

  // ---------------- oopjs.init ----------------
  function defineInit(varName, callback) {
    const def = requireDef('init');
    if (!isValidIdentifier(varName)) {
      throw new FluentError(`oopjs.init() の第1引数 "${varName}" は有効な変数名ではありません。`);
    }
    const body = extractArrowBody(callback);
    let fn;
    try {
      fn = new Function('oopjs', varName, body);
    } catch (e) {
      throw new FluentError(`oopjs.init("${varName}", ...) の中身を解析できませんでした: ${e.message}`);
    }
    def.fields.push({ name: varName, run: (oopjsRef, value) => fn(oopjsRef, value) });
  }

  // ---------------- 2/10. カプセル化・アクセス修飾子: oopjs.private / oopjs.protected ----------------
  function definePrivate(varName, callback) {
    const def = requireDef('private');
    if (!isValidIdentifier(varName)) {
      throw new FluentError(`oopjs.private()/protected() の第1引数 "${varName}" は有効な変数名ではありません。`);
    }
    def.privateNames.add(varName);
    const body = extractArrowBody(callback);
    let fn;
    try {
      fn = new Function('oopjs', varName, `${body}\nreturn typeof ${varName} === 'undefined' ? undefined : ${varName};`);
    } catch (e) {
      throw new FluentError(`oopjs.private("${varName}", ...) の中身を解析できませんでした: ${e.message}`);
    }
    def.privateInits.push({
      name: varName,
      run(oopjsRef) {
        const returned = fn(oopjsRef, undefined);
        if (typeof returned !== 'undefined') {
          oopjsRef[varName] = returned;
        }
      },
    });
  }

  // ---------------- 9. コンポジション: oopjs.has(name, factory) ----------------
  // 「継承」ではなく「他のオブジェクトを属性として持つ」形の設計を簡潔に書くための糖衣構文。
  // 内部的には非公開フィールドとして保持し、oopjs.method内から oopjs.name で参照して委譲する。
  function defineHas(name, factory) {
    const def = requireDef('has');
    if (!isValidIdentifier(name)) {
      throw new FluentError(`oopjs.has() の第1引数 "${name}" は有効な名前ではありません。`);
    }
    if (typeof factory !== 'function') {
      throw new FluentError('oopjs.has() の第2引数には、保持したいオブジェクトを返す関数を指定してください。');
    }
    def.privateNames.add(name);
    def.privateInits.push({
      name,
      run(oopjsRef) {
        oopjsRef[name] = factory();
      },
    });
  }

  // ---------------- oopjs.method ----------------
  function defineMethod(methodName, callback) {
    const def = requireDef('method');
    def.methods[methodName] = callback;
  }

  // ---------------- oopjs.getter / oopjs.setter ----------------
  function defineGetter(propName, callback) {
    const def = requireDef('getter');
    def.getters[propName] = callback;
  }
  function defineSetter(propName, callback) {
    const def = requireDef('setter');
    def.setters[propName] = callback;
  }

  // ---------------- oopjs.const / oopjs.static ----------------
  function defineConst(cname, value) {
    const def = requireDef('const');
    if (!isValidIdentifier(cname)) {
      throw new FluentError(`oopjs.const() の第1引数 "${cname}" は有効な名前ではありません。`);
    }
    def.consts[cname] = value;
    def.constNames.add(cname);
  }
  function defineStatic(sname, valueOrFn) {
    const def = requireDef('static');
    if (typeof valueOrFn === 'function') {
      def.staticMethods[sname] = valueOrFn;
    } else {
      def.staticProps[sname] = valueOrFn;
    }
  }

  // ---------------- 3. 継承 ----------------
  function defineExtends(...parents) {
    const def = requireDef('extends');
    def.parentNames.push(...parents);
  }

  // ---------------- 5. インターフェース ----------------
  // createInterface() で作った { name, methods } オブジェクト、もしくは
  // 単純な文字列配列 ["foo", "bar"] のどちらでも受け付ける。
  function defineImplements(...ifaceSpecs) {
    const def = requireDef('implements');
    def.interfaces.push(...ifaceSpecs);
  }

  // ---------------- 6. 抽象クラス ----------------
  function defineAbstract(methodName) {
    const def = requireDef('abstract');
    if (!isValidIdentifier(methodName)) {
      throw new FluentError(`oopjs.abstract() の引数 "${methodName}" は有効なメソッド名ではありません。`);
    }
    def.abstractMethods.add(methodName);
  }

  // ---------------- oopjs.operator ----------------
  function defineOperator(symbol, callback) {
    const def = requireDef('operator');
    def.operators[symbol] = callback;
  }
  function op(a, symbol, b) {
    const cname = a && a.constructor && a.constructor.__oopjsName;
    const meta = cname && metaRegistry[cname];
    if (!meta || !meta.operators[symbol]) {
      throw new FluentError(`"${symbol}" 演算子は ${a && a.constructor && a.constructor.name} に定義されていません。`);
    }
    activeStack.push({ instance: a, meta });
    try {
      return meta.operators[symbol].call(a, b);
    } finally {
      activeStack.pop();
    }
  }

  // ---------------- oopjs.fallback (method_missing相当) ----------------
  function defineFallback(callback) {
    const def = requireDef('fallback');
    def.fallbackFn = callback;
  }

  // ---------------- 7. ダックタイピング ----------------
  // クラスの継承関係やinstanceofに関係なく、必要なメソッドさえ持っていれば
  // 「同種」として扱えるかを判定する。oopjsクラスのインスタンスにも、
  // 普通のオブジェクト/クラスにも使える。
  function duck(obj, methodNames) {
    if (!obj || typeof obj !== 'object') return false;
    return methodNames.every((m) => typeof obj[m] === 'function');
  }

  return oopjsProxy;
}

export const oopjs = createOopjs();
export const oopjsOp = oopjs.op;
export const oopjsDuck = oopjs.duck;
export { FluentError, AbstractDslError };
