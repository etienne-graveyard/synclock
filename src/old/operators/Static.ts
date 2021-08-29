import { Value, SYNCLOCK_TICK } from '../types';

export function Static<State>(tick: number, value: State): Value<State> {
  return {
    [SYNCLOCK_TICK]: tick,
    get: () => value,
    sub: () => {
      return () => {};
    },
    destroy: () => {}
  };
}
