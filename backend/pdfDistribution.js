const fs = require('fs');
const path = require('path');

const DEPARTMENT_FOLDERS = ['IT Security', 'Finance', 'Operations', 'Compliance'];
const DEPARTMENT_ALIASES = {
  'it security': 'IT Security',
  'information security': 'IT Security',
  'finance': 'Finance',
  'operations': 'Operations',
  'compliance': 'Compliance',
};

const normalizeDepartmentName = (value = '') => {
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const normalized = trimmed.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  if (DEPARTMENT_ALIASES[normalized]) return DEPARTMENT_ALIASES[normalized];
  const directMatch = DEPARTMENT_FOLDERS.find((department) => department.toLowerCase() === normalized);
  if (directMatch) return directMatch;
  return trimmed;
};

const isPdfFile = (filePath) => path.extname(filePath).toLowerCase() === '.pdf';

const collectPdfDistributionItems = (rootDirectory) => {
  if (!rootDirectory) return [];
  const items = [];
  const entries = fs.existsSync(rootDirectory) ? fs.readdirSync(rootDirectory, { withFileTypes: true }) : [];

  entries.forEach((entry) => {
    const absolutePath = path.join(rootDirectory, entry.name);
    if (entry.isDirectory()) {
      const department = normalizeDepartmentName(entry.name);
      if (!DEPARTMENT_FOLDERS.includes(department)) return;
      const nestedEntries = fs.readdirSync(absolutePath, { withFileTypes: true });
      nestedEntries.forEach((nestedEntry) => {
        if (nestedEntry.isFile() && isPdfFile(nestedEntry.name)) {
          items.push({
            department,
            fileName: nestedEntry.name,
            fullPath: path.join(absolutePath, nestedEntry.name),
          });
        }
      });
    }
  });

  return items;
};

module.exports = {
  DEPARTMENT_FOLDERS,
  collectPdfDistributionItems,
  normalizeDepartmentName,
};
