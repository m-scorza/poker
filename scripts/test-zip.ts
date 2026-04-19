import JSZip from 'jszip';

async function testZip() {
  const zip = new JSZip();
  zip.file("hand1.txt", "PokerStars Hand #1...");
  zip.file("hand2.txt", "PokerStars Hand #2...");
  zip.file("not_a_hand.pdf", "...");
  
  const content = await zip.generateAsync({type:"nodebuffer"});
  console.log("ZIP generated, size:", content.length);
  
  // Simulate extraction logic
  const loadedZip = await JSZip.loadAsync(content);
  const files = Object.keys(loadedZip.files);
  console.log("Files in zip:", files);
  
  const extracted: string[] = [];
  for (const f of files) {
    if (f.endsWith('.txt')) {
      const data = await loadedZip.files[f]!.async('string');
      extracted.push(data);
    }
  }
  
  console.log("Extracted .txt files:", extracted.length);
  if (extracted.length === 2) {
    console.log("SUCCESS: Extracted 2 hands correctly.");
  } else {
    console.log("FAILURE: Expected 2 hands, got", extracted.length);
    process.exit(1);
  }
}

testZip().catch(err => {
  console.error(err);
  process.exit(1);
});
