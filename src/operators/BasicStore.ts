import { Store, RIPOST_TICK } from '../types';
import { Clock } from '../Clock';
import { Subscription } from 'suub';

export function BasicStore<State>(
  clock: Clock,
  initial: State
): Store<State | ((prev: State) => State), State> {
  const tick = 0;
  const sub = Subscription<State>() as Subscription<State>;

  let state: State = initial;
  let nextState: State = initial;
  let destroyed = false;

  const unsubClock = clock.subscribe(tick, () => {
    if (destroyed) {
      return;
    }
    if (state !== nextState) {
      state = nextState;
      sub.emit(state);
    }
  });

  return {
    [RIPOST_TICK]: tick,
    emit,
    get: () => state,
    sub: (cb, onUnsub) => {
      if (destroyed) {
        throw new Error('Destroyed');
      }
      return sub.subscribe(cb, onUnsub);
    },
    destroy
  };

  function destroy() {
    if (destroyed) {
      return;
    }
    unsubClock();
    sub.unsubscribeAll();
  }

  function emit(state: State | ((prev: State) => State)) {
    if (typeof state !== 'function') {
      nextState = state;
    } else {
      nextState = (state as any)(nextState);
    }
    clock.emit();
  }
}
