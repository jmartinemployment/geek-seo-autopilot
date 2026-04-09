/**
 * Readability Analysis Engine — TypeScript port of Geek-SEO readability-analysis.js
 * Checks Flesch Reading Ease, sentence length, paragraph length, passive voice,
 * transition word usage, consecutive sentence starts, and subheading distribution.
 */

import type { CheckResult, CheckStatus } from "./seo-analysis";

export interface ReadabilityResult {
  score: number;
  checks: CheckResult[];
}

const TRANSITION_WORDS = [
  "additionally", "also", "as a result", "as well as", "because",
  "besides", "certainly", "consequently", "conversely", "equally",
  "eventually", "finally", "first", "for example", "for instance",
  "further", "furthermore", "hence", "however", "in addition",
  "in conclusion", "in contrast", "in fact", "in other words",
  "in particular", "in summary", "indeed", "instead", "lastly",
  "likewise", "meanwhile", "moreover", "nevertheless", "nonetheless",
  "notably", "on the other hand", "otherwise", "overall",
  "second", "similarly", "specifically", "still", "subsequently",
  "such as", "that is", "then", "therefore", "third", "though",
  "thus", "to begin with", "to illustrate", "to summarize",
  "ultimately", "whereas", "while", "yet",
];

const PAST_PARTICIPLE_PATTERN =
  /\b(?:is|are|was|were|be|been|being|am|get|gets|got|gotten)\s+(\w+ed|built|caught|chosen|done|drawn|driven|eaten|felt|found|given|gone|grown|heard|held|hidden|hit|hung|kept|known|laid|led|left|lent|lost|made|meant|met|paid|put|read|ridden|risen|run|said|seen|sent|set|shown|shut|sold|spent|spoken|stood|struck|sung|taken|taught|thought|told|torn|understood|woken|won|worn|written|brought|bought|cut)\b/i;

function countSyllables(word: string): number {
  word = word.toLowerCase().trim();
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^leas])e$/, "");
  word = word.replace(/(?:[^td])ed$/, "");
  const vowelGroups = word.match(/[aeiouy]+/g);
  return Math.max(vowelGroups ? vowelGroups.length : 1, 1);
}

function countTotalSyllables(text: string): number {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .reduce((sum, word) => sum + countSyllables(word.replace(/[^a-zA-Z]/g, "")), 0);
}

function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+(?:\s|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function extractHeadings(text: string): string[] {
  const headingRegex = /^#{2,6}\s+(.+)$/gm;
  const headings: string[] = [];
  let m;
  while ((m = headingRegex.exec(text)) !== null) headings.push(m[1]);
  return headings;
}

function checkFleschReadingEase(
  text: string,
  sentences: string[]
): CheckResult {
  const id = "flesch";
  const label = "Flesch Reading Ease";
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sentenceCount = sentences.length;

  if (wordCount < 10 || sentenceCount === 0) {
    return {
      id,
      label,
      status: "warning",
      message: "Not enough content to calculate readability score.",
    };
  }

  const syllables = countTotalSyllables(text);
  const score =
    206.835 -
    1.015 * (wordCount / sentenceCount) -
    84.6 * (syllables / wordCount);
  const rounded = Math.round(score * 10) / 10;

  if (rounded >= 60)
    return {
      id,
      label,
      status: "good",
      message: `Flesch score: ${rounded} — easy to read for a broad audience.`,
    };
  if (rounded >= 30)
    return {
      id,
      label,
      status: "warning",
      message: `Flesch score: ${rounded} — somewhat difficult. Try shorter sentences and simpler words.`,
    };
  return {
    id,
    label,
    status: "danger",
    message: `Flesch score: ${rounded} — very difficult to read. Simplify your language.`,
  };
}

function checkSentenceLength(sentences: string[]): CheckResult {
  const id = "sentence-length";
  const label = "Sentence length";

  if (sentences.length === 0)
    return { id, label, status: "warning", message: "No sentences found." };

  const longSentences = sentences.filter(
    (s) => s.split(/\s+/).length > 20
  ).length;
  const pct = Math.round((longSentences / sentences.length) * 100);

  if (pct <= 25)
    return {
      id,
      label,
      status: "good",
      message: `${pct}% of sentences exceed 20 words — within the recommended 25% max.`,
    };
  if (pct <= 40)
    return {
      id,
      label,
      status: "warning",
      message: `${pct}% of sentences exceed 20 words. Try to keep this under 25%.`,
    };
  return {
    id,
    label,
    status: "danger",
    message: `${pct}% of sentences exceed 20 words. Break up long sentences.`,
  };
}

function checkParagraphLength(paragraphs: string[]): CheckResult {
  const id = "paragraph-length";
  const label = "Paragraph length";

  if (paragraphs.length === 0)
    return { id, label, status: "warning", message: "No paragraphs found." };

  const longParagraphs = paragraphs.filter(
    (p) => p.split(/\s+/).length > 150
  ).length;

  if (longParagraphs === 0)
    return {
      id,
      label,
      status: "good",
      message: "All paragraphs are under 150 words.",
    };
  return {
    id,
    label,
    status: "warning",
    message: `${longParagraphs} paragraph(s) exceed 150 words. Break them into smaller chunks.`,
  };
}

function checkPassiveVoice(sentences: string[]): CheckResult {
  const id = "passive-voice";
  const label = "Passive voice";

  if (sentences.length === 0)
    return {
      id,
      label,
      status: "warning",
      message: "No sentences to analyze.",
    };

  const passiveCount = sentences.filter((s) =>
    PAST_PARTICIPLE_PATTERN.test(s)
  ).length;
  const pct = Math.round((passiveCount / sentences.length) * 100);

  if (pct <= 10)
    return {
      id,
      label,
      status: "good",
      message: `${pct}% of sentences use passive voice — excellent.`,
    };
  if (pct <= 20)
    return {
      id,
      label,
      status: "warning",
      message: `${pct}% of sentences use passive voice. Try to reduce to under 10%.`,
    };
  return {
    id,
    label,
    status: "danger",
    message: `${pct}% of sentences use passive voice. Rewrite in active voice.`,
  };
}

function checkTransitionWords(sentences: string[]): CheckResult {
  const id = "transition-words";
  const label = "Transition words";

  if (sentences.length === 0)
    return { id, label, status: "warning", message: "No sentences to analyze." };

  const withTransitions = sentences.filter((s) => {
    const lower = s.toLowerCase();
    return TRANSITION_WORDS.some((tw) => lower.includes(tw));
  }).length;
  const pct = Math.round((withTransitions / sentences.length) * 100);

  if (pct >= 30)
    return {
      id,
      label,
      status: "good",
      message: `${pct}% of sentences use transition words — great flow.`,
    };
  if (pct >= 15)
    return {
      id,
      label,
      status: "warning",
      message: `${pct}% of sentences use transition words. Aim for 30%+.`,
    };
  return {
    id,
    label,
    status: "danger",
    message: `${pct}% of sentences use transition words. Add more to improve flow.`,
  };
}

function checkSubheadingDistribution(
  text: string,
  headings: string[]
): CheckResult {
  const id = "subheadings";
  const label = "Subheading distribution";
  const words = text.split(/\s+/).filter(Boolean).length;

  if (words < 300)
    return {
      id,
      label,
      status: "warning",
      message: "Not enough content to evaluate subheading distribution.",
    };

  if (headings.length === 0)
    return {
      id,
      label,
      status: "danger",
      message: "No subheadings found. Add H2/H3 headings every 300 words.",
    };

  // Recommend 1 heading per ~300 words
  const recommended = Math.floor(words / 300);
  if (headings.length >= recommended)
    return {
      id,
      label,
      status: "good",
      message: `${headings.length} subheadings — good distribution for ${words} words.`,
    };

  return {
    id,
    label,
    status: "warning",
    message: `${headings.length} subheadings for ${words} words. Consider adding more (1 per ~300 words).`,
  };
}

function calculateScore(checks: CheckResult[]): number {
  const total = checks.length * 10;
  const earned = checks.reduce((sum, c) => {
    if (c.status === "good") return sum + 10;
    if (c.status === "warning") return sum + 5;
    return sum;
  }, 0);
  return Math.round((earned / total) * 100);
}

export function analyzeReadability(text: string): ReadabilityResult {
  const sentences = splitSentences(text);
  const paragraphs = splitParagraphs(text);
  const headings = extractHeadings(text);

  const checks: CheckResult[] = [
    checkFleschReadingEase(text, sentences),
    checkSentenceLength(sentences),
    checkParagraphLength(paragraphs),
    checkPassiveVoice(sentences),
    checkTransitionWords(sentences),
    checkSubheadingDistribution(text, headings),
  ];

  return { score: calculateScore(checks), checks };
}
