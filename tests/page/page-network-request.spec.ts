/**
 * Copyright 2018 Google Inc. All rights reserved.
 * Modifications copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { test as it, expect } from './pageTest';
import { attachFrame } from '../config/utils';

it('should work for main frame navigation request', async ({ page, server }) => {
  const requests = [];
  page.on('request', request => requests.push(request));
  await page.goto(server.EMPTY_PAGE);
  expect(requests.length).toBe(1);
  expect(requests[0].frame()).toBe(page.mainFrame());
});

it('should work for subframe navigation request', async ({ page, server }) => {
  await page.goto(server.EMPTY_PAGE);
  const requests = [];
  page.on('request', request => requests.push(request));
  await attachFrame(page, 'frame1', server.EMPTY_PAGE);
  expect(requests.length).toBe(1);
  expect(requests[0].frame()).toBe(page.frames()[1]);
});

it('should work for fetch requests @smoke', async ({ page, server }) => {
  await page.goto(server.EMPTY_PAGE);
  const requests = [];
  page.on('request', request => requests.push(request));
  await page.evaluate(() => fetch('/digits/1.png'));
  expect(requests.length).toBe(1);
  expect(requests[0].frame()).toBe(page.mainFrame());
});

it('should work for a redirect', async ({ page, server }) => {
  server.setRedirect('/foo.html', '/empty.html');
  const requests = [];
  page.on('request', request => requests.push(request));
  await page.goto(server.PREFIX + '/foo.html');

  expect(requests.length).toBe(2);
  expect(requests[0].url()).toBe(server.PREFIX + '/foo.html');
  expect(requests[1].url()).toBe(server.PREFIX + '/empty.html');
});

// https://github.com/microsoft/playwright/issues/3993
it('should not work for a redirect and interception', async ({ page, server }) => {
  server.setRedirect('/foo.html', '/empty.html');
  const requests = [];
  await page.route('**', route => {
    requests.push(route.request());
    route.continue();
  });
  await page.goto(server.PREFIX + '/foo.html');

  expect(page.url()).toBe(server.PREFIX + '/empty.html');

  expect(requests.length).toBe(1);
  expect(requests[0].url()).toBe(server.PREFIX + '/foo.html');
});

it('should return headers', async ({ page, server, browserName }) => {
  const response = await page.goto(server.EMPTY_PAGE);
  if (browserName === 'chromium')
    expect(response.request().headers()['user-agent']).toContain('Chrome');
  else if (browserName === 'firefox')
    expect(response.request().headers()['user-agent']).toContain('Firefox');
  else if (browserName === 'webkit')
    expect(response.request().headers()['user-agent']).toContain('WebKit');
});

it('should get the same headers as the server', async ({ page, server, browserName, platform }) => {
  it.fail(browserName === 'webkit' && platform === 'win32', 'Curl does not show accept-encoding and accept-language');
  let serverRequest;
  server.setRoute('/empty.html', (request, response) => {
    serverRequest = request;
    response.end('done');
  });
  const response = await page.goto(server.PREFIX + '/empty.html');
  const headers = await response.request().allHeaders();
  expect(headers).toEqual(serverRequest.headers);
});

it('should get the same headers as the server CORS', async ({ page, server, browserName, platform }) => {
  it.fail(browserName === 'webkit' && platform === 'win32', 'Curl does not show accept-encoding and accept-language');

  await page.goto(server.PREFIX + '/empty.html');
  let serverRequest;
  server.setRoute('/something', (request, response) => {
    serverRequest = request;
    response.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
    response.end('done');
  });
  const responsePromise = page.waitForEvent('response');
  const text = await page.evaluate(async url => {
    const data = await fetch(url);
    return data.text();
  }, server.CROSS_PROCESS_PREFIX + '/something');
  expect(text).toBe('done');
  const response = await responsePromise;
  const headers = await response.request().allHeaders();
  expect(headers).toEqual(serverRequest.headers);
});

it('should not get preflight CORS requests when intercepting', async ({ page, server, browserName, isAndroid }) => {
  it.fail(isAndroid, 'Playwright does not get CORS pre-flight on Android');
  await page.goto(server.PREFIX + '/empty.html');

  const requests = [];
  server.setRoute('/something', (request, response) => {
    requests.push(request.method);
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'no-cache'
      });
      response.end();
      return;
    }
    response.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
    response.end('done');
  });
  // First check the browser will send preflight request when interception is OFF.
  {
    const text = await page.evaluate(async url => {
      const data = await fetch(url, {
        method: 'DELETE',
        headers: { 'X-PINGOTHER': 'pingpong' }
      });
      return data.text();
    }, server.CROSS_PROCESS_PREFIX + '/something');
    expect(text).toBe('done');
    expect(requests).toEqual(['OPTIONS', 'DELETE']);
  }

  // Now check the browser will NOT send preflight request when interception is ON.
  {
    requests.length = 0;
    const routed = [];
    await page.route('**/something', route => {
      routed.push(route.request().method());
      route.continue();
    });

    const text = await page.evaluate(async url => {
      const data = await fetch(url, {
        method: 'DELETE',
        headers: { 'X-PINGOTHER': 'pingpong' }
      });
      return data.text();
    }, server.CROSS_PROCESS_PREFIX + '/something');
    expect(text).toBe('done');
    // Check that there was no preflight (OPTIONS) request.
    expect(routed).toEqual(['DELETE']);
    if (browserName === 'firefox')
      expect(requests).toEqual(['OPTIONS', 'DELETE']);
    else
      expect(requests).toEqual(['DELETE']);
  }
});

it('should return postData', async ({ page, server, isAndroid }) => {
  it.fixme(isAndroid, 'Post data does not work');

  await page.goto(server.EMPTY_PAGE);
  server.setRoute('/post', (req, res) => res.end());
  let request = null;
  page.on('request', r => request = r);
  await page.evaluate(() => fetch('./post', { method: 'POST', body: JSON.stringify({ foo: 'bar' }) }));
  expect(request).toBeTruthy();
  expect(request.postData()).toBe('{"foo":"bar"}');
});

it('should work with binary post data', async ({ page, server, isAndroid }) => {
  it.fixme(isAndroid, 'Post data does not work');

  await page.goto(server.EMPTY_PAGE);
  server.setRoute('/post', (req, res) => res.end());
  let request = null;
  page.on('request', r => request = r);
  await page.evaluate(async () => {
    await fetch('./post', { method: 'POST', body: new Uint8Array(Array.from(Array(256).keys())) });
  });
  expect(request).toBeTruthy();
  const buffer = request.postDataBuffer();
  expect(buffer.length).toBe(256);
  for (let i = 0; i < 256; ++i)
    expect(buffer[i]).toBe(i);
});

it('should work with binary post data and interception', async ({ page, server, isAndroid }) => {
  it.fixme(isAndroid, 'Post data does not work');

  await page.goto(server.EMPTY_PAGE);
  server.setRoute('/post', (req, res) => res.end());
  let request = null;
  await page.route('/post', route => route.continue());
  page.on('request', r => request = r);
  await page.evaluate(async () => {
    await fetch('./post', { method: 'POST', body: new Uint8Array(Array.from(Array(256).keys())) });
  });
  expect(request).toBeTruthy();
  const buffer = request.postDataBuffer();
  expect(buffer.length).toBe(256);
  for (let i = 0; i < 256; ++i)
    expect(buffer[i]).toBe(i);
});

it('should override post data content type', async ({ page, server, isAndroid }) => {
  it.fixme(isAndroid, 'Post data does not work');

  await page.goto(server.EMPTY_PAGE);
  let request = null;
  server.setRoute('/post', (req, res) => {
    request = req;
    res.end();
  });
  await page.route('**/post', (route, request) => {
    const headers = request.headers();
    headers['content-type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
    route.continue({
      headers,
      postData: request.postData()
    });
  });
  await page.evaluate(async () => {
    await fetch('./post', { method: 'POST', body: 'foo=bar' });
  });
  expect(request).toBeTruthy();
  expect(request.headers['content-type']).toBe('application/x-www-form-urlencoded; charset=UTF-8');
});

it('should get |undefined| with postData() when there is no post data', async ({ page, server, isAndroid }) => {
  it.fixme(isAndroid, 'Post data does not work');

  const response = await page.goto(server.EMPTY_PAGE);
  expect(response.request().postData()).toBe(null);
});

it('should parse the json post data', async ({ page, server, isAndroid }) => {
  it.fixme(isAndroid, 'Post data does not work');

  await page.goto(server.EMPTY_PAGE);
  server.setRoute('/post', (req, res) => res.end());
  let request = null;
  page.on('request', r => request = r);
  await page.evaluate(() => fetch('./post', { method: 'POST', body: JSON.stringify({ foo: 'bar' }) }));
  expect(request).toBeTruthy();
  expect(request.postDataJSON()).toEqual({ 'foo': 'bar' });
});

it('should parse the data if content-type is application/x-www-form-urlencoded', async ({ page, server, isAndroid }) => {
  it.fixme(isAndroid, 'Post data does not work');

  await page.goto(server.EMPTY_PAGE);
  server.setRoute('/post', (req, res) => res.end());
  let request = null;
  page.on('request', r => request = r);
  await page.setContent(`<form method='POST' action='/post'><input type='text' name='foo' value='bar'><input type='number' name='baz' value='123'><input type='submit'></form>`);
  await page.click('input[type=submit]');
  expect(request).toBeTruthy();
  expect(request.postDataJSON()).toEqual({ 'foo': 'bar','baz': '123' });
});

it('should get |undefined| with postDataJSON() when there is no post data', async ({ page, server }) => {
  const response = await page.goto(server.EMPTY_PAGE);
  expect(response.request().postDataJSON()).toBe(null);
});

it('should return event source', async ({ page, server }) => {
  const SSE_MESSAGE = { foo: 'bar' };
  // 1. Setup server-sent events on server that immediately sends a message to the client.
  server.setRoute('/sse', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
    });
    res.write(`data: ${JSON.stringify(SSE_MESSAGE)}\n\n`);
  });
  // 2. Subscribe to page request events.
  await page.goto(server.EMPTY_PAGE);
  const requests = [];
  page.on('request', request => requests.push(request));
  // 3. Connect to EventSource in browser and return first message.
  expect(await page.evaluate(() => {
    const eventSource = new EventSource('/sse');
    return new Promise(resolve => {
      eventSource.onmessage = e => resolve(JSON.parse(e.data));
    });
  })).toEqual(SSE_MESSAGE);
  expect(requests[0].resourceType()).toBe('eventsource');
});

it('should return navigation bit', async ({ page, server }) => {
  const requests = new Map();
  page.on('request', request => requests.set(request.url().split('/').pop(), request));
  server.setRedirect('/rrredirect', '/frames/one-frame.html');
  await page.goto(server.PREFIX + '/rrredirect');
  expect(requests.get('rrredirect').isNavigationRequest()).toBe(true);
  expect(requests.get('one-frame.html').isNavigationRequest()).toBe(true);
  expect(requests.get('frame.html').isNavigationRequest()).toBe(true);
  expect(requests.get('script.js').isNavigationRequest()).toBe(false);
  expect(requests.get('style.css').isNavigationRequest()).toBe(false);
});

it('should return navigation bit when navigating to image', async ({ page, server }) => {
  const requests = [];
  page.on('request', request => requests.push(request));
  await page.goto(server.PREFIX + '/pptr.png');
  expect(requests[0].isNavigationRequest()).toBe(true);
});

it('should report raw headers', async ({ page, server, browserName, platform }) => {
  let expectedHeaders: { name: string, value: string }[];
  server.setRoute('/headers', (req, res) => {
    expectedHeaders = [];
    for (let i = 0; i < req.rawHeaders.length; i += 2)
      expectedHeaders.push({ name: req.rawHeaders[i], value: req.rawHeaders[i + 1] });
    if (browserName === 'webkit' && platform === 'win32') {
      expectedHeaders = expectedHeaders.filter(({ name }) => name.toLowerCase() !== 'accept-encoding');
      // Convert "value": "en-US, en-US" => "en-US"
      expectedHeaders = expectedHeaders.map(e => {
        const { name, value } = e;
        if (name.toLowerCase() !== 'accept-language')
          return e;
        const values = value.split(',').map(v => v.trim());
        if (values.length === 1)
          return e;
        if (values[0] !== values[1])
          return e;
        return { name, value: values[0] };
      });
    }
    res.end();
  });
  await page.goto(server.EMPTY_PAGE);
  const [request] = await Promise.all([
    page.waitForRequest('**/*'),
    page.evaluate(() => fetch('/headers', {
      headers: [
        ['header-a', 'value-a'],
        ['header-b', 'value-b'],
        ['header-a', 'value-a-1'],
        ['header-a', 'value-a-2'],
      ]
    }))
  ]);
  const headers = await request.headersArray();
  expect(headers.sort((a, b) => a.name.localeCompare(b.name))).toEqual(expectedHeaders.sort((a, b) => a.name.localeCompare(b.name)));
  expect(await request.headerValue('header-a')).toEqual('value-a, value-a-1, value-a-2');
  expect(await request.headerValue('not-there')).toEqual(null);
});

it('should report raw response headers in redirects', async ({ page, server, browserName }) => {
  it.skip(browserName === 'webkit', `WebKit won't give us raw headers for redirects`);
  server.setExtraHeaders('/redirect/1.html', { 'sec-test-header': '1.html' });
  server.setExtraHeaders('/redirect/2.html', { 'sec-test-header': '2.html' });
  server.setExtraHeaders('/empty.html', { 'sec-test-header': 'empty.html' });
  server.setRedirect('/redirect/1.html', '/redirect/2.html');
  server.setRedirect('/redirect/2.html', '/empty.html');

  const expectedUrls = ['/redirect/1.html', '/redirect/2.html', '/empty.html'].map(s => server.PREFIX + s);
  const expectedHeaders = ['1.html', '2.html', 'empty.html'];

  const response = await page.goto(server.PREFIX + '/redirect/1.html');
  const redirectChain = [];
  const headersChain = [];
  for (let req = response.request(); req; req = req.redirectedFrom()) {
    redirectChain.unshift(req.url());
    const res = await req.response();
    const headers = await res.allHeaders();
    headersChain.unshift(headers['sec-test-header']);
  }

  expect(redirectChain).toEqual(expectedUrls);
  expect(headersChain).toEqual(expectedHeaders);
});

it('should report all cookies in one header', async ({ page, server }) => {
  const expectedHeaders = {};
  server.setRoute('/headers', (req, res) => {
    for (let i = 0; i < req.rawHeaders.length; i += 2)
      expectedHeaders[req.rawHeaders[i]] = req.rawHeaders[i + 1];
    res.end();
  });

  await page.goto(server.EMPTY_PAGE);
  await page.evaluate(() => {
    document.cookie = 'myCookie=myValue';
    document.cookie = 'myOtherCookie=myOtherValue';
  });
  const response = await page.goto(server.EMPTY_PAGE);
  const cookie = (await response.request().allHeaders())['cookie'];
  expect(cookie).toBe('myCookie=myValue; myOtherCookie=myOtherValue');
});
