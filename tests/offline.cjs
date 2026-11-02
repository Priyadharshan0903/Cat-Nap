const assert = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs"),
  path = require("node:path");
const listeners = {},
  stores = new Map();
let online = true;
const scope = "https://example.github.io/catnap/";
const address = (input) => (typeof input === "string" ? input : input.url);
const network = async (input) => {
  if (!online) throw new Error("Offline");
  const url = new URL(address(input));
  assert.ok(
    url.href.startsWith(scope),
    "All cached assets stay under the repository path",
  );
  const file = path.join(
    "dist",
    decodeURIComponent(url.pathname.slice("/catnap/".length)),
  );
  assert.ok(fs.existsSync(file), `Cached asset exists: ${file}`);
  return new Response(fs.readFileSync(file));
};
const caches = {
  async open(key) {
    if (!stores.has(key)) stores.set(key, new Map());
    const data = stores.get(key);
    return {
      async addAll(files) {
        for (const file of files) data.set(address(file), await network(file));
      },
      async match(request) {
        return data.get(address(request))?.clone();
      },
      async put(request, response) {
        data.set(address(request), response.clone());
      },
    };
  },
  async keys() {
    return [...stores.keys()];
  },
  async delete(key) {
    return stores.delete(key);
  },
};
const self = {
  registration: { scope },
  clients: { async claim() {} },
  addEventListener: (type, handler) => {
    listeners[type] = handler;
  },
};
vm.runInNewContext(fs.readFileSync("dist/sw.js", "utf8"), {
  self,
  caches,
  fetch: network,
  URL,
  Response,
  console,
});
async function dispatch(type, data = {}) {
  let task;
  listeners[type]({
    ...data,
    waitUntil(promise) {
      task = promise;
    },
  });
  await task;
}
async function request(url, mode) {
  let task;
  listeners.fetch({
    request: { url, method: "GET", mode },
    respondWith(promise) {
      task = promise;
    },
  });
  return task ? await task : undefined;
}
(async () => {
  const old = "catnap-" + encodeURIComponent("/catnap/") + "-old";
  await caches.open("unrelated-app-cache");
  await caches.open("catnap-another-project-old");
  await caches.open(old);
  await dispatch("install");
  await dispatch("activate");
  assert.ok(stores.has("unrelated-app-cache"));
  assert.ok(stores.has("catnap-another-project-old"));
  assert.equal(stores.has(old), false);
  online = false;
  const page = await request(scope, "navigate");
  assert.equal(page.status, 200);
  assert.match(await page.text(), /<title>Catnap/);
  const assets = fs
    .readFileSync("dist/index.html", "utf8")
    .match(/src="\.\/assets\/([^"]+\.js)"/);
  assert.equal(
    (await request(scope + "assets/" + assets[1], "cors")).status,
    200,
  );
  assert.equal(
    await request("https://other.example/file.js", "cors"),
    undefined,
  );
  assert.equal(
    await request("https://example.github.io/other-project/", "navigate"),
    undefined,
  );
  const manifest = JSON.parse(
    fs.readFileSync("dist/manifest.webmanifest", "utf8"),
  );
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.start_url, "./");
  for (const icon of manifest.icons)
    assert.ok(fs.existsSync(path.join("dist", icon.src)));
  assert.ok(fs.existsSync("dist/.nojekyll"));
  console.log(
    "Offline package passed: GitHub Pages subpath, cached navigation and scripts with network unavailable, cache isolation, manifest and icons.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
