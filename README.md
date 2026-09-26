<p align="center">
  <img src="https://raw.githubusercontent.com/CarlOpenLab/utils/main/assets/logo.png?v=2" width="160" alt="@cc-heart/utils logo" />
</p>

<h1 align="center">@cc-heart/utils</h1>

<p align="center">🔧 A library of JavaScript common tools — environment-agnostic core</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@cc-heart/utils"><img src="https://img.shields.io/npm/v/@cc-heart/utils.svg" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@cc-heart/utils"><img src="https://img.shields.io/npm/dm/@cc-heart/utils.svg" alt="npm downloads" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/@cc-heart/utils.svg" alt="license" /></a>
</p>

<p align="center">
  <a href="https://carlopenlab.github.io/utils/">📖 Docs</a> ·
  <a href="./README_ZH.md">中文文档</a>
</p>

> **The utils family** · core: [`@cc-heart/utils`](https://github.com/CarlOpenLab/utils) · Node.js runtime: [`@cc-heart/utils-service`](https://github.com/CarlOpenLab/utils-service) · browser: [`@cc-heart/utils-client`](https://github.com/CarlOpenLab/utils-client)

## Install

```shell
npm install @cc-heart/utils
```

## Usage

```js
import { capitalize } from '@cc-heart/utils'

capitalize('string') // String
```

## Async — retry, timeout, waitFor

Three small primitives for async control flow. They are composable on purpose: **the nesting order expresses the semantics**, instead of one giant options bag.

```ts
import { retry, withTimeout, waitFor, TimeoutError } from '@cc-heart/utils'
```

### Which one do I need?

| Situation | Function |
| --- | --- |
| The operation **throws** and is worth running again | `retry` |
| The operation did not fail — the result is just **not ready yet** (e.g. a DOM element) | `waitFor` |
| Any operation should **give up after N ms** | `withTimeout` |

### `retry(fn, options?)`

Re-runs an async operation until it succeeds or the retry budget is exhausted. Rethrows the **last** error when all attempts fail.

```ts
const user = await retry(() => fetchUser(id), { retries: 3 })

// Only retry server errors, log every attempt
const data = await retry(() => api.post(payload), {
  retries: 5,
  backoff: 'exponential',
  shouldRetry: (err) => err instanceof HttpError && err.status >= 500,
  onRetry: (err, attempt, nextDelay) =>
    console.warn(`attempt ${attempt} failed, retrying in ${nextDelay}ms`)
})
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `retries` | `number` | `3` | Retries after the first attempt fails |
| `delay` | `number` | `1000` | Base delay between attempts (ms) |
| `backoff` | `'fixed' \| 'linear' \| 'exponential'` | `'exponential'` | Delay growth per attempt |
| `maxDelay` | `number` | `30000` | Upper bound for the computed delay (ms) |
| `jitter` | `boolean` | `true` | Randomize delay (50%–100%) to avoid thundering herd |
| `shouldRetry` | `(error, attempt) => boolean` | — | Return `false` to rethrow immediately (e.g. 4xx) |
| `onRetry` | `(error, attempt, nextDelay) => void` | — | Called before each retry, good for logging |
| `signal` | `AbortSignal` | — | Cancels waiting between attempts |

### `withTimeout(promise, ms, options?)`

Races a promise against a time budget; rejects with a `TimeoutError` when exceeded.

```ts
const data = await withTimeout(fetch('/api/slow'), 5000)
```

Note: rejection does not cancel the underlying work — pass an `AbortSignal` to the operation itself if it supports cancellation.

### `waitFor(predicate, options?)`

Polls a predicate (sync or async) until it returns a truthy value, then resolves with it. Ideal for DOM scripting: "the element hasn't rendered yet" is not an error, it's a condition.

```ts
const modal = await waitFor(
  () => document.querySelector<HTMLElement>('.modal'),
  { timeout: 10_000 }
)
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `interval` | `number` | `100` | Interval between evaluations (ms) |
| `timeout` | `number` | `10000` | Overall budget (ms); `Infinity` waits forever |
| `signal` | `AbortSignal` | — | Cancels polling |

### Composition

```ts
// Each attempt may take at most 5s, retry up to 3 times
await retry(() => withTimeout(fetchData(), 5000), { retries: 3 })

// Keep retrying, but cap the whole flow at 30s
await withTimeout(retry(fetchData, { retries: 10 }), 30_000)

// Wait for an element, click it with retries, all within 10s
await withTimeout(
  retry(
    async () => {
      const btn = await waitFor(() => document.querySelector('#submit'))
      btn.click()
    },
    { retries: 3 }
  ),
  10_000
)
```

Use `instanceof TimeoutError` to tell a timeout apart from an execution failure — e.g. inside `shouldRetry`.

## Request — composable best practices

```ts
import { Request } from '@cc-heart/utils'
import type { RequestInterceptor } from '@cc-heart/utils'
```

### Principle: small instances + composition

Prefer small focused instances over one instance with all interceptors. Combine them with factory functions:

```ts
// ── Building blocks: interceptors are pure functions ──
const addAuth: RequestInterceptor = (config) => ({
  ...config,
  headers: { ...config.headers, Authorization: `Bearer ${getToken()}` }
})

const addLang: RequestInterceptor = (config) => ({
  ...config,
  headers: { ...config.headers, 'Accept-Language': 'zh-CN' }
})

const handleError = (err: unknown) => {
  toast.error(err)
  return err
}

// ── Compose: each instance handles one concern ──
const authApi = new Request('https://api.example.com')
authApi.useRequestInterceptor(addAuth)
authApi.useRequestInterceptor(addLang)
authApi.useErrorInterceptor(handleError)

const publicApi = new Request('https://open.api.com')

// ── Or use helper functions ──
function withInterceptors(
  req: Request,
  interceptors: RequestInterceptor[]
): Request {
  interceptors.forEach((i) => req.useRequestInterceptor(i))
  return req
}
function withBaseUrl(url: string): Request {
  return new Request(url)
}

const api = withInterceptors(withBaseUrl('https://api.example.com'), [
  addAuth,
  addLang,
])
```

### Four calling styles

```ts
const api = new Request('https://api.example.com')

// Style 1: async/await (recommended)
try {
  const user = await api.get<User>('/users/1')
  setUser(user)
} catch (e) {
  if ((e as Error).name === 'AbortError') return  // user cancelled
  toast.error(e)
}

// Style 2: lifecycle callbacks (React setState friendly)
api.get('/users', {
  onSuccess: setUsers,
  onError: toast.error,
  onFinally: () => setLoading(false),
})

// Style 3: promise chaining
api.get<number>('/count')
  .then(n => n * 2)
  .then(setCount)
  .catch(toast.error)

// Style 4: mixed (await + callbacks, non-conflicting)
const data = await api.get('/users', { onFinally: () => setLoading(false) })
```

### Entity — group by domain

```ts
// entities/user.ts
const api = new Request('/api')

export const UserApi = {
  list: (page: number) =>
    api.get<User[]>('/users', { page }),
  get: (id: number) =>
    api.get<User>(`/users/${id}`),
  create: (data: CreateUserDto) =>
    api.post<User>('/users', data, { onSuccess: () => toast.success('created') }),
}

// Usage
const users = await UserApi.list(1)
```

### Cache & dedup — isolated per instance

```ts
const cachedApi = new Request('/api')
// cache and dedup are instance-level, different Request instances are isolated
const data1 = await cachedApi.get('/users', {}, { cache: { ttl: 5000 } })
const data2 = await cachedApi.get('/users', {}, { cache: { ttl: 5000 } }) // cache hit

const otherApi = new Request('/api') // isolated cache
```

## SSE (Server-Sent Events)

Supports SSE streaming requests, built on Fetch API with these advantages over native EventSource:
- ✅ Custom Headers support
- ✅ POST requests support
- ✅ All HTTP methods supported

### Basic usage

```ts
import { Request } from '@cc-heart/utils'

const api = new Request('https://api.example.com')

// GET SSE
const handle = api.sse('/events', {
  onMessage(event) {
    console.log('Received:', event.data)
  },
  onOpen() {
    console.log('Connection opened')
  },
  onError(error) {
    console.error('Connection error:', error)
  },
  onClose() {
    console.log('Connection closed')
  }
})

// Cancel connection
handle.abort()
```

### POST SSE (e.g., AI streaming chat)

```ts
const handle = api.sse('/chat/completions', {
  method: 'POST',
  data: {
    prompt: 'Hello',
    model: 'gpt-4'
  },
  onMessage(event) {
    // Parse JSON data
    try {
      const data = JSON.parse(event.data)
      console.log('AI reply:', data.content)
    } catch {
      console.log('Raw data:', event.data)
    }
  },
  onError(err) {
    console.error('Request failed:', err)
  }
})
```

### With interceptors

```ts
import type { RequestInterceptor } from '@cc-heart/utils'

const addAuth: RequestInterceptor = (config) => ({
  ...config,
  headers: {
    ...config.headers,
    Authorization: `Bearer ${getToken()}`
  }
})

const api = new Request('https://api.example.com')
api.useRequestInterceptor(addAuth)

// SSE requests automatically include interceptor headers
const handle = api.sse('/protected/events', {
  onMessage(event) {
    console.log(event.data)
  }
})
```

### SSE Type definitions

```ts
interface SSEMessageEvent {
  event?: string    // Event type
  data: string      // Message data
  id?: string       // Last event ID
  retry?: number    // Retry interval (ms)
}

interface SSECallbacks {
  onMessage?: (event: SSEMessageEvent) => void
  onOpen?: () => void
  onError?: (error: unknown) => void
  onClose?: () => void
}
```

## LICENSE

`@cc-heart/utils` is licensed under the [MIT License](./LICENSE).
