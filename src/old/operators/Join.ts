import { Subscription } from 'suub';
import { Value, Callback, SYNCLOCK_TICK, ExtractValues } from '../types';
import { Clock } from '../Clock';

export function Join<T extends { [key: string]: Value<any> }>(
  clock: Clock,
  deps: T
): Value<ExtractValues<T>> {
  const tick =
    Array.from(Object.values(deps)).reduce((acc, v) => Math.max(acc, v[SYNCLOCK_TICK]), 0) + 1;
  const sub = Subscription<ExtractValues<T>>() as Subscription<ExtractValues<T>>;
  let state: ExtractValues<T> = Object.keys(deps).reduce<ExtractValues<T>>((acc, key) => {
    if (!deps[key]) {
      console.warn('Error in ', key);
    }
    (acc as any)[key] = deps[key].get();
    return acc;
  }, {} as any);
  let nextState = state;
  let destroyed = false;

  const unsubClock = clock.subscribe(tick, () => {
    if (destroyed) {
      return;
    }
    if (nextState !== state) {
      state = nextState;
      sub.emit(state);
    }
  });

  const unsubParents = subDeps();

  function subDeps(): Callback {
    let unsubs: Array<Callback> = [];
    Object.keys(deps).forEach(key => {
      unsubs.push(
        deps[key].sub(
          value => {
            if (nextState[key] !== value) {
              nextState = {
                ...nextState,
                [key]: value
              };
            }
          },
          () => {
            destroy();
          }
        )
      );
    });
    return () => {
      unsubs.forEach(unsub => {
        unsub();
      });
    };
  }

  function destroy() {
    if (destroyed) {
      return;
    }
    unsubClock();
    sub.unsubscribeAll();
    unsubParents();
  }

  return {
    [SYNCLOCK_TICK]: tick,
    get: () => state,
    sub: (cb, onUnsub) => {
      if (destroyed) {
        throw new Error('Destroyed');
      }
      return sub.subscribe(cb, onUnsub);
    },
    destroy
  };
}
