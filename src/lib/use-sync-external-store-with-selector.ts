import { useSyncExternalStore } from "react";

type Subscribe = (onStoreChange: () => void) => () => void;
type Snapshot = () => unknown;
type Selector = (value: unknown) => unknown;

export function useSyncExternalStoreWithSelector(
  subscribe: Subscribe,
  getSnapshot: Snapshot,
  getServerSnapshot: Snapshot,
  selector: Selector,
  _isEqual?: (a: unknown, b: unknown) => boolean,
) {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getServerSnapshot()),
  );
}
