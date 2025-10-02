/**
 * Cloudflare Workers 入口
 */
addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method === "OPTIONS") {
    // 处理预检请求
    return event.respondWith(handleOptions());
  } else if (request.method === "GET") {
    // 如果是 GET 请求，则读取 JSON 数据
    return event.respondWith(ReadJSON(request));
  } else if (request.method === "POST") {
    // 如果是 POST 请求，则写入 JSON 数据
    return event.respondWith(WriteJSON(request))
  } else {
    // 如果不是合法请求，则返回 405
    const errorResponse = new Response("{\"status\":405,\"msg\":\"Method Not Allowed\"}", {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
    return event.respondWith(handleCORS(errorResponse));
  }
});

/**
 * 处理 OPTIONS 预检请求
 * @returns {Response} 空响应带 CORS 头
 */
function handleOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*"
    }
  });
}

/**
 * 统一添加 CORS 头到响应
 * @param {Response} response 原响应
 * @returns {Response} 带 CORS 头的响应
 */
function handleCORS(response) {
  const newHeaders = new Headers(response.headers);
  newHeaders.set("Access-Control-Allow-Origin", "*");
  newHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  newHeaders.set("Access-Control-Allow-Headers", "*");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

/**
 * 解析 JSON 数据
 * @param {*} response 响应对象
 * @returns {string} JSON 字符串
 */
async function gatherResponse(response) {
  const { headers } = response;
  const contentType = headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return JSON.stringify(await response.json());
  }
}

/**
 * 读取 JSON 数据
 * @param {*} request 请求体
 * @returns {Promise<Response>} 响应
 */
async function ReadJSON(request) {
  const { pathname } = new URL(request.url);
  // 从 KV 数据库中读取 JSON 数据
  // 此步骤需要在 Cloudflare Workers 中绑定 KV 数据库并设置别名为 JSONBASE
  const value = await JSONBASE.get(pathname);
  if (value === null) {
    // 如果没有找到 JSON 数据，则返回 404
    const errorResponse = new Response("{\"status\":404,\"msg\":\"Not Found\"}", {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
    return handleCORS(errorResponse);
  }
  const successResponse = new Response(value, {
    headers: { "Content-Type": "application/json" }
  });
  return handleCORS(successResponse);
}

/**
 * 
 * @param {*} request 请求体
 * @returns 
 */
async function WriteJSON(request) {
  const { pathname } = new URL(request.url);
  const Body = await gatherResponse(request)
  // 将 JSON 数据写入 KV 数据库
  await JSONBASE.put(pathname, Body)
  return new Response(JSON.stringify({ Body }), {
    headers: { "Content-Type": "application/json" },
  });
}
