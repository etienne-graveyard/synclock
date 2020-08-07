import { Clock } from '../Clock';
import { Value, Destroyable, RIPOST_TICK } from '../types';

export function Watch<T>(clock: Clock, store: Value<T>, onEmit: (value: T) => void): Destroyable {
  const tick = store[RIPOST_TICK] + 1;
  let state: T = store.get();
  let nextState: T = state;

  const unsubClock = clock.subscribe(tick, () => {
    if (nextState !== state) {
      state = nextState;
      onEmit(state);
    }
  });

  const unsubStore = store.sub((val) => {
    nextState = val;
  });

  return {
    destroy: () => {
      unsubClock();
      unsubStore();
    },
  };
}
