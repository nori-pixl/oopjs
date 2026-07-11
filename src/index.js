/**
 * oop-lib
 * JavaScriptのオブジェクト指向を強化する軽量ライブラリ。
 * 依存ライブラリなし、ESモジュールとして利用可能。
 */

export {
  InterfaceError,
  createInterface,
  implementsInterface,
  enforceInterfaces,
} from './Interface.js';

export {
  AbstractError,
  abstractClass,
  abstractMethod,
} from './AbstractClass.js';

export {
  mixin,
  createMixin,
  mixClasses,
} from './Mixin.js';

export {
  singleton,
} from './Singleton.js';

export {
  EventEmitter,
  withEventEmitter,
} from './EventEmitter.js';

export {
  observable,
  makeObservable,
} from './Observable.js';

export {
  TypeCheckError,
  typed,
  typedMethod,
} from './TypeCheck.js';

export {
  createOopjs,
  oopjs,
  oopjsOp,
  oopjsDuck,
  FluentError,
  AbstractDslError,
} from './Fluent.js';
