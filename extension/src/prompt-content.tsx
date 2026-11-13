import { Fragment, type ReactNode } from "react";

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`)/u).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> :
      part.startsWith("`") && part.endsWith("`") ? <code key={index}>{part.slice(1, -1)}</code> : part);
}

// Render only a small formatting vocabulary through React. No raw HTML, remote
// embeds, executable links, or model-generated markup enters the DOM.
export function PromptContent({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.split(/\r?\n/u);
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^\s*```/u.test(line)) {
      const code: string[] = []; i++;
      while (i < lines.length && !/^\s*```/u.test(lines[i])) code.push(lines[i++]);
      if (i < lines.length) i++;
      blocks.push(<pre key={i}><code>{code.join("\n")}</code></pre>); continue;
    }
    if (/^#{1,6}\s/u.test(line)) { blocks.push(<h3 key={i}>{inline(line.replace(/^#{1,6}\s+/u, ""))}</h3>); i++; continue; }
    if (/^\s*[-*+]\s/u.test(line) || /^\s*\d+[.)]\s/u.test(line)) {
      const ordered = /^\s*\d/u.test(line);
      const pattern = ordered ? /^\s*\d+[.)]\s+(.*)$/u : /^\s*[-*+]\s+(.*)$/u;
      const items: ReactNode[] = [];
      while (i < lines.length && pattern.test(lines[i])) { items.push(<li key={i}>{inline(lines[i].replace(pattern, "$1"))}</li>); i++; }
      blocks.push(ordered ? <ol key={i}>{items}</ol> : <ul key={i}>{items}</ul>); continue;
    }
    if (/^\s*---+\s*$/u.test(line)) { blocks.push(<hr key={i} />); i++; continue; }
    const paragraph: string[] = [line]; i++;
    while (i < lines.length && lines[i].trim() && !/^\s*(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|```)/u.test(lines[i])) paragraph.push(lines[i++]);
    blocks.push(<p key={i}>{paragraph.map((text, j) => <Fragment key={j}>{j > 0 && <br />}{inline(text)}</Fragment>)}</p>);
  }
  return <>{blocks}</>;
}
