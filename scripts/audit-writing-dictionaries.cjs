const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {loadTS} = require('./load-ts.cjs');
const {WritingLexicon, parseWritingDictionary, foldWritingWord} = loadTS('lib/writing-lexicon.ts');
const {localWritingSuggestion, nextWritingWord, appendWritingSuggestion, writingWordBoundary, authoredWritingVocabulary} = loadTS('lib/writing-suggestions.ts');

function audit(root, integration=true) {
  const directory=path.join(root,'public','writing-dictionaries');
  const manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));
  const report={version:manifest.version,sourceRevision:manifest.revision,generatedAt:new Date().toISOString(),scope:'Every deployed corpus word form and authored word; every distinct proper character prefix. Completion may be any valid matching word, not a claim of intended wording. Whole grammatical connector boundaries are checked separately.',languages:[],failures:[]};
  for(const language of ['en','ru','es']) {
    const info=manifest.languages[language], bytes=fs.readFileSync(path.join(directory,info.filename));
    if(crypto.createHash('sha256').update(bytes).digest('hex')!==info.sha256) throw new Error('Dictionary integrity mismatch: '+language);
    const data=JSON.parse(bytes); const dictionary=parseWritingDictionary(data,language);
    const authored=authoredWritingVocabulary(language);
    const vocabulary=[...new Set([...data.words,...authored])];
    // Test the authored entries in the same index too; production prioritizes them.
    const combined=new WritingLexicon(language,vocabulary);
    const prefixes=new Set();
    let occurrences=0;
    for(const word of vocabulary) for(let length=1;length<word.length;length++){prefixes.add(word.slice(0,length));occurrences++;}
    const times=[], integrationTimes=[]; let checked=0, boundaries=0;
    const start=performance.now();
    for(const prefix of prefixes){
      const before=performance.now(), suffix=combined.complete(prefix);
      times.push(performance.now()-before);
      if(!suffix || !combined.has(prefix+suffix)) report.failures.push({language,prefix,kind:'missing-or-invalid-index-completion',suffix});
      if(integration){
        const input='Zeta '+prefix;
        const localStart=performance.now();
        const local=localWritingSuggestion(input,language,dictionary);
        integrationTimes.push(performance.now()-localStart);
        if(writingWordBoundary(prefix) && prefix.length>=2){boundaries++; if(local) report.failures.push({language,prefix,kind:'connector-expanded',local});}
        else {
          if(!local || !combined.has(prefix+local)) report.failures.push({language,prefix,kind:'missing-or-invalid-input-completion',local});
          else if(appendWritingSuggestion(input,nextWritingWord(local).trimEnd())!==input+local) report.failures.push({language,prefix,kind:'input-modified',local});
        }
      }
      checked++;
    }
    times.sort((a,b)=>a-b);
    integrationTimes.sort((a,b)=>a-b);
    const row={language,corpusWordForms:data.words.length,indexEntries:dictionary.entries.length,authoredWords:authored.length,totalDistinctWords:vocabulary.length,prefixOccurrences:occurrences,distinctProperPrefixes:checked,intentionalConnectorBoundaries:boundaries,indexLookupP95Ms:times[Math.ceil(times.length*.95)-1],localPathP95Ms:integrationTimes[Math.ceil(integrationTimes.length*.95)-1],elapsedMs:performance.now()-start};
    report.languages.push(row); console.log(JSON.stringify(row));
  }
  report.totalWords=report.languages.reduce((n,row)=>n+row.totalDistinctWords,0);
  report.totalDistinctPrefixes=report.languages.reduce((n,row)=>n+row.distinctProperPrefixes,0);
  report.totalPrefixOccurrences=report.languages.reduce((n,row)=>n+row.prefixOccurrences,0);
  report.passed=report.failures.length===0;
  return report;
}
if(require.main===module){
  const root=path.resolve(__dirname,'..'); const report=audit(root);
  const output=process.argv[2] || path.join(root,'docs','writing-dictionary-audit.json');
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:report.passed,words:report.totalWords,prefixes:report.totalDistinctPrefixes,failures:report.failures.length,firstFailures:report.failures.slice(0,12)}));
  if(!report.passed) process.exitCode=1;
}
module.exports={audit};
