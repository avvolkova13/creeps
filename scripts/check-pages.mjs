import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import snapshot from "../src/data/catalog-snapshot.json" with { type: "json" };

const root = path.resolve("out");
const { basePath } = JSON.parse(readFileSync(path.join(root, "pages-build.json"), "utf8"));
for (const route of ["index.html", "404.html", "catalog/index.html", ...snapshot.products.map(p => `catalog/${p.id}/index.html`)]) {
  assert.ok(existsSync(path.join(root, route)), `Missing exported route: ${route}`);
}
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(item => item.isDirectory() ? files(path.join(directory, item.name)) : [path.join(directory, item.name)]);
}
let checked = 0;
for (const filename of files(root).filter(file => /\.(html|css)$/.test(file))) {
  const content = readFileSync(filename, "utf8");
  const pageUrl = `https://pages.test${basePath}/${path.relative(root, filename).split(path.sep).join("/")}`;
  const references = filename.endsWith(".css")
    ? [...content.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(m => m[1])
    : [...content.replace(/<link\b[^>]*rel="(?:preconnect|dns-prefetch)"[^>]*>/g, "").matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]);
  for (const reference of references) {
    if (/^(?:https?:|mailto:|data:|#|\/\/)/.test(reference)) continue;
    const url = new URL(reference.replaceAll("&amp;", "&"), pageUrl);
    assert.ok(!basePath || url.pathname === basePath || url.pathname.startsWith(basePath + "/"), `Missing basePath: ${reference} in ${filename}`);
    const relative = decodeURIComponent(url.pathname.slice(basePath.length)).replace(/^\//, "");
    let target = path.join(root, relative);
    if (existsSync(target) && statSync(target).isDirectory()) target = path.join(target, "index.html");
    assert.ok(existsSync(target), `Broken exported reference: ${reference} in ${filename}`);
    checked++;
  }
}
assert.ok(existsSync(path.join(root, ".nojekyll")));
console.log(`Pages export verified: ${snapshot.products.length} product pages, ${checked} local references, basePath=${basePath || "/"}`);
