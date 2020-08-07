import { Clock } from './Clock';
import { Context } from './Context';

export interface RiposteManager {
  createContext: () => Context;
}

export function RiposteManager() {
  const clock = Clock();

  return {
    createContext: () => Context(clock),
  };
}
