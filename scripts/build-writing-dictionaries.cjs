const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/build-writing-dictionaries.cjs SOURCE_DIRECTORY');
const revision = fs.readFileSync(path.join(source, 'revision.txt'), 'utf8').trim();
if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('A pinned upstream revision is required');
const version = '2026-11-06-1';
const output = path.join(root, 'public', 'writing-dictionaries');
fs.mkdirSync(output, {recursive:true});
// Exclude a narrow, authored list of explicit/slur stems from unsolicited hints.
// This is not a content classifier and never restricts the user's own writing.
const excluded = /(?:fuck|shit|bitch|cunt|nigger|nigga|faggot|porn|cock|dick|pussy|asshole|motherf|blowjob|хуй|хуя|хуе|хуё|хуи|пизд|ебат|ёбат|бляд|блят|пидор|педик|залуп|манда|шлюх|coño|coj[oó]n|follar|joder|mierda|put[ao]s?$|gilipollas|maric[oó]n)/iu;
const scripts = {en:/^[a-z][a-z'’-]*$/u,ru:/^[а-яё][а-яё'’-]*$/u,es:/^[a-záéíóúüñ][a-záéíóúüñ'’-]*$/u};
const manifest = {version,source:'https://github.com/hermitdave/FrequencyWords',revision,sourceDataset:'OpenSubtitles 2018 frequency lists (top 50,000 per language)',license:'CC-BY-SA-4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',modifications:'Letters-only, NFC/lowercase, 2–40 characters, language script, deduplication and explicit/slur stem exclusions; frequency order retained.',languages:{}};
for (const language of ['en','ru','es']) {
  const raw = fs.readFileSync(path.join(source,`${language}.txt`),'utf8');
  const words = [...new Set(raw.split(/\r?\n/u).map(line=>line.split(' ')[0].normalize('NFC').toLowerCase()).filter(word=>word.length>=2 && word.length<=40 && scripts[language].test(word) && !excluded.test(word)))];
  const filename = `${language}-${version}.json`;
  const data = JSON.stringify({version,language,words});
  fs.writeFileSync(path.join(output,filename), data+'\n');
  manifest.languages[language]={filename,words:words.length,bytes:Buffer.byteLength(data+'\n'),sha256:crypto.createHash('sha256').update(data+'\n').digest('hex'),sourceSha256:crypto.createHash('sha256').update(raw).digest('hex')};
}
fs.writeFileSync(path.join(output,'manifest.json'), JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(output,'NOTICE.txt'),`Offline autocomplete vocabulary\n\nAdapted from FrequencyWords, Hermit Dave, OpenSubtitles 2018.\nSource: ${manifest.source}/tree/${revision}/content/2018\nContent license: Creative Commons Attribution-ShareAlike 4.0 International\nLicense: ${manifest.licenseUrl}\nDerived word lists are distributed under the same CC-BY-SA-4.0 license.\nModifications: ${manifest.modifications}\nThese are corpus word forms, not an authoritative dictionary of every word.\nNo user writing is included.\n`);
console.log(JSON.stringify(manifest,null,2));
