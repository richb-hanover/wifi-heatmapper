// interceptFetch.ts
type FetchArgs = Parameters<typeof globalThis.fetch>;
type FetchReturn = ReturnType<typeof globalThis.fetch>; // Promise<Response>

interface Handlers {
  onRequest?(input: FetchArgs[0], init: FetchArgs[1]): void;
  onResponse?(res: Response, input: FetchArgs[0], init: FetchArgs[1]): void;
  onError?(err: unknown, input: FetchArgs[0], init: FetchArgs[1]): void;
}

export function patchFetch(h: Handlers = {}) {
  if ((globalThis as any).__fetchPatched) return () => {};
  (globalThis as any).__fetchPatched = true;

  const original = globalThis.fetch.bind(globalThis);

  // ↓ no extra Promise wrapper
  const intercepted = async (...args: FetchArgs): FetchReturn => {
    const [input, init] = args;
    h.onRequest?.(input, init);
    try {
      const res = await original(...args);
      h.onResponse?.(res.clone(), input, init);
      return res; // resolves to Response
    } catch (err) {
      h.onError?.(err, input, init);
      throw err;
    }
  };

  globalThis.fetch = intercepted as typeof globalThis.fetch;

  return function restore() {
    if ((globalThis as any).__fetchPatched) {
      delete (globalThis as any).__fetchPatched;
      globalThis.fetch = original;
    }
  };
}
