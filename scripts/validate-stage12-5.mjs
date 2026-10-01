import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const full = (file) => path.join(root, file);

function jpegDimensions(file) {
  const b = fs.readFileSync(full(file));
  if (b[0] !== 0xff || b[1] !== 0xd8) throw new Error(`${file}: not a JPEG`);
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i += 1; continue; }
    const marker = b[i + 1];
    i += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    const len = b.readUInt16BE(i);
    const sof = [0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker);
    if (sof) return { width: b.readUInt16BE(i + 5), height: b.readUInt16BE(i + 3) };
    i += len;
  }
  throw new Error(`${file}: JPEG dimensions not found`);
}

function pngDimensions(file) {
  const b = fs.readFileSync(full(file));
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

const living = jpegDimensions("public/panoramas/demo/interior-living-360.jpg");
const kitchen = jpegDimensions("public/panoramas/demo/interior-kitchen-360.jpg");
const wide = pngDimensions("public/images/virtual-tour/wide-panorama-preview.png");

for (const [name, dims] of [["living", living], ["kitchen", kitchen]]) {
  if (dims.width !== 2048 || dims.height !== 1024 || dims.width / dims.height !== 2) {
    errors.push(`${name} demo panorama is not the expected exact 2:1 source`);
  }
}
if (Math.abs(wide.width / wide.height - 2) < 0.01) errors.push("Non-2:1 wide preview was incorrectly supplied as 2:1");

const manifest = read("src/data/panoramaAssets.ts");
const tour = read("src/data/virtualTour.ts");
const page = read("src/app/virtual-tour/page.tsx");
const demo = read("src/components/virtual-tour/PanoramaDemoLab.tsx");
const viewer = read("src/components/virtual-tour/MarzipanoViewer.tsx");

for (const needle of ["immersiveEligible: true", "propertyMedia: false", "flat-preview", "immersiveEligible: false"]) {
  if (!manifest.includes(needle)) errors.push(`Panorama manifest missing ${needle}`);
}
if ((tour.match(/panoramaReady: true/g) || []).length > 0) errors.push("A Tejjora production scene was prematurely marked panoramaReady");
if (!tour.includes('mediaKind: "pending"')) errors.push("Tejjora scenes do not carry pending media provenance");
if (!page.includes('process.env.NODE_ENV !== "production"') || !page.includes('demoValue === "1"')) errors.push("Development demo is not production-gated");
if (!demo.includes("Tejjora Lake View property photography")) errors.push("Demo UI lacks explicit non-property disclosure");
if (!viewer.includes("Not Tejjora property media")) errors.push("Viewer lacks persistent demo provenance label");

if (errors.length) {
  console.error("Stage 12.5 validation FAILED");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Stage 12.5 validation: PASS (${living.width}x${living.height}, ${kitchen.width}x${kitchen.height}, flat ${wide.width}x${wide.height})`);
