type Result = { data?: any; error?: any; count?: number | null };
export type Call = { method: string; args: any[] };

export function createBuilder(result: Result = { data: null, error: null }) {
  const calls: Call[] = [];
  const builder: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: any, reject: any) =>
            Promise.resolve({ data: null, error: null, ...result }).then(resolve, reject);
        }
        if (prop === 'calls') return calls;
        return (...args: any[]) => {
          calls.push({ method: String(prop), args });
          return builder;
        };
      },
    }
  );
  return builder as any & { calls: Call[] };
}

export function callsOf(builder: any, method: string): any[][] {
  return (builder.calls as Call[]).filter((c) => c.method === method).map((c) => c.args);
}

export const flushPromises = () => new Promise<void>((resolve) => setImmediate(resolve));
