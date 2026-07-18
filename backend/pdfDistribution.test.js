const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { collectPdfDistributionItems, normalizeDepartmentName } = require('./pdfDistribution');

test('collectPdfDistributionItems maps department folders to PDF files', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-dist-'));
  const departments = ['IT Security', 'Finance', 'Operations', 'Compliance'];

  departments.forEach((department) => {
    fs.mkdirSync(path.join(tempRoot, department), { recursive: true });
  });

  fs.writeFileSync(path.join(tempRoot, 'IT Security', 'sample-one.pdf'), 'pdf-1');
  fs.writeFileSync(path.join(tempRoot, 'Finance', 'sample-two.pdf'), 'pdf-2');
  fs.writeFileSync(path.join(tempRoot, 'Operations', 'nested', 'sample-three.pdf'), 'pdf-3');
  fs.writeFileSync(path.join(tempRoot, 'Compliance', 'sample-four.txt'), 'ignore');

  const items = collectPdfDistributionItems(tempRoot);

  assert.equal(items.length, 3);
  assert.deepEqual(
    items.map((item) => ({ department: item.department, fileName: item.fileName })),
    [
      { department: 'IT Security', fileName: 'sample-one.pdf' },
      { department: 'Finance', fileName: 'sample-two.pdf' },
      { department: 'Operations', fileName: 'sample-three.pdf' },
    ]
  );
});

test('normalizeDepartmentName handles casing and spacing', () => {
  assert.equal(normalizeDepartmentName('it security'), 'IT Security');
  assert.equal(normalizeDepartmentName('  finance  '), 'Finance');
  assert.equal(normalizeDepartmentName('Operations'), 'Operations');
});
