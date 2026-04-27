const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PRODUCT_SRC_ROOT = path.join(__dirname, '..', '..', 'src', 'product');
const BLOCKED_PATTERNS = [
  /forefield-decision-core/i,
  /\bOpportunitySet\b/,
  /\bOpportunityCard\b/,
  /\bOpportunityScore\b/,
  /\bClaimTrace\b/,
  /\braw_refs\b/,
  /\braw_trace_refs\b/,
  /src[\\/].*contracts/i,
  /src[\\/].*validation/i,
];

function collectJavaScriptFiles(rootPath) {
  return fs.readdirSync(rootPath, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(rootPath, entry.name);

    if (entry.isDirectory()) {
      return collectJavaScriptFiles(fullPath);
    }

    return entry.isFile() && fullPath.endsWith('.js') ? [fullPath] : [];
  });
}

test('src/product does not import decision-core internals', () => {
  const productFiles = collectJavaScriptFiles(PRODUCT_SRC_ROOT);

  assert.ok(productFiles.length > 0);

  productFiles.forEach((filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');

    BLOCKED_PATTERNS.forEach((pattern) => {
      assert.equal(
        pattern.test(content),
        false,
        `Blocked decision-core reference found in ${filePath}: ${pattern}`
      );
    });
  });
});
