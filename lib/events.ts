type Listener<T> = (payload: T) => void;

type EventMap = {
  'catch:added': {
    species: string;
    photoPath?: string;
    normalized?: string;
    catchId?: string;
    firstDiscovery?: boolean;
    target?:
      | { type: 'species'; slug: string; name?: string }
      | { type: 'catch'; id: string };
  };
};

class Emitter {
  private map = new Map<string, Set<Function>>();

  on<K extends keyof EventMap>(event: K, fn: Listener<EventMap[K]>) {
    const key = String(event);
    if (!this.map.has(key)) this.map.set(key, new Set());
    this.map.get(key)!.add(fn);
    return () => this.off(event, fn);
  }

  off<K extends keyof EventMap>(event: K, fn: Listener<EventMap[K]>) {
    const key = String(event);
    const set = this.map.get(key);
    if (set) set.delete(fn as any);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]) {
    const key = String(event);
    const set = this.map.get(key);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try {
        (fn as Listener<EventMap[K]>)(payload);
      } catch {}
    }
  }
}

export const events = new Emitter();

