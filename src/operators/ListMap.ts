import { Value, RIPOST_TICK, Destroyable } from '../types';
import { Clock } from '../Clock';
import { Static } from './Static';
import { Subscription } from 'suub';

interface InternalItem<Item, Child extends Destroyable> {
  child: Child;
  item: Item;
}

export function ListMap<Item, Child extends Destroyable>(
  clock: Clock,
  parent: Value<Array<Item>>,
  mount: (item: Value<Item>) => Child,
  equal: (l: Item, r: Item) => boolean = (l, r) => l === r
): Value<Array<Child>> {
  const tick = parent[RIPOST_TICK] + 1;
  const sub = Subscription<Array<Child>>() as Subscription<Array<Child>>;
  let parentValue = parent.get();
  let nextParentValue = parentValue;
  let internal: Array<InternalItem<Item, Child>> = parentValue.map((item) => {
    const itemStore = Static(tick + 1, item);
    const child = mount(itemStore);
    return {
      item,
      child,
    };
  });
  let state: Array<Child> = internal.map((int) => int.child);
  let destroyed = false;

  const unsubClock = clock.subscribe(tick, () => {
    if (destroyed) {
      return;
    }
    if (nextParentValue !== parentValue) {
      parentValue = nextParentValue;
      internal.forEach((intern) => {
        const exist = parentValue.find((item) => equal(item, intern.item));
        if (exist === undefined) {
          intern.child.destroy();
        }
      });
      const nextInternal: Array<InternalItem<Item, Child>> = parentValue.map((item) => {
        const exist = internal.find((intern) => equal(item, intern.item));
        if (exist) {
          return exist;
        }
        const itemStore = Static(tick + 1, item);
        const child = mount(itemStore);
        return { child, item };
      });
      internal = nextInternal;
      state = internal.map((int) => int.child);
      sub.emit(state);
    }
  });

  const unsubParent = parent.sub((newList) => {
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
    [RIPOST_TICK]: tick,
    destroy,
    get: () => state,
    sub: (cb, onUnsub) => {
      if (destroyed) {
        throw new Error('Destroyed');
      }
      return sub.subscribe(cb, onUnsub);
    },
  };
}
