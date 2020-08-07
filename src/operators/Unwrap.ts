import { Subscription } from 'suub';
import { Value, RIPOST_TICK, Callback } from '../types';
import { Clock } from '../Clock';

export function Unwrap<T>(clock: Clock, parent: Value<Value<T> | null>): Value<T | null> {
  const tick = parent[RIPOST_TICK] + 1;
  const sub = Subscription<T | null>() as Subscription<T | null>;
  let unsubStore: Callback | null = null;
  let destroyed = false;

  let store = parent.get();
  let nextStore = store;

  let state: T | null = nextStore === null ? null : nextStore.get();
  let nextState: T | null = state;

  const unsubParent = parent.sub((parent) => {
    nextStore = parent;
  }, destroy);

  const unsubClock = clock.subscribe(tick, () => {
    if (destroyed) {
      return;
    }
    if (store !== nextStore) {
      updateStore(nextStore);
    }
  });

  const childStoreTick = store === null ? 0 : store[RIPOST_TICK] + 1;
  const childTick = Math.max(tick + 1, childStoreTick);
  const unsubStoreClock = clock.subscribe(childTick, onTickChild);

  function onTickChild() {
    if (state !== nextState) {
      state = nextState;
      sub.emit(state);
    }
  }

  function updateStore(newStore: Value<T> | null) {
    nextStore = newStore;
    store = newStore;
    if (unsubStore !== null) {
      unsubStore();
      unsubStore = null;
    }
    if (newStore !== null) {
      unsubStore = newStore.sub(
        (v) => {
          nextState = v;
        },
        () => {
          updateStore(null);
        }
      );
      nextState = newStore.get();
      const childTick = Math.max(tick + 1, newStore[RIPOST_TICK] + 1);
      // update sub tick
      clock.subscribe(childTick, onTickChild);
    } else {
      nextState = null;
    }
  }

  function destroy() {
    if (destroyed) {
      return;
    }
    unsubStoreClock();
    unsubClock();
    sub.unsubscribeAll();
    unsubParent();
  }

  return {
    [RIPOST_TICK]: tick,
    get: () => state,
    sub: (cb, onUnsub) => {
      if (destroyed) {
        throw new Error('Destroyed');
      }
      return sub.subscribe(cb, onUnsub);
    },
    destroy,
  };
}
