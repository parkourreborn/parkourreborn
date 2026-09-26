export function knowledgeExcerpt(body: string, query: string, title: string) {
  const version = query.match(/\b\d+(?:\.\d+)+\b/)?.[0];
  if (title === 'Update Timeline' && version) {
    const rows = body.split(/\r?\n/).filter((line) => new RegExp(`^\\|\\s*${version.replace(/\./g, '\\.')}\\s*\\|`).test(line));
    if (rows.length) return `Version rows:\n${rows.join('\n')}`;
  }

  if (body.length <= 3000) return body;
  const sections = body.split(/(?=^#{2,3}\s)/m).filter(Boolean);
  const terms = query.toLowerCase().match(/\b\d+(?:\.\d+)+\b|[a-z][a-z0-9-]{2,}/g) ?? [];
  const ranked = sections.map((section, index) => ({
    section,
    index,
    score: terms.reduce((total, term) => total + (section.toLowerCase().includes(term) ? 1 : 0), 0),
  })).sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked.slice(0, 3).sort((a, b) => a.index - b.index).map(({ section }) => section.trim()).join('\n\n').slice(0, 4000);
}
