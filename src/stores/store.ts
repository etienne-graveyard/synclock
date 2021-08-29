import { Store, ValOrUpdateFn, SYNCLOCK, Callback, ValueCallback } from '../types';
import { Subscription, Unsubscribe } from 'suub';
import { Clock } from '../Clock';

export function store<State>(initial: State): Store<ValOrUpdateFn<State>, State> {
  const clock = Clock();
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
    [SYNCLOCK]: { clock, tick },
    emit,
    get: () => state,
    sub: subscribe,
    destroy
  };

  function subscribe(cb: ValueCallback<State>, onUnsub?: Callback): Callback {
    if (destroyed) {
      throw new Error('Destroyed');
    }
    return sub.subscribe(cb, onUnsub);
  }

  function destroy() {
    if (destroyed) {
      return;
    }
    unsubClock();
    sub.unsubscribeAll();
  }

  function emit(state: ValOrUpdateFn<State>) {
    if (typeof state !== 'function') {
      nextState = state;
    } else {
      nextState = (state as any)(nextState);
    }
    clock.emit();
  }
}
