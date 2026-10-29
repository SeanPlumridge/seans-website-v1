'use strict';
// Production packaging only. Keep the public surface explicit; never copy the repository recursively.
const fs = require('node:fs');
const path = require('node:path');
const files = [
  'Index.html', 'spp.html', 'finforfam.html', 'one-more-run.html',
  'robots.txt', 'sitemap.xml',
  'styles.css', 'homepage.css', 'sppstyles.css', 'fffstyles.css',
  'Images/SeanPFavicons.png', 'Images/OneMoreRun_Hero2.webp',
  'assets/fonts/InstrumentSans-Variable.woff2', 'assets/fonts/instrumentsans-OFL.txt',
  'assets/spp/SPP_Coach_Portal_Background_Master.webp', 'assets/spp/spp-logo.png',
  'assets/spp/spp-performance-overview-desktop.webp', 'assets/spp/spp-assignments-desktop.webp',
  'assets/responsive/spp-performance-overview-desktop-960.webp',
  'assets/responsive/spp-assignments-desktop-960.webp',
  'assets/responsive/OneMoreRun_Hero2-640.webp', 'assets/responsive/OneMoreRun_Hero2-960.webp',
  'assets/finforfam/editorial-compact-605.webp',
  'assets/finforfam/editorial-desktop-1425.webp', 'assets/finforfam/editorial-desktop-960.webp',
  'assets/finforfam/homepage-tools-desktop-full.jpg', 'assets/finforfam/homepage-tools-compact-full.jpg',
  'assets/finforfam/mortgage-example-mobile.webp',
  'assets/finforfam/mortgage-example-desktop-1150.webp', 'assets/finforfam/mortgage-example-desktop-800.webp',
  'assets/finforfam/mortgage-example-desktop-full.jpg', 'assets/finforfam/mortgage-assumptions.webp',
  'assets/finforfam/mortgage-context-desktop-full.jpg',
  'assets/social/home.png', 'assets/social/spp.png', 'assets/social/finforfam.png', 'assets/social/one-more-run.png'
];
const outputName = file => file === 'Index.html' ? 'index.html' : file;
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.isSymbolicLink()) throw new Error('Unexpected symlink in publish directory');
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}
function build() {
  const root = path.resolve(__dirname, '..'), output = path.join(root, 'dist');
  const expected = new Set(files.map(outputName));
  if (fs.existsSync(output)) {
    const extras = walk(output).map(file => path.relative(output, file).split(path.sep).join('/')).filter(file => !expected.has(file));
    // Netlify can retain its own copy of this configuration in the cached
    // publish directory. Remove only that exact, verified build artifact.
    const cachedConfig = path.join(output, 'netlify.toml');
    const knownNetlifyArtifact = process.env.NETLIFY === 'true' &&
      extras.length === 1 && extras[0] === 'netlify.toml' &&
      fs.readFileSync(cachedConfig).equals(fs.readFileSync(path.join(root, 'netlify.toml')));
    if (extras.length && !knownNetlifyArtifact) throw new Error('Unexpected publish files; inspect before proceeding: ' + extras.join(', '));
    if (knownNetlifyArtifact) fs.unlinkSync(cachedConfig);
  }
  for (const file of files) {
    const source = path.join(root, file), destination = path.join(output, outputName(file));
    if (!fs.statSync(source).isFile()) throw new Error('Missing visitor file: ' + file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
  if (walk(output).length !== files.length) throw new Error('Publish inventory mismatch');
  console.log('Packaged ' + files.length + ' approved visitor files in dist/.');
}
module.exports = { files, outputName, build };
if (require.main === module) build();
