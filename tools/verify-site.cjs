'use strict';
// Run after package-site.cjs. This verifier is deliberately excluded from dist/.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { files, outputName } = require('./package-site.cjs');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const canonical = ['https://seanplumridge.com/', 'https://seanplumridge.com/spp.html', 'https://seanplumridge.com/finforfam.html', 'https://seanplumridge.com/one-more-run.html'];
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    assert(!entry.isSymbolicLink(), 'No publish symlinks');
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [path.relative(dist, file).split(path.sep).join('/')];
  });
}
assert.deepEqual(walk(dist).sort(), files.map(outputName).sort(), 'Exact publish allowlist');
for (const file of files) assert(fs.readFileSync(path.join(root, file)).equals(fs.readFileSync(path.join(dist, outputName(file)))), 'Packaged bytes: ' + file);
const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8');
assert.equal(robots, 'User-agent: *\nAllow: /\n\nSitemap: https://seanplumridge.com/sitemap.xml\n');
const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
assert(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
assert(sitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]), canonical);
assert(!/<(?:lastmod|priority|changefreq)>/.test(sitemap));
const pages = ['index.html', 'spp.html', 'finforfam.html', 'one-more-run.html'];
const titles = [], descriptions = [];
for (const [i, file] of pages.entries()) {
  const html = fs.readFileSync(path.join(dist, file), 'utf8');
  assert(/<html lang="en">/.test(html), file + ': language');
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, file + ': one H1');
  assert(html.includes('<link rel="canonical" href="' + canonical[i] + '">'), file + ': canonical');
  assert(html.includes('<meta property="og:url" content="' + canonical[i] + '">'), file + ': social URL');
  assert(!/<script[\s>]/i.test(html), file + ': static, no runtime scripts');
  assert(!/noindex/i.test(html), file + ': indexable');
  assert(/<main id="main" tabindex="-1">/.test(html), file + ': skip target');
  titles.push(html.match(/<title>([^<]+)<\/title>/)[1]);
  descriptions.push(html.match(/<meta name="description" content="([^"]+)"/)[1]);
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const ref = match[1];
    if (/^(https?:|mailto:|#)/.test(ref)) continue;
    const [raw, anchor] = ref.split('#');
    const target = raw === 'Index.html' ? 'index.html' : raw;
    assert(fs.existsSync(path.join(dist, target)), file + ': missing local reference ' + ref);
    if (anchor && target.endsWith('.html')) assert(fs.readFileSync(path.join(dist, target), 'utf8').includes('id="' + anchor + '"'), file + ': missing anchor ' + ref);
  }
}
assert.equal(new Set(titles).size, 4, 'Distinct titles');
assert.equal(new Set(descriptions).size, 4, 'Distinct descriptions');
console.log(JSON.stringify({status: 'PASS', publicFiles: files.length, canonical, checks: ['exact allowlist and bytes', 'robots policy', 'sitemap canonical scope', 'language, metadata and H1', 'static architecture', 'local links and anchors', 'skip targets']}));
