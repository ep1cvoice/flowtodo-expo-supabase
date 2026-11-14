// Node built-ins via require: this project has no @types/node.
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
declare const __dirname: string;

const source = fs.readFileSync(path.join(__dirname, '../../../public/sw.js'), 'utf8');
const ORIGIN = 'https://app.test';

class FakeRequest {
  constructor(
    public url: string,
    public init: { method?: string; mode?: string } = {}
  ) {
    if (!url.startsWith('http')) this.url = ORIGIN + url;
  }
  get method() {
    return this.init.method ?? 'GET';
  }
  get mode() {
    return this.init.mode ?? 'no-cors';
  }
}

const response = (body: string, extra: { ok?: boolean; redirected?: boolean } = {}) => ({
  body,
  ok: true,
  redirected: false,
  ...extra,
  clone() {
    return { ...this };
  },
});

/** Loads sw.js into a sandbox with an in-memory Cache API and a controllable network. */
function loadServiceWorker() {
  const stores = new Map<string, Map<string, unknown>>();
  const listeners: Record<string, (event: any) => void> = {};
  const network = {
    online: true,
    hang: false,
    responses: new Map<string, unknown>(),
    calls: [] as string[],
  };

  const open = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name)!;
    return {
      match: async (req: FakeRequest) => store.get(req.url),
      put: async (req: FakeRequest, res: unknown) => void store.set(req.url, res),
    };
  };

  const sandbox: any = {
    self: {
      location: { origin: ORIGIN },
      addEventListener: (type: string, cb: (event: any) => void) => (listeners[type] = cb),
      skipWaiting: jest.fn(),
      clients: { claim: jest.fn() },
    },
    caches: {
      open,
      keys: async () => [...stores.keys()],
      delete: async (key: string) => stores.delete(key),
    },
    Request: FakeRequest,
    URL,
    Promise,
    setTimeout,
    fetch: (req: FakeRequest) => {
      network.calls.push(req.url);
      if (!network.online) return Promise.reject(new TypeError('Failed to fetch'));
      if (network.hang) return new Promise(() => {});
      return Promise.resolve(network.responses.get(req.url) ?? response('default:' + req.url));
    },
  };
  vm.runInNewContext(source, sandbox);

  const dispatch = async (request: FakeRequest) => {
    let result: Promise<any> | undefined;
    listeners.fetch({ request, respondWith: (p: Promise<any>) => (result = p) });
    return result ? await result : undefined;
  };
  return { dispatch, network, stores, listeners };
}

const nav = (url: string) => new FakeRequest(url, { mode: 'navigate' });

it('opens pages offline from the last visit, and falls back to the shell for unseen routes', async () => {
  const sw = loadServiceWorker();
  sw.network.responses.set(ORIGIN + '/login', response('login-html'));
  expect((await sw.dispatch(nav('/login'))).body).toBe('login-html');

  sw.network.online = false;
  expect((await sw.dispatch(nav('/login'))).body).toBe('login-html'); // exact copy
  expect((await sw.dispatch(nav('/active'))).body).toBe('login-html'); // generic shell
});

it('prefers fresh pages online and stops waiting for a hanging network when a copy exists', async () => {
  jest.useFakeTimers();
  try {
    const sw = loadServiceWorker();
    sw.network.responses.set(ORIGIN + '/login', response('v1'));
    await sw.dispatch(nav('/login'));
    sw.network.responses.set(ORIGIN + '/login', response('v2'));
    expect((await sw.dispatch(nav('/login'))).body).toBe('v2');

    sw.network.hang = true;
    const pending = sw.dispatch(nav('/login'));
    await jest.advanceTimersByTimeAsync(3100);
    expect((await pending).body).toBe('v2');
  } finally {
    jest.useRealTimers();
  }
});

it('does not cache redirected or failed page responses', async () => {
  const sw = loadServiceWorker();
  sw.network.responses.set(ORIGIN + '/old', response('x', { redirected: true }));
  await sw.dispatch(nav('/old'));
  sw.network.online = false;
  await expect(sw.dispatch(nav('/old'))).rejects.toThrow();
});

it('caches hashed assets forever and serves them without the network', async () => {
  const sw = loadServiceWorker();
  const asset = new FakeRequest('/_expo/static/js/web/entry-abc.js');
  sw.network.responses.set(asset.url, response('js'));
  expect((await sw.dispatch(asset)).body).toBe('js');

  sw.network.online = false;
  sw.network.calls.length = 0;
  expect((await sw.dispatch(asset)).body).toBe('js');
  expect(sw.network.calls).toEqual([]);
});

it('ignores API calls, other origins and non-GET requests', async () => {
  const sw = loadServiceWorker();
  expect(await sw.dispatch(new FakeRequest('https://x.supabase.co/rest/v1/tasks'))).toBeUndefined();
  expect(await sw.dispatch(new FakeRequest('/api/thing'))).toBeUndefined();
  expect(await sw.dispatch(new FakeRequest('/_expo/x.js', { method: 'POST' }))).toBeUndefined();
});

it('removes caches of older versions on activate', async () => {
  const sw = loadServiceWorker();
  sw.stores.set('flowtodo-pages-v0', new Map());
  sw.stores.set('unrelated', new Map());
  let done: Promise<unknown> | undefined;
  sw.listeners.activate({ waitUntil: (p: Promise<unknown>) => (done = p) });
  await done;
  expect([...sw.stores.keys()]).toEqual(['unrelated']);
});
