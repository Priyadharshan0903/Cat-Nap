// Reuse the game's own vector artwork; this does not generate or imitate screenshots.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
function compile(file, overrides = {}) {
  const full = path.join(root, file);
  const output = ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = new Module(full, module); loaded.filename = full; loaded.paths = Module._nodeModulePaths(path.dirname(full));
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = id => overrides[id] ?? originalRequire(id);
  loaded._compile(output, full);
  return loaded.exports;
}
const palette = compile('lib/palette.ts');
const { Cat, WindowScene, CATS } = compile('app/Cat.tsx', { '../lib/palette': palette });
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const scene = render(WindowScene, { kind: 'mochi' }).replace('<svg ', '<svg x="915" y="24" width="405" height="420" ');
const logo = render(Cat, { kind: 'mochi', faceOnly: true, x: 96, y: 132, width: 78, height: 78 });
const font = 'font-family="Avenir Next, Manrope, sans-serif"';
const banner = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="460" viewBox="0 0 1400 460" role="img" aria-labelledby="title desc"><title id="title">Catnap — a little room for logic</title><desc id="desc">The Catnap wordmark beside Mochi relaxing at the game's illustrated window.</desc><rect width="1400" height="460" rx="32" fill="#f8f9f4"/><rect x="855" y="24" width="517" height="412" rx="32" fill="#eff2e7"/>${logo}<text x="190" y="204" ${font} font-size="104" font-weight="500" letter-spacing="-5" fill="#344e43">catnap<tspan fill="#7a956b">.</tspan></text><text x="100" y="275" ${font} font-size="34" font-weight="400" letter-spacing="-.6" fill="#344e43">A little room for logic.</text><text x="102" y="322" ${font} font-size="20" fill="#657165">132 puzzles. Small paws. A place to unwind.</text><circle cx="108" cy="382" r="5" fill="#8a9e73"/><text x="127" y="389" ${font} font-size="18" fill="#657165">No ads. No rush.</text>${scene}</svg>`;
const companions = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="260" viewBox="0 0 1400 260" role="img" aria-labelledby="title"><title id="title">Meet Mochi, Ginger, Luna, Olive, Peaches, and Cloud</title><rect width="1400" height="260" rx="28" fill="#f8f9f4"/>${CATS.map((cat,i) => { const x = 75 + i * 210; return `<ellipse cx="${x+70}" cy="184" rx="69" ry="8" fill="#e9edde"/>${render(Cat,{kind:cat.id,x,y:34,width:140,height:150,happy:i%3===0})}<text x="${x+70}" y="228" text-anchor="middle" ${font} font-size="18" fill="#344e43">${cat.name}</text>`; }).join('')}</svg>`;
const directory = path.join(root, 'docs/images'); fs.mkdirSync(directory,{recursive:true});
fs.writeFileSync(path.join(directory,'catnap-banner.svg'),banner);
fs.writeFileSync(path.join(directory,'catnap-companions.svg'),companions);
console.log('Created docs/images/catnap-banner.svg and catnap-companions.svg from the actual game artwork.');
