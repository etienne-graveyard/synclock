import { Callback } from './types';

interface SubscriptionItem {
  tick: number;
  callback: Callback;
  unsubscribe: Callback;
}

export interface Clock {
  emit(): void;
  subscribe(tick: number, callback: Callback): Callback;
}

export function Clock() {
  const maxRecursiveCall = 1000;
  const maxSubscriptionCount = 10000;

  let subscriptions: Array<SubscriptionItem> = [];
  let nextSubscriptions: Array<SubscriptionItem> = [];
  const emitQueue: Array<{}> = [];
  let isEmitting = false;

  function emit(): void {
    emitQueue.push({});
    if (isEmitting) {
      return;
    }
    isEmitting = true;
    let emitQueueSafe = maxRecursiveCall + 1; // add one because we don't count the first one
    while (emitQueueSafe > 0 && emitQueue.length > 0) {
      emitQueueSafe--;
      emitQueue.shift();
      nextSubscriptions = [...subscriptions];
      let safe = maxSubscriptionCount;
      while (safe > 0 && nextSubscriptions.length > 0) {
        safe--;
        // cannot be undefined because length > 0
        const item = nextSubscriptions.shift()!;
        item.callback();
      }
      if (safe <= 0) {
        isEmitting = false;
        throw new Error(
          'The maxSubscriptionCount has been reached. ' +
            'If this is expected you can use the maxSubscriptionCount option to raise the limit'
        );
      }
    }
    if (emitQueueSafe <= 0) {
      isEmitting = false;
      throw new Error(
        'The maxRecursiveCall has been reached, did you emit() in a callback ? ' +
          'If this is expected you can use the maxRecursiveCall option to raise the limit'
      );
    }
    isEmitting = false;
  }

  function subscribe(tick: number, callback: Callback): Callback {
    const alreadySubscribed = findSubscription(callback);

    if (alreadySubscribed) {
      alreadySubscribed.tick = tick;
      // Sort the subscription again
      sortSubscriptions();
      // return the unsub
      return alreadySubscribed.unsubscribe;
    }

    // New subscription
    let isSubscribed = true;
    subscriptions.push({
      tick,
      callback: callback,
      unsubscribe: unsubscribeCurrent,
    });
    sortSubscriptions();

    function unsubscribeCurrent(): void {
      if (!isSubscribed) {
        return;
      }
      isSubscribed = false;
      const index = subscriptions.findIndex((i) => i.callback === callback);

      // isSubscribed is true but the callback is not in the list
      // this should not happend but if it does we ignore the unsub
      /* istanbul ignore next */
      if (index === -1) {
        console.warn(
          `Subscribe (isSubscribed === true) callback is not in the subscriptions list. Please report a bug.`
        );
        return;
      }
      subscriptions.splice(index, 1);
      // remove from queue
      const queueIndex = nextSubscriptions.findIndex((i) => i.callback === callback);
      if (queueIndex >= 0) {
        nextSubscriptions.splice(queueIndex, 1);
      }
    }

    return unsubscribeCurrent;
  }

  function sortSubscriptions() {
    subscriptions.sort((l, r) => {
      return l.tick - r.tick;
    });
  }

  function findSubscription(callback: Callback): SubscriptionItem | undefined {
    return subscriptions.find((l) => l.callback === callback);
  }

  return {
    subscribe,
    emit,
  };
}
