const path = require("path");
const fs = require("fs/promises");
const readXlsxFile = require("read-excel-file/node");

function norm(value) {
  return String(value ?? "").trim();
}

function asNullableString(value) {
  const s = norm(value);
  return s ? s : null;
}

function asNullableNumber01(value) {
  const s = norm(value);
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (n > 1 && n <= 100) return n / 100;
  if (n >= 0 && n <= 1) return n;
  return null;
}

function rowToRule(row, idx) {
  const id = norm(row.id || row.ID || row.RuleId || row["Rule ID"] || `row_${idx + 1}`);
  const componentType = norm(row.componentType || row["Component Type"]);
  const parameterDerated = norm(row.parameterDerated || row["Parameter Derated"]);
  const applicationCategory = norm(row.applicationCategory || row["Application Category"]);
  const qualityClass = norm(row.qualityClass || row["Quality Class"]);

  if (!id || !componentType || !parameterDerated || !applicationCategory || !qualityClass) return null;

  const deratingFactor = asNullableNumber01(row.deratingFactor ?? row["Derating Factor"]);
  const maxOperatingLimitExpr = asNullableString(row.maxOperatingLimitExpr ?? row["Max Operating Limit"]);
  const typicalFailureMode = asNullableString(row.typicalFailureMode ?? row["Typical Failure Mode"]);

  return {
    id,
    componentType,
    parameterDerated,
    applicationCategory,
    qualityClass,
    deratingFactor,
    maxOperatingLimitExpr,
    typicalFailureMode,
    source: "Table.xlsx",
  };
}

function rowsToRules(rows) {
  const rules = [];
  rows.forEach((row, idx) => {
    const rule = rowToRule(row, idx);
    if (rule) rules.push(rule);
  });
  return rules;
}

async function buildRules() {
  const xlsxPath = path.join(process.cwd(), "lib", "derating", "data", "Table.xlsx");
  const outPath = path.join(process.cwd(), "data", "derating-rules.json");

  const rows = await readXlsxFile(xlsxPath);
  if (!rows.length) {
    await fs.writeFile(outPath, "[]\n");
    return;
  }

  const headers = rows[0].map((h) => norm(h));
  const dataRows = rows.slice(1);
  const objects = dataRows.map((row) => {
    const obj = {};
    headers.forEach((header, idx) => {
      if (!header) return;
      obj[header] = row[idx] ?? "";
    });
    return obj;
  });

  const rules = rowsToRules(objects);
  await fs.writeFile(outPath, JSON.stringify(rules, null, 2) + "\n");
}

buildRules().catch((error) => {
  console.error("Failed to build derating rules JSON:", error);
  process.exit(1);
});
