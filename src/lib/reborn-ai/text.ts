const controlToken = /<\|[^|]*\|>/g;
const mdLink = /\[([^\]\n]*)\]\([^)\s]*\)/g;
const placeholder = /\s*\[[^\][\n]{0,40}\b(?:link|url|video|clip|gif|image|watch|here|below)\b[^\][\n]{0,40}\]/gi;
const heading = /^\s{0,3}#{1,6}\s+/gm;

export function cleanReply(raw: string) {
  return raw
    .replace(controlToken, '')
    .replace(heading, '')
    .replace(mdLink, '$1')
    .replace(placeholder, '')
    .replace(/\s*:\s*(?=[.!?]|$)/gm, '')
    .replace(/[ \t]+([.,!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
}

export type TextPart = {
  text: string;
  style: 'plain' | 'strong' | 'em' | 'code';
};

const inline = /\*\*([^*\n]+)\*\*|__([^_\n]+)__|`([^`\n]+)`|\*([^*\n]+)\*|(?<![a-zA-Z0-9])_([^_\n]+)_(?![a-zA-Z0-9])/g;

export function splitInline(value: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;

  for (const match of value.matchAll(inline)) {
    const at = match.index ?? 0;
    if (at > last) parts.push({ text: value.slice(last, at), style: 'plain' });

    if (match[1] ?? match[2]) parts.push({ text: (match[1] ?? match[2]) as string, style: 'strong' });
    else if (match[3]) parts.push({ text: match[3], style: 'code' });
    else parts.push({ text: (match[4] ?? match[5]) as string, style: 'em' });

    last = at + match[0].length;
  }

  if (last < value.length) parts.push({ text: value.slice(last), style: 'plain' });
  return parts.filter((part) => part.text);
}
