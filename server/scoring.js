// Keyword-coverage scoring: how many of the job description's distinctive
// terms also appear in the resume, weighted by how often the JD repeats them.

const MAX_KEYWORDS = 30;

const STOPWORDS = new Set(
  (
    'a about above after again all also am an and any are as at be because been before being ' +
    'below between both but by can could did do does doing down during each etc few for from ' +
    'further had has have having he her here hers him his how i if in into is it its itself ' +
    'just me more most must my no nor not now of off on once only or other our ours out over ' +
    'own per same she should so some such than that the their theirs them then there these ' +
    'they this those through to too under until up upon us very via was we were what when ' +
    'where which while who whom why will with within without would you your yours ' +
    // Job-posting boilerplate that says nothing about the actual role.
    'ability able apply applicant applicants candidate candidates company degree environment ' +
    'excellent experience experienced familiarity good great ideal including join job knowledge ' +
    'looking new opportunity plus preferred required requirement requirements responsibilities ' +
    'responsible role skills strong team teams understanding using work working year years'
  ).split(' ')
);

// Keeps tech tokens like "c++", "c#" and "node.js" whole; drops trailing punctuation.
const TOKEN_PATTERN = /[a-z0-9][a-z0-9+#.]*[a-z0-9+#]|[a-z0-9]/g;

function normalise(token) {
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) {
    return token.slice(0, -1);
  }
  return token;
}

function tokenize(text) {
  return text.toLowerCase().match(TOKEN_PATTERN) || [];
}

function isKeyword(token) {
  return token.length > 1 && !STOPWORDS.has(token) && !/^\d+$/.test(token);
}

function extractKeywords(jobDescription) {
  const byStem = new Map();
  for (const token of tokenize(jobDescription).filter(isKeyword)) {
    const stem = normalise(token);
    const entry = byStem.get(stem);
    if (entry) {
      entry.weight += 1;
    } else {
      byStem.set(stem, { stem, term: token, weight: 1 });
    }
  }
  // Map preserves insertion order and sort is stable, so ties keep JD order.
  return [...byStem.values()]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_KEYWORDS);
}

function scoreAgainstJobDescription(resumeText, jobDescription) {
  const keywords = extractKeywords(jobDescription);
  const resumeStems = new Set(tokenize(resumeText).map(normalise));

  const matched = keywords.filter((k) => resumeStems.has(k.stem));
  const missing = keywords.filter((k) => !resumeStems.has(k.stem));
  const totalWeight = keywords.reduce((sum, k) => sum + k.weight, 0);
  const matchedWeight = matched.reduce((sum, k) => sum + k.weight, 0);

  return {
    score: totalWeight === 0 ? 0 : Math.round((matchedWeight / totalWeight) * 100),
    keywordCount: keywords.length,
    matchedKeywords: matched.map((k) => k.term),
    missingKeywords: missing.map((k) => k.term),
  };
}

module.exports = { scoreAgainstJobDescription, extractKeywords };
