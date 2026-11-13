const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
async function main(){
  const root=path.resolve(__dirname,'..'), directory=path.join(root,'extension/dist/chrome');
  const expected=['background.js','manifest.json','panel.css','panel.html','panel.js','THIRD_PARTY_NOTICES.txt',...['16','32','48','128'].map(size=>`icons/${size}.png`)].sort();
  const names=[];
  async function walk(base){for(const entry of await fs.readdir(base,{withFileTypes:true})){const target=path.join(base,entry.name);if(entry.isDirectory())await walk(target);else if(entry.isFile())names.push(path.relative(directory,target).replaceAll('\\','/'));else throw new Error('Unexpected package entry.');}}
  await walk(directory);assert.deepEqual(names.sort(),expected,'Only release assets may enter the package.');
  const manifest=JSON.parse(await fs.readFile(path.join(directory,'manifest.json'),'utf8'));
  assert.equal(manifest.version,'0.2.0');assert.equal(manifest.manifest_version,3);
  assert.deepEqual(manifest.permissions,['sidePanel','storage','identity','clipboardWrite']);
  assert.deepEqual(manifest.host_permissions,['https://www.umprompt.com/*','https://yxprfdhuhwdcjreyahha.supabase.co/*']);
  assert.equal(manifest.content_scripts,undefined);assert.equal(manifest.externally_connectable,undefined);
  assert.ok(!/unsafe-inline|unsafe-eval|https?:\/\/\*/u.test(manifest.content_security_policy.extension_pages));
  for(const file of ['panel.js','background.js']){
    const code=await fs.readFile(path.join(directory,file),'utf8');
    assert.ok(!/SUPABASE_SERVICE_ROLE_KEY|ANTHROPIC_API_KEY|OPENROUTER_API_KEY|STRIPE_SECRET_KEY|sb_secret_|sk_live_[A-Za-z0-9]+/u.test(code),'Server-only credentials must stay out of the package.');
  }
  const css=await fs.readFile(path.join(directory,'panel.css'),'utf8');
  assert.ok(css.includes('.extension-shell')&&css.includes('.prompt-card'));
  assert.ok(!/@import\s*(?:url\()?\s*["']?https?:|url\(\s*["']?https?:/iu.test(css),'The design must not load remote style/font services.');
  const files=[];
  for(const name of names){const bytes=await fs.readFile(path.join(directory,name));files.push({name,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
  const report={verifiedAt:new Date().toISOString(),version:manifest.version,passed:true,permissions:manifest.permissions,hostPermissions:manifest.host_permissions,checks:{releaseAssetsOnly:true,noServerOnlyConfiguration:true,noRemoteStylesOrFonts:true,noContentScripts:true,noExternalMessaging:true},files,publishedToStore:false};
  await fs.writeFile(path.join(root,'docs/extension-premium-package.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({version:report.version,files:files.length,passed:report.passed,totalBytes:files.reduce((sum,file)=>sum+file.bytes,0)}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
