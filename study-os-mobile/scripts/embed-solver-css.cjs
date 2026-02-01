#!/usr/bin/env node
/**
 * Embeds GeminiLoop homework-styles.css into a TS file for the mobile app.
 * Run from study-os-mobile: node scripts/embed-solver-css.cjs
 * Expects GeminiLoop at ../../../GeminiLoop (sibling of smrtr).
 */
const fs = require('fs');
const path = require('path');

const geminiLoopDir = path.join(__dirname, '../../../GeminiLoop');
const outPath = path.join(__dirname, '../apps/mobile/src/screens/InteractiveSolver/solverStyles.ts');

const geminiLoopDirResolved = path.resolve(geminiLoopDir);
if (!fs.existsSync(geminiLoopDirResolved) || !fs.existsSync(path.join(geminiLoopDirResolved, 'homework-styles.css'))) {
  console.error('GeminiLoop/homework-styles.css not found at', path.join(geminiLoopDirResolved, 'homework-styles.css'));
  process.exit(1);
}

const css = fs.readFileSync(path.join(geminiLoopDirResolved, 'homework-styles.css'), 'utf8');
const escaped = css.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const out = `/** Bundled from GeminiLoop/homework-styles.css - regenerate with: node scripts/embed-solver-css.cjs */\nexport const bundledSolverCss = \`${escaped}\`;\n`;
fs.writeFileSync(outPath, out);
console.log('Wrote', outPath);
