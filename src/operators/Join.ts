import { Subscription } from 'suub';
import { Value, Callback, ExtractValues, SYNCLOCK } from '../types';
import { mergeClocks } from '../Clock';

export function join<T extends { [key: string]: Value<any> }>(deps: T): Value<ExtractValues<T>> {
  const clock = mergeClocks(...Array.from(Object.values(deps)).map(v => v[SYNCLOCK]));
  const tick = 0;
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
    [SYNCLOCK]: { tick, clock },
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
