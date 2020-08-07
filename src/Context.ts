import { Destroyable, Value, Store, ExtractValues } from './types';
import { ListMap } from './operators/ListMap';
import { Static } from './operators/Static';
import { Join } from './operators/Join';
import { Clock } from './Clock';
import { Select } from './operators/Select';
import { Unwrap } from './operators/Unwrap';
import { ReducerStore } from './operators/ReducerStore';
import { BasicStore, ValOrUpdateFn } from './operators/BasicStore';
import { Watch } from './operators/Watch';
import { Effect } from './operators/Effect';

export interface Context extends Destroyable {
  register<S extends Destroyable>(item: S): S;
  destroy: () => void;

  reducerStore<Mutation, State>(
    initial: State,
    reducer: (state: State, message: Mutation) => State
  ): Store<Mutation, State>;
  basicStore<State>(initial: State): Store<ValOrUpdateFn<State>, State>;
  join<T extends { [key: string]: Value<any> }>(deps: T): Value<ExtractValues<T>>;
  listMap<Item, Child extends Destroyable>(
    parent: Value<Array<Item>>,
    mount: (item: Value<Item>) => Child,
    equal?: (l: Item, r: Item) => boolean
  ): Value<Array<Child>>;
  select<Parent, State>(
    parent: Value<Parent>,
    selector: (parent: Parent) => State,
    equal?: (l: State, r: State) => boolean
  ): Value<State>;
  static<State>(tick: number, value: State): Value<State>;
  unwrap<T>(parent: Value<Value<T> | null>): Value<T | null>;
  watch<T>(store: Value<T>, onEmit: (value: T) => void): Destroyable;
  effect<T>(store: Value<T>, onEmit: (value: T) => void): Destroyable;
}

export function Context(clock: Clock): Context {
  let stores: Array<Destroyable> = [];

  function register<S extends Destroyable>(item: S): S {
    stores.push(item);
    return item;
  }

  function destroy() {
    stores.forEach(s => {
      s.destroy();
    });
  }

  return {
    register,
    destroy,

    reducerStore<Mutation, State>(
      initial: State,
      reducer: (state: State, message: Mutation) => State
    ): Store<Mutation, State> {
      return register(ReducerStore(clock, initial, reducer));
    },
    basicStore<State>(initial: State): Store<ValOrUpdateFn<State>, State> {
      return register(BasicStore(clock, initial));
    },
    join<T extends { [key: string]: Value<any> }>(deps: T): Value<ExtractValues<T>> {
      return register(Join(clock, deps));
    },
    listMap<Item, Child extends Destroyable>(
      parent: Value<Array<Item>>,
      mount: (item: Value<Item>) => Child,
      equal?: (l: Item, r: Item) => boolean
    ): Value<Array<Child>> {
      return register(ListMap(clock, parent, mount, equal));
    },
    select<Parent, State>(
      parent: Value<Parent>,
      selector: (parent: Parent) => State,
      equal?: (l: State, r: State) => boolean
    ): Value<State> {
      return register(Select(clock, parent, selector, equal));
    },
    static<State>(tick: number, value: State): Value<State> {
      return register(Static(tick, value));
    },
    unwrap<T>(parent: Value<Value<T> | null>): Value<T | null> {
      return register(Unwrap(clock, parent));
    },
    watch<T>(store: Value<T>, onEmit: (value: T) => void): Destroyable {
      return register(Watch(clock, store, onEmit));
    },
    effect<T>(store: Value<T>, onEmit: (value: T) => void): Destroyable {
      return register(Effect(clock, store, onEmit));
    }
  };
}
