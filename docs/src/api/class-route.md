# class: Route

Whenever a network route is set up with [`method: Page.route`] or [`method: BrowserContext.route`], the `Route` object
allows to handle the route.

Learn more about [networking](../network.md).

## async method: Route.abort

Aborts the route's request.

### param: Route.abort.errorCode
- `errorCode` ?<[string]>

Optional error code. Defaults to `failed`, could be one of the following:
* `'aborted'` - An operation was aborted (due to user action)
* `'accessdenied'` - Permission to access a resource, other than the network, was denied
* `'addressunreachable'` - The IP address is unreachable. This usually means that there is no route to the specified
  host or network.
* `'blockedbyclient'` - The client chose to block the request.
* `'blockedbyresponse'` - The request failed because the response was delivered along with requirements which are not
  met ('X-Frame-Options' and 'Content-Security-Policy' ancestor checks, for instance).
* `'connectionaborted'` - A connection timed out as a result of not receiving an ACK for data sent.
* `'connectionclosed'` - A connection was closed (corresponding to a TCP FIN).
* `'connectionfailed'` - A connection attempt failed.
* `'connectionrefused'` - A connection attempt was refused.
* `'connectionreset'` - A connection was reset (corresponding to a TCP RST).
* `'internetdisconnected'` - The Internet connection has been lost.
* `'namenotresolved'` - The host name could not be resolved.
* `'timedout'` - An operation timed out.
* `'failed'` - A generic failure occurred.

## async method: Route.continue
* langs:
  - alias-java: resume
  - alias-python: continue_

Continues route's request with optional overrides.

```js
await page.route('**/*', (route, request) => {
  // Override headers
  const headers = {
    ...request.headers(),
    foo: 'foo-value', // set "foo" header
    bar: undefined, // remove "bar" header
  };
  route.continue({headers});
});
```

```java
page.route("**/*", route -> {
  // Override headers
  Map<String, String> headers = new HashMap<>(route.request().headers());
  headers.put("foo", "foo-value"); // set "foo" header
  headers.remove("bar"); // remove "bar" header
  route.resume(new Route.ResumeOptions().setHeaders(headers));
});
```

```python async
async def handle(route, request):
    # override headers
    headers = {
        **request.headers,
        "foo": "foo-value" # set "foo" header
        "bar": None # remove "bar" header
    }
    await route.continue_(headers=headers)
}
await page.route("**/*", handle)
```

```python sync
def handle(route, request):
    # override headers
    headers = {
        **request.headers,
        "foo": "foo-value" # set "foo" header
        "bar": None # remove "bar" header
    }
    route.continue_(headers=headers)
}
page.route("**/*", handle)
```

```csharp
await page.RouteAsync("**/*", route =>
{
    var headers = new Dictionary<string, string>(route.Request.Headers) { { "foo", "bar" } };
    headers.Remove("origin");
    route.ContinueAsync(headers);
});
```

### option: Route.continue.url
- `url` <[string]>

If set changes the request URL. New URL must have same protocol as original one.

### option: Route.continue.method
- `method` <[string]>

If set changes the request method (e.g. GET or POST)

### option: Route.continue.postData
- `postData` <[string]|[Buffer]>

If set changes the post data of request

### option: Route.continue.headers
- `headers` <[Object]<[string], [string]>>

If set changes the request HTTP headers. Header values will be converted to a string.

## async method: Route.fallback

When several routes match the given pattern, they run in the order opposite to their registration.
That way the last registered route can always override all the previos ones. In the example below,
request will be handled by the bottom-most handler first, then it'll fall back to the previous one and
in the end will be aborted by the first registered route.

```js
await page.route('**/*', route => {
  // Runs last.
  route.abort();
});
await page.route('**/*', route => {
  // Runs second.
  route.fallback();
});
await page.route('**/*', route => {
  // Runs first.
  route.fallback();
});
```

```java
page.route("**/*", route -> {
  // Runs last.
  route.abort();
});

page.route("**/*", route -> {
  // Runs second.
  route.fallback();
});

page.route("**/*", route -> {
  // Runs first.
  route.fallback();
});
```

```python async
await page.route("**/*", lambda route: route.abort())  # Runs last.
await page.route("**/*", lambda route: route.fallback())  # Runs second.
await page.route("**/*", lambda route: route.fallback())  # Runs first.
```

```python sync
page.route("**/*", lambda route: route.abort())  # Runs last.
page.route("**/*", lambda route: route.fallback())  # Runs second.
page.route("**/*", lambda route: route.fallback())  # Runs first.
```

```csharp
await page.RouteAsync("**/*", route => {
    // Runs last.
    await route.AbortAsync();
});

await page.RouteAsync("**/*", route => {
    // Runs second.
    await route.FallbackAsync();
});

await page.RouteAsync("**/*", route => {
    // Runs first.
    await route.FallbackAsync();
});
```

Registering multiple routes is useful when you want separate handlers to
handle different kinds of requests, for example API calls vs page resources or
GET requests vs POST requests as in the example below.

```js
// Handle GET requests.
await page.route('**/*', route => {
  if (route.request().method() !== 'GET') {
    route.fallback();
    return;
  }
  // Handling GET only.
  // ...
});

// Handle POST requests.
await page.route('**/*', route => {
  if (route.request().method() !== 'POST') {
    route.fallback();
    return;
  }
  // Handling POST only.
  // ...
});
```

```java
// Handle GET requests.
page.route("**/*", route -> {
  if (!route.request().method().equals("GET")) {
    route.fallback();
    return;
  }
  // Handling GET only.
  // ...
});

// Handle POST requests.
page.route("**/*", route -> {
  if (!route.request().method().equals("POST")) {
    route.fallback();
    return;
  }
  // Handling POST only.
  // ...
});
```

```python async
# Handle GET requests.
def handle_post(route):
    if route.request.method != "GET":
        route.fallback()
        return
  # Handling GET only.
  # ...

# Handle POST requests.
def handle_post(route):
    if route.request.method != "POST":
        route.fallback()
        return
  # Handling POST only.
  # ...

await page.route("**/*", handle_get)
await page.route("**/*", handle_post)
```

```python sync
# Handle GET requests.
def handle_post(route):
    if route.request.method != "GET":
        route.fallback()
        return
  # Handling GET only.
  # ...

# Handle POST requests.
def handle_post(route):
    if route.request.method != "POST":
        route.fallback()
        return
  # Handling POST only.
  # ...

page.route("**/*", handle_get)
page.route("**/*", handle_post)
```

```csharp
// Handle GET requests.
await page.RouteAsync("**/*", route => {
    if (route.Request.Method != "GET") {
        await route.FallbackAsync();
        return;
    }
    // Handling GET only.
    // ...
});

// Handle POST requests.
await page.RouteAsync("**/*", route => {
    if (route.Request.Method != "POST") {
        await route.FallbackAsync();
        return;
    }
    // Handling POST only.
    // ...
});
```

One can also modify request while falling back to the subsequent handler, that way intermediate
route handler can modify url, method, headers and postData of the request.

```js
await page.route('**/*', (route, request) => {
  // Override headers
  const headers = {
    ...request.headers(),
    foo: 'foo-value', // set "foo" header
    bar: undefined, // remove "bar" header
  };
  route.fallback({headers});
});
```

```java
page.route("**/*", route -> {
  // Override headers
  Map<String, String> headers = new HashMap<>(route.request().headers());
  headers.put("foo", "foo-value"); // set "foo" header
  headers.remove("bar"); // remove "bar" header
  route.fallback(new Route.ResumeOptions().setHeaders(headers));
});
```

```python async
async def handle(route, request):
    # override headers
    headers = {
        **request.headers,
        "foo": "foo-value" # set "foo" header
        "bar": None # remove "bar" header
    }
    await route.fallback(headers=headers)
}
await page.route("**/*", handle)
```

```python sync
def handle(route, request):
    # override headers
    headers = {
        **request.headers,
        "foo": "foo-value" # set "foo" header
        "bar": None # remove "bar" header
    }
    route.fallback(headers=headers)
}
page.route("**/*", handle)
```

```csharp
await page.RouteAsync("**/*", route =>
{
    var headers = new Dictionary<string, string>(route.Request.Headers) { { "foo", "foo-value" } };
    headers.Remove("bar");
    route.FallbackAsync(headers);
});
```

### option: Route.fallback.url
- `url` <[string]>

If set changes the request URL. New URL must have same protocol as original one. Changing the URL won't
affect the route matching, all the routes are matched using the original request URL.

### option: Route.fallback.method
- `method` <[string]>

If set changes the request method (e.g. GET or POST)

### option: Route.fallback.postData
- `postData` <[string]|[Buffer]>

If set changes the post data of request

### option: Route.fallback.headers
- `headers` <[Object]<[string], [string]>>

If set changes the request HTTP headers. Header values will be converted to a string.

## async method: Route.fulfill

Fulfills route's request with given response.

An example of fulfilling all requests with 404 responses:

```js
await page.route('**/*', route => {
  route.fulfill({
    status: 404,
    contentType: 'text/plain',
    body: 'Not Found!'
  });
});
```

```java
page.route("**/*", route -> {
  route.fulfill(new Route.FulfillOptions()
    .setStatus(404)
    .setContentType("text/plain")
    .setBody("Not Found!"));
});
```

```python async
await page.route("**/*", lambda route: route.fulfill(
    status=404,
    content_type="text/plain",
    body="not found!"))
```

```python sync
page.route("**/*", lambda route: route.fulfill(
    status=404,
    content_type="text/plain",
    body="not found!"))
```

```csharp
await page.RouteAsync("**/*", route => route.FulfillAsync(
    status: 404,
    contentType: "text/plain",
    body: "Not Found!"));
```

An example of serving static file:

```js
await page.route('**/xhr_endpoint', route => route.fulfill({ path: 'mock_data.json' }));
```

```java
page.route("**/xhr_endpoint", route -> route.fulfill(
  new Route.FulfillOptions().setPath(Paths.get("mock_data.json"))));
```

```python async
await page.route("**/xhr_endpoint", lambda route: route.fulfill(path="mock_data.json"))
```

```python sync
page.route("**/xhr_endpoint", lambda route: route.fulfill(path="mock_data.json"))
```

```csharp
await page.RouteAsync("**/xhr_endpoint", route => route.FulfillAsync(new RouteFulfillOptions { Path = "mock_data.json" }));
```

### option: Route.fulfill.status
- `status` <[int]>

Response status code, defaults to `200`.

### option: Route.fulfill.headers
- `headers` <[Object]<[string], [string]>>

Response headers. Header values will be converted to a string.

### option: Route.fulfill.contentType
- `contentType` <[string]>

If set, equals to setting `Content-Type` response header.

### option: Route.fulfill.body
* langs: js, python
- `body` <[string]|[Buffer]>

Response body.

### option: Route.fulfill.body
* langs: csharp, java
- `body` <[string]>

Optional response body as text.

### option: Route.fulfill.bodyBytes
* langs: csharp, java
- `bodyBytes` <[Buffer]>

Optional response body as raw bytes.

### option: Route.fulfill.path
- `path` <[path]>

File path to respond with. The content type will be inferred from file extension. If `path` is a relative path, then it
is resolved relative to the current working directory.

### option: Route.fulfill.response
- `response` <[APIResponse]>

[APIResponse] to fulfill route's request with. Individual fields of the response (such as headers) can be overridden using fulfill options.

## method: Route.request
- returns: <[Request]>

A request to be routed.
