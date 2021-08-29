import { Store, SYNCLOCK } from '../types';
import { Clock } from '../Clock';
import { store } from './store';

export function reducerStore<Mutation, State>(
  initial: State,
  reducer: (state: State, message: Mutation) => State
): Store<Mutation, State> {
  const baseStore = store<State>(initial);

  return {
    [SYNCLOCK]: baseStore[SYNCLOCK],
    destroy: baseStore.destroy,
    sub: baseStore.sub,
    get: baseStore.get,
    emit(mutation) {
      baseStore.emit(prev => reducer(prev, mutation));
    }
  };
}
