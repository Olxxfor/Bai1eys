import worker from '../src/index.js'

export const config = {
  runtime: 'nodejs20.x'
}

function createContext() {
  return {
    waitUntil(promise) {
      Promise.resolve(promise).catch(() => {})
    },
    passThroughOnException() {}
  }
}

export default async function handler(request, response) {
  const protocol = request.headers['x-forwarded-proto'] || 'https'
  const host = request.headers.host || 'api-n0xx.vercel.app'
  const url = new URL(request.url || '/', `${protocol}://${host}`)
  if (url.pathname.startsWith('/api/v1/')) {
    url.pathname = url.pathname.slice('/api'.length)
  }
  const headers = new Headers()

  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') headers.set(key, value)
    else if (Array.isArray(value)) headers.set(key, value.join(', '))
  }

  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : request
  const webRequest = new Request(url, {
    method: request.method,
    headers,
    body,
    duplex: body ? 'half' : undefined
  })

  const env = { ...process.env }
  const result = await worker.fetch(webRequest, env, createContext())
  response.status(result.status)
  result.headers.forEach((value, key) => response.setHeader(key, value))
  response.send(Buffer.from(await result.arrayBuffer()))
}
