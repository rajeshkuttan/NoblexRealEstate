import fs from "fs";
import path from "path";

const dir = "src/pages/payroll";

for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith(".tsx")) continue;
  const p = path.join(dir, f);
  let c = fs.readFileSync(p, "utf8");
  if (!c.includes('className="container mx-auto p-6')) continue;
  if (c.includes("<PayrollLegacyPage") || c.includes("<PayrollPageShell")) continue;

  if (!c.includes("PayrollLegacyPage")) {
    const firstImportEnd = c.indexOf("\n", c.indexOf("import "));
    c = c.slice(0, firstImportEnd + 1) + 'import { PayrollLegacyPage } from "@/components/payroll";\n' + c.slice(firstImportEnd + 1);
  }

  const m = c.match(/<h1 className="text-2xl font-bold">([^<]*)<\/h1>/);
  const t = (m ? m[1] : f.replace(".tsx", "").replace(/^Payroll/, "")).replace(/"/g, '\\"');

  // Remove outer container + header block (flexible patterns)
  c = c.replace(
    /<div className="container mx-auto p-6[^"]*">\s*<div className="flex[\s\S]*?<h1 className="text-2xl font-bold">[^<]*<\/h1>[\s\S]*?<\/div>\s*(?:<Button[\s\S]*?<\/Button>\s*)?<\/div>\s*/,
    `<PayrollLegacyPage title="${t}" description="Payroll workspace.">\n      <div className="space-y-6">\n      `
  );
  c = c.replace(
    /<div className="container mx-auto p-6[^"]*">\s*<div className="flex[\s\S]*?<h1 className="text-2xl font-bold">[^<]*<\/h1>[\s\S]*?<\/div>\s*/,
    `<PayrollLegacyPage title="${t}" description="Payroll workspace.">\n      <div className="space-y-6">\n      `
  );

  if (!c.includes("<PayrollLegacyPage")) continue;

  c = c.replace(/\n    <\/div>\n  \);\n\};/, "\n      </div>\n    </PayrollLegacyPage>\n  );\n};");
  c = c.replace(/\n    <\/div>\n  \);\n\}/, "\n      </div>\n    </PayrollLegacyPage>\n  );\n}");
  fs.writeFileSync(p, c);
  console.log("fixed", f);
}
