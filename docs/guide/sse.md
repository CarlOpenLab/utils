# SSE (Server-Sent Events)

Supports SSE streaming requests, built on Fetch API with these advantages over native EventSource:

- ✅ Custom Headers support
- ✅ POST requests support
- ✅ All HTTP methods supported

## Basic usage

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

## POST SSE (e.g., AI streaming chat)

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

## With interceptors

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

## Type definitions

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
