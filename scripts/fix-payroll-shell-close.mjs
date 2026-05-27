import fs from "fs";
import path from "path";

const dir = "src/pages/payroll";

for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith(".tsx")) continue;
  const p = path.join(dir, f);
  let c = fs.readFileSync(p, "utf8");
  if (!c.includes("<PayrollLegacyPage") || c.includes("</PayrollLegacyPage>")) continue;

  const fixed = c.replace(
    /(\n)([ \t]*)<\/div>(\s*\n\s*\);\s*\n)(};?)\s*$/s,
    "$1$2      </div>\n$2    </PayrollLegacyPage>$3$4\n"
  );

  if (fixed === c) {
    console.warn("no match", f);
    continue;
  }
  fs.writeFileSync(p, fixed);
  console.log("fixed", f);
}
