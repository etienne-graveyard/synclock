import { Value, SYNCLOCK, Destroyable } from '../types';
import { Subscription } from 'suub';
import { constant } from '../internal/constant';

interface InternalItem<Item, Child extends Destroyable> {
  child: Child;
  item: Item;
}

export function mountList<Item, Child extends Destroyable>(
  parent: Value<Array<Item>>,
  mount: (item: Value<Item>) => Child,
  itemEqual: (l: Item, r: Item) => boolean = (l, r) => l === r
): Value<Array<Child>> {
  const clock = parent[SYNCLOCK].clock;
  const tick = parent[SYNCLOCK].tick + 1;

  const sub = Subscription<Array<Child>>() as Subscription<Array<Child>>;
  let parentValue = parent.get();
  let nextParentValue = parentValue;
  let internal: Array<InternalItem<Item, Child>> = parentValue.map(item => {
    const itemStore = constant(clock, tick + 1, item);
    const child = mount(itemStore);
    return {
      item,
      child
    };
  });
  let state: Array<Child> = internal.map(int => int.child);
  let destroyed = false;

  const unsubClock = clock.subscribe(tick, () => {
    if (destroyed) {
      return;
    }
    if (nextParentValue === parentValue) {
      return;
    }
    parentValue = nextParentValue;
    let noChanges = true;
    // destroyed removed items
    internal.forEach(intern => {
      const exist = parentValue.find(item => itemEqual(item, intern.item));
      if (exist === undefined) {
        noChanges = false;
        intern.child.destroy();
      }
    });
    // create new items
    const nextInternal: Array<InternalItem<Item, Child>> = parentValue.map(item => {
      const exist = internal.find(intern => itemEqual(item, intern.item));
      if (exist) {
        return exist;
      }
      noChanges = false;
      const itemStore = constant(clock, tick + 1, item);
      const child = mount(itemStore);
      return { child, item };
    });
    if (noChanges) {
      return;
    }
    internal = nextInternal;
    state = internal.map(int => int.child);
    sub.emit(state);
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
    get: () => state,
    sub: (cb, onUnsub) => {
      if (destroyed) {
        throw new Error('Destroyed');
      }
      return sub.subscribe(cb, onUnsub);
    }
  };
}
