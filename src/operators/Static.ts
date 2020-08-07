import { Value, RIPOST_TICK } from '../types';

export function Static<State>(tick: number, value: State): Value<State> {
  return {
    [RIPOST_TICK]: tick,
    get: () => value,
    sub: () => {
      return () => {};
    },
    destroy: () => {},
  };
}
