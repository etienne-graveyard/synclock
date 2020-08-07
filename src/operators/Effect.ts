import { Clock } from '../Clock';
import { Value, Destroyable, SYNCLOCK_TICK } from '../types';

export function Effect<T>(clock: Clock, store: Value<T>, onEmit: (value: T) => void): Destroyable {
  const tick = store[SYNCLOCK_TICK] + 1;
  let state: T = store.get();
  let nextState: T = state;

  const unsubClock = clock.subscribe(tick, () => {
    if (nextState !== state) {
      state = nextState;
      onEmit(state);
    }
  });

  const unsubStore = store.sub(val => {
    nextState = val;
  });

  onEmit(state);

  return {
    destroy: () => {
      unsubClock();
      unsubStore();
    }
  };
}
