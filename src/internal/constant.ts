import { Value, SYNCLOCK, Clock as ClockType } from '../types';

export function constant<State>(clock: ClockType, tick: number, value: State): Value<State> {
  return {
    [SYNCLOCK]: { tick, clock },
    get: () => value,
    sub: () => {
      return () => {};
    },
    destroy: () => {}
  };
}
