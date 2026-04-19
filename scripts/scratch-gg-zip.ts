import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

async function main() {
  const p = path.resolve('src/test/fixtures/ggpoker/ts/0000019d-a310-514e-0000-00000de09d11.zip');
  const buffer = fs.readFileSync(p);
  const zip = await JSZip.loadAsync(buffer);
  
  for (const filename of Object.keys(zip.files)) {
    const content = await zip.files[filename].async('string');
    console.log(`--- ${filename} ---`);
    console.log(content.slice(0, 1000));
  }
}

main().catch(console.error);
