/**
 * EventEmitter.js
 * クラスにイベント発行・購読機能を追加する。
 * 単体クラスとしても、mixinとしても利用可能。
 */

export class EventEmitter {
  #listeners = new Map();

  on(event, handler) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  once(event, handler) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      handler.apply(this, args);
    };
    return this.on(event, wrapper);
  }

  off(event, handler) {
    this.#listeners.get(event)?.delete(handler);
  }

  emit(event, ...args) {
    this.#listeners.get(event)?.forEach((handler) => handler.apply(this, args));
  }

  removeAllListeners(event) {
    if (event) {
      this.#listeners.delete(event);
    } else {
      this.#listeners.clear();
    }
  }

  listenerCount(event) {
    return this.#listeners.get(event)?.size ?? 0;
  }
}

/**
 * 既存のクラスにEventEmitterの機能をmixinとして追加する。
 * 使い方:
 *   class Model extends withEventEmitter(Base) { ... }
 */
export function withEventEmitter(Base = Object) {
  return class extends Base {
    #listeners = new Map();

    on(event, handler) {
      if (!this.#listeners.has(event)) {
        this.#listeners.set(event, new Set());
      }
      this.#listeners.get(event).add(handler);
      return () => this.off(event, handler);
    }

    once(event, handler) {
      const wrapper = (...args) => {
        this.off(event, wrapper);
        handler.apply(this, args);
      };
      return this.on(event, wrapper);
    }

    off(event, handler) {
      this.#listeners.get(event)?.delete(handler);
    }

    emit(event, ...args) {
      this.#listeners.get(event)?.forEach((handler) => handler.apply(this, args));
    }

    removeAllListeners(event) {
      if (event) {
        this.#listeners.delete(event);
      } else {
        this.#listeners.clear();
      }
    }

    listenerCount(event) {
      return this.#listeners.get(event)?.size ?? 0;
    }
  };
}
