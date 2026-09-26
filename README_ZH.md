<p align="center">
  <img src="https://raw.githubusercontent.com/CarlOpenLab/utils/main/assets/logo.png?v=2" width="160" alt="@cc-heart/utils logo" />
</p>

<h1 align="center">@cc-heart/utils</h1>

<p align="center">🔧 一个 JavaScript 通用工具库 —— 环境无关的核心层</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@cc-heart/utils"><img src="https://img.shields.io/npm/v/@cc-heart/utils.svg" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@cc-heart/utils"><img src="https://img.shields.io/npm/dm/@cc-heart/utils.svg" alt="npm downloads" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/@cc-heart/utils.svg" alt="license" /></a>
</p>

<p align="center">
  <a href="https://carlopenlab.github.io/utils/">📖 文档</a> ·
  <a href="./README.md">English</a>
</p>

> **utils 家族** · 核心：[`@cc-heart/utils`](https://github.com/CarlOpenLab/utils) · Node.js 运行时：[`@cc-heart/utils-service`](https://github.com/CarlOpenLab/utils-service) · 浏览器：[`@cc-heart/utils-client`](https://github.com/CarlOpenLab/utils-client)

## 安装

```shell
npm install @cc-heart/utils
```

## 使用

```js
import { capitalize } from '@cc-heart/utils'

capitalize('string') // String
```

## Async —— 重试、超时、等待

三个小巧的异步控制原语。它们刻意保持可组合：**用语义化的嵌套顺序表达意图**，而不是把所有配置塞进一个函数。

```ts
import { retry, withTimeout, waitFor, TimeoutError } from '@cc-heart/utils'
```

### 该用哪一个？

| 场景 | 函数 |
| --- | --- |
| 操作**抛错**了，值得再跑一次 | `retry` |
| 操作没有失败，只是结果**还没准备好**（比如 DOM 元素还没渲染） | `waitFor` |
| 任何操作想**限制在 N 毫秒内** | `withTimeout` |

### `retry(fn, options?)`

反复执行一个异步操作，直到成功或重试次数耗尽。全部失败时抛出**最后一次**的错误。

```ts
const user = await retry(() => fetchUser(id), { retries: 3 })

// 只重试服务端错误，并记录每次重试
const data = await retry(() => api.post(payload), {
  retries: 5,
  backoff: 'exponential',
  shouldRetry: (err) => err instanceof HttpError && err.status >= 500,
  onRetry: (err, attempt, nextDelay) =>
    console.warn(`第 ${attempt} 次失败，${nextDelay}ms 后重试`)
})
```

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `retries` | `number` | `3` | 首次失败后的重试次数 |
| `delay` | `number` | `1000` | 重试基础间隔（ms） |
| `backoff` | `'fixed' \| 'linear' \| 'exponential'` | `'exponential'` | 间隔增长策略 |
| `maxDelay` | `number` | `30000` | 计算出的间隔上限（ms） |
| `jitter` | `boolean` | `true` | 间隔随机化（50%–100%），避免惊群 |
| `shouldRetry` | `(error, attempt) => boolean` | — | 返回 `false` 立即抛出（如 4xx 错误） |
| `onRetry` | `(error, attempt, nextDelay) => void` | — | 每次重试前触发，适合打日志 |
| `signal` | `AbortSignal` | — | 取消重试间隔中的等待 |

### `withTimeout(promise, ms, options?)`

让 Promise 和时间预算赛跑，超时则以 `TimeoutError` 拒绝。

```ts
const data = await withTimeout(fetch('/api/slow'), 5000)
```

注意：超时拒绝并不会取消底层操作——如果操作本身支持取消，请把 `AbortSignal` 传给它。

### `waitFor(predicate, options?)`

轮询一个谓词（同步或异步），直到它返回 truthy 值并以该值兑现。特别适合 DOM 脚本："元素还没渲染出来"不是错误，只是一个尚未满足的条件。

```ts
const modal = await waitFor(
  () => document.querySelector<HTMLElement>('.modal'),
  { timeout: 10_000 }
)
```

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `interval` | `number` | `100` | 轮询间隔（ms） |
| `timeout` | `number` | `10000` | 整体时间预算（ms）；传 `Infinity` 表示一直等 |
| `signal` | `AbortSignal` | — | 取消轮询 |

### 组合使用

```ts
// 每次尝试最多 5s，最多重试 3 次
await retry(() => withTimeout(fetchData(), 5000), { retries: 3 })

// 不断重试，但整个流程 30s 封顶
await withTimeout(retry(fetchData, { retries: 10 }), 30_000)

// 先等元素出现，再带重试地点击，全程 10s 预算
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

用 `instanceof TimeoutError` 区分"超时失败"和"执行失败"——比如在 `shouldRetry` 里。

## Request — 组合式最佳实践

```ts
import { Request } from '@cc-heart/utils'
import type { RequestInterceptor } from '@cc-heart/utils'
```

### 原则：小实例 + 组合

不要一个实例挂全部拦截器，每个实例只做一件事，需要组合时用工厂函数包装：

```ts
// ── 构建块：拦截器就是纯函数 ──
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

// ── 组合：每个实例只关注一个能力 ──
const authApi = new Request('https://api.example.com')
authApi.useRequestInterceptor(addAuth)
authApi.useRequestInterceptor(addLang)
authApi.useErrorInterceptor(handleError)

const publicApi = new Request('https://open.api.com')

// ── 或用辅助函数组合 ──
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

### 四种调用风格

```ts
const api = new Request('https://api.example.com')

// 风格 1：async/await（推荐）
try {
  const user = await api.get<User>('/users/1')
  setUser(user)
} catch (e) {
  if ((e as Error).name === 'AbortError') return // 用户主动取消
  toast.error(e)
}

// 风格 2：生命周期回调（React setState 友好）
api.get('/users', {
  onSuccess: setUsers,
  onError: toast.error,
  onFinally: () => setLoading(false),
})

// 风格 3：Promise 链式
api.get<number>('/count')
  .then(n => n * 2)
  .then(setCount)
  .catch(toast.error)

// 风格 4：混合使用（await + 回调，互不冲突）
const data = await api.get('/users', { onFinally: () => setLoading(false) })
```

### Entity —— 按实体聚合

```ts
// entities/user.ts
const api = new Request('/api')

export const UserApi = {
  list: (page: number) =>
    api.get<User[]>('/users', { page }),
  get: (id: number) =>
    api.get<User>(`/users/${id}`),
  create: (data: CreateUserDto) =>
    api.post<User>('/users', data, { onSuccess: () => toast.success('创建成功') }),
}

// 使用
const users = await UserApi.list(1)
```

### 缓存 + 去重（按实例隔离）

```ts
const cachedApi = new Request('/api')
// cache 和 dedup 是实例级别的，不同的 Request 实例互相隔离
const data1 = await cachedApi.get('/users', {}, { cache: { ttl: 5000 } })
const data2 = await cachedApi.get('/users', {}, { cache: { ttl: 5000 } }) // 命中缓存

const otherApi = new Request('/api') // 独立缓存
```

## 配置项速查

```ts
interface RequestConfig {
  // 请求参数
  params?: Record<PropertyKey, any>
  data?: unknown

  // 拦截器（单次请求）
  requestInterceptors?: RequestInterceptor[]
  responseInterceptors?: ResponseInterceptor[]
  errorInterceptors?: ErrorInterceptor[]

  // 超时 & 重试
  timeout?: number          // 毫秒，超时自动 abort 当前尝试
  retry?: number            // 失败重试次数，0 = 不重试
  retryDelay?: number       // 重试间隔（毫秒）

  // 缓存（仅 GET）
  cache?: boolean | { ttl: number }  // true = 默认 TTL 5s

  // 下载进度
  onDownloadProgress?: (loaded: number, total: number) => void

  // 生命周期回调
  onSuccess?: (data: unknown) => void
  onError?: (error: unknown) => void
  onAbort?: () => void
  onFinally?: () => void
}
```

## SSE (Server-Sent Events)

支持 SSE 流式请求，基于 Fetch API 实现，相比原生 EventSource 有以下优势：
- ✅ 支持自定义 Headers
- ✅ 支持 POST 请求
- ✅ 支持所有 HTTP 方法

### 基础用法

```ts
import { Request } from '@cc-heart/utils'

const api = new Request('https://api.example.com')

// GET SSE
const handle = api.sse('/events', {
  onMessage(event) {
    console.log('收到消息:', event.data)
  },
  onOpen() {
    console.log('连接已建立')
  },
  onError(error) {
    console.error('连接错误:', error)
  },
  onClose() {
    console.log('连接已关闭')
  }
})

// 取消连接
handle.abort()
```

### POST SSE (如 AI 流式对话)

```ts
const handle = api.sse('/chat/completions', {
  method: 'POST',
  data: {
    prompt: '你好',
    model: 'gpt-4'
  },
  onMessage(event) {
    // 解析 JSON 数据
    try {
      const data = JSON.parse(event.data)
      console.log('AI 回复:', data.content)
    } catch {
      console.log('原始数据:', event.data)
    }
  },
  onError(err) {
    console.error('请求失败:', err)
  }
})
```

### 搭配拦截器使用

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

// SSE 请求会自动携带拦截器添加的 Headers
const handle = api.sse('/protected/events', {
  onMessage(event) {
    console.log(event.data)
  }
})
```

### SSE 类型定义

```ts
interface SSEMessageEvent {
  event?: string    // 事件类型
  data: string      // 消息数据
  id?: string       // 最后事件 ID
  retry?: number    // 重连间隔（毫秒）
}

interface SSECallbacks {
  onMessage?: (event: SSEMessageEvent) => void
  onOpen?: () => void
  onError?: (error: unknown) => void
  onClose?: () => void
}
```

## 返回类型

```ts
interface RequestHandle<T> {
  // thenable，可直接 await
  then, catch, finally: Promise 方法
  // 取消请求
  abort: () => void
}
```

## LICENSE

`@cc-heart/utils` 基于 [MIT License](./LICENSE) 协议开源。
