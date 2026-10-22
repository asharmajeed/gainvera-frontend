const stop = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "for",
  "in",
  "on",
  "we",
  "our",
  "with",
  "from",
  "is",
  "it",
  "each",
  "this",
]);
const tokens = (s: string) =>
  (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => !stop.has(t));
// TF-IDF with smoothed document frequency and cosine normalization. No model training.
export function matchText(
  query: string,
  documents: string[],
): { index: number; similarity: number } {
  const docs = documents.map(tokens);
  const qt = tokens(query);
  const vocab = new Set([...docs.flat(), ...qt]);
  const idf = new Map(
    [...vocab].map((t) => [
      t,
      Math.log(
        (docs.length + 1) / (docs.filter((d) => d.includes(t)).length + 1),
      ) + 1,
    ]),
  );
  const vector = (terms: string[]) => {
    const counts = new Map<string, number>();
    terms.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1));
    return new Map(
      [...counts].map(([t, c]) => [t, (1 + Math.log(c)) * idf.get(t)!]),
    );
  };
  const qv = vector(qt);
  const norm = (v: Map<string, number>) =>
    Math.sqrt([...v.values()].reduce((s, x) => s + x * x, 0));
  const scores = docs.map((d) => {
    const v = vector(d);
    const denominator = norm(qv) * norm(v);
    return denominator
      ? [...qv].reduce((s, [t, x]) => s + x * (v.get(t) ?? 0), 0) / denominator
      : 0;
  });
  const max = Math.max(0, ...scores);
  return { index: max ? scores.indexOf(max) : -1, similarity: max };
}
