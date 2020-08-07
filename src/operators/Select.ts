import { Subscription } from 'suub';
import { Value, RIPOST_TICK } from '../types';
import { Clock } from '../Clock';

export function Select<Parent, State>(
  clock: Clock,
  parent: Value<Parent>,
  selector: (parent: Parent) => State,
  equal: (l: State, r: State) => boolean = (l, r) => l === r
): Value<State> {
  const tick = parent[RIPOST_TICK] + 1;
  const sub = Subscription<State>() as Subscription<State>;
  let parentValue = parent.get();
  let nextParentValue = parentValue;
  let state = selector(parentValue);
  let destroyed = false;

  const unsubClock = clock.subscribe(tick, () => {
    if (destroyed) {
      return;
    }
    if (parentValue !== nextParentValue) {
      parentValue = nextParentValue;
      const nextState = selector(parentValue);
      if (equal(nextState, state) === false) {
        state = nextState;
        sub.emit(state);
      }
    }
  });

  const unsubParent = parent.sub((parent) => {
    nextParentValue = parent;
  }, destroy);

  function destroy() {
    if (destroyed) {
      return;
    }
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
