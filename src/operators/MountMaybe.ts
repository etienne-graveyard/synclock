import { Value, SYNCLOCK, Destroyable, Clock as ClockType } from '../types';
import { Subscription } from 'suub';
import { constant } from '../internal/constant';

export function mountMaybe<Item, Child extends Destroyable>(
  parent: Value<Item | null>,
  mount: (item: Value<Item>) => Child,
  equal: (l: Item | null, r: Item | null) => boolean = (l, r) => l === r
): Value<Child | null> {
  const clock = parent[SYNCLOCK].clock;
  const tick = parent[SYNCLOCK].tick + 1;

  const sub = Subscription<Child | null>() as Subscription<Child | null>;
  let parentValue = parent.get();
  let nextParentValue = parentValue;
  let internal: Child | null =
    parentValue === null ? null : mount(constant(clock, tick + 1, parentValue));
  let destroyed = false;

  const unsubClock = clock.subscribe(tick, () => {
    if (destroyed) {
      return;
    }
    if (nextParentValue === null) {
      parentValue = null;
      // should be unmounted
      if (internal === null) {
        return;
      }
      internal.destroy();
      internal = null;
      sub.emit(internal);
      return;
    }
    // should mount or re-mount
    if (internal !== null) {
      const alreadyMounted = equal(nextParentValue, parentValue);
      parentValue = nextParentValue;
      if (alreadyMounted) {
        return;
      }
      // unmount prev
      internal.destroy();
    }
    // mount
    internal = mount(constant(clock, tick + 1, nextParentValue));
    sub.emit(internal);
  });

  const unsubParent = parent.sub(newList => {
    nextParentValue = newList;
  });

  function destroy() {
    if (destroyed) {
      return;
    }
    destroyed = true;
    unsubClock();
    unsubParent();
    sub.unsubscribeAll();
  }

  return {
    [SYNCLOCK]: { tick, clock },
    destroy,
    get: () => internal,
    sub: (cb, onUnsub) => {
      if (destroyed) {
        throw new Error('Destroyed');
      }
      return sub.subscribe(cb, onUnsub);
    }
  };
}
