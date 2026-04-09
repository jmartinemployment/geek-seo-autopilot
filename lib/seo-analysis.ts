/**
 * SEO Analysis Engine — TypeScript port of Geek-SEO content-analysis.js
 * Performs 11 checks and returns a score 0-100.
 */

export type CheckStatus = "good" | "warning" | "danger";

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  message: string;
}

export interface SEOAnalysisResult {
  score: number;
  checks: CheckResult[];
}

export interface SEOAnalysisInput {
  keyword: string;
  title: string;
  metaDescription: string;
  slug: string;
  content: string;
  /** Plain text — strip markdown before passing */
  contentText?: string;
}

/** Strip markdown to plain text for word counting / keyword analysis */
export function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/!\[.*?\]\(.*?\)/g, "") // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/[*_`~]/g, "") // bold/italic/code
    .replace(/<[^>]+>/g, "") // HTML tags
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function checkKeywordInField(
  keyword: string,
  value: string,
  id: string,
  label: string
): CheckResult {
  if (!keyword) {
    return { id, label, status: "warning", message: "No focus keyword set." };
  }
  const found = value.toLowerCase().includes(keyword.toLowerCase());
  return {
    id,
    label,
    status: found ? "good" : "danger",
    message: found
      ? "Focus keyword found."
      : `Focus keyword not found. Add "${keyword}" to improve relevance.`,
  };
}

function checkKeywordInSlug(keyword: string, slug: string): CheckResult {
  const id = "keyword-slug";
  const label = "Focus keyword in URL";

  if (!keyword) {
    return { id, label, status: "warning", message: "No focus keyword set." };
  }

  const kwSlug = keyword.toLowerCase().replace(/\s+/g, "-");
  const found =
    slug.toLowerCase().includes(kwSlug) ||
    slug.toLowerCase().includes(keyword.toLowerCase().replace(/\s+/g, ""));

  return {
    id,
    label,
    status: found ? "good" : "warning",
    message: found
      ? "Focus keyword found in URL."
      : "Consider adding your focus keyword to the URL slug.",
  };
}

function checkKeywordInFirstParagraph(
  keyword: string,
  content: string
): CheckResult {
  const id = "keyword-first-para";
  const label = "Focus keyword in introduction";

  if (!keyword) {
    return { id, label, status: "warning", message: "No focus keyword set." };
  }

  const firstChunk = content.split(/\s+/).slice(0, 200).join(" ");
  const found = firstChunk.toLowerCase().includes(keyword.toLowerCase());

  return {
    id,
    label,
    status: found ? "good" : "warning",
    message: found
      ? "Focus keyword appears in the introduction."
      : "Include your focus keyword in the first paragraph for better SEO.",
  };
}

function checkKeywordDensity(keyword: string, content: string): CheckResult {
  const id = "keyword-density";
  const label = "Keyword density";

  if (!keyword || !content.trim()) {
    return {
      id,
      label,
      status: "warning",
      message: "Not enough content to calculate density.",
    };
  }

  const words = content.toLowerCase().split(/\s+/).filter(Boolean);
  const totalWords = words.length;
  if (totalWords === 0) {
    return {
      id,
      label,
      status: "warning",
      message: "No content to analyze.",
    };
  }

  const kwLower = keyword.toLowerCase();
  const kwWordCount = kwLower.split(/\s+/).length;
  const fullText = words.join(" ");

  let count = 0;
  let pos = 0;
  while (true) {
    pos = fullText.indexOf(kwLower, pos);
    if (pos === -1) break;
    count++;
    pos += kwLower.length;
  }

  const density = (count * kwWordCount / totalWords) * 100;
  const rounded = Math.round(density * 10) / 10;

  if (density < 0.5) {
    return {
      id,
      label,
      status: "warning",
      message: `Keyword density is ${rounded}% — below 0.5%. Use your keyword more often.`,
    };
  }
  if (density > 2.5) {
    return {
      id,
      label,
      status: "danger",
      message: `Keyword density is ${rounded}% — above 2.5%. Reduce usage to avoid keyword stuffing.`,
    };
  }
  return {
    id,
    label,
    status: "good",
    message: `Keyword density is ${rounded}% — within the recommended 0.5–2.5% range.`,
  };
}

function checkTitleLength(title: string): CheckResult {
  const id = "title-length";
  const label = "SEO title length";
  const len = title.length;

  if (len === 0)
    return { id, label, status: "danger", message: "No SEO title set." };
  if (len >= 50 && len <= 60)
    return {
      id,
      label,
      status: "good",
      message: `Title is ${len} characters — optimal length.`,
    };
  if (len < 30)
    return {
      id,
      label,
      status: "danger",
      message: `Title is only ${len} characters. Aim for 50–60.`,
    };
  if (len < 50)
    return {
      id,
      label,
      status: "warning",
      message: `Title is ${len} characters. Aim for 50–60.`,
    };
  return {
    id,
    label,
    status: "warning",
    message: `Title is ${len} characters — may be truncated. Aim for 50–60.`,
  };
}

function checkDescriptionLength(desc: string): CheckResult {
  const id = "desc-length";
  const label = "Meta description length";
  const len = desc.length;

  if (len === 0)
    return {
      id,
      label,
      status: "warning",
      message: "No meta description set. A custom one is recommended.",
    };
  if (len >= 120 && len <= 160)
    return {
      id,
      label,
      status: "good",
      message: `Description is ${len} characters — optimal length.`,
    };
  if (len < 120)
    return {
      id,
      label,
      status: "warning",
      message: `Description is ${len} characters. Aim for 120–160.`,
    };
  return {
    id,
    label,
    status: "warning",
    message: `Description is ${len} characters — may be truncated. Aim for 120–160.`,
  };
}

function checkContentLength(content: string): CheckResult {
  const id = "content-length";
  const label = "Content length";
  const words = content.trim().split(/\s+/).filter(Boolean).length;

  if (words >= 1000)
    return {
      id,
      label,
      status: "good",
      message: `${words} words — great content depth.`,
    };
  if (words >= 300)
    return {
      id,
      label,
      status: "good",
      message: `${words} words — meets the minimum 300-word recommendation.`,
    };
  if (words >= 150)
    return {
      id,
      label,
      status: "warning",
      message: `${words} words — consider adding more. 300+ words recommended.`,
    };
  return {
    id,
    label,
    status: "danger",
    message: `${words} words — content is too short. Aim for at least 300 words.`,
  };
}

function checkImageAltText(keyword: string, content: string): CheckResult {
  const id = "image-alt";
  const label = "Image alt text with keyword";

  if (!keyword)
    return { id, label, status: "warning", message: "No focus keyword set." };

  // Look for markdown images ![alt](url) or HTML <img alt="...">
  const mdImageAltRegex = /!\[([^\]]*)\]\([^)]+\)/g;
  const htmlImageAltRegex = /<img[^>]+alt=["']([^"']*)["'][^>]*>/gi;

  const alts: string[] = [];
  let m;
  while ((m = mdImageAltRegex.exec(content)) !== null) alts.push(m[1]);
  while ((m = htmlImageAltRegex.exec(content)) !== null) alts.push(m[1]);

  if (alts.length === 0)
    return {
      id,
      label,
      status: "warning",
      message: "No images found in content. Adding images improves engagement.",
    };

  const hasKw = alts.some((alt) =>
    alt.toLowerCase().includes(keyword.toLowerCase())
  );
  return {
    id,
    label,
    status: hasKw ? "good" : "warning",
    message: hasKw
      ? "At least one image has alt text containing the focus keyword."
      : "No image alt text contains the focus keyword. Add it to at least one image.",
  };
}

function checkInternalLinks(content: string, domain: string): CheckResult {
  const id = "internal-links";
  const label = "Internal links";

  // Match markdown links [text](url) and HTML <a href="url">
  const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const htmlLinkRegex = /<a[^>]+href=["']([^"']*)["'][^>]*>/gi;

  const hrefs: string[] = [];
  let m;
  while ((m = mdLinkRegex.exec(content)) !== null) hrefs.push(m[2]);
  while ((m = htmlLinkRegex.exec(content)) !== null) hrefs.push(m[1]);

  const internalLinks = hrefs.filter((href) => {
    if (href.startsWith("/") || href.startsWith("#")) return true;
    try {
      return new URL(href).hostname.includes(domain.replace(/^www\./, ""));
    } catch {
      return false;
    }
  });

  if (internalLinks.length > 0)
    return {
      id,
      label,
      status: "good",
      message: `${internalLinks.length} internal link(s) found.`,
    };
  return {
    id,
    label,
    status: "warning",
    message: "No internal links found. Link to other pages on your site.",
  };
}

function checkOutboundLinks(content: string, domain: string): CheckResult {
  const id = "outbound-links";
  const label = "Outbound links";

  const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const htmlLinkRegex = /<a[^>]+href=["']([^"']*)["'][^>]*>/gi;

  const hrefs: string[] = [];
  let m;
  while ((m = mdLinkRegex.exec(content)) !== null) hrefs.push(m[2]);
  while ((m = htmlLinkRegex.exec(content)) !== null) hrefs.push(m[1]);

  const outboundLinks = hrefs.filter((href) => {
    if (
      href.startsWith("/") ||
      href.startsWith("#") ||
      href.startsWith("mailto:")
    )
      return false;
    try {
      return !new URL(href).hostname.includes(domain.replace(/^www\./, ""));
    } catch {
      return false;
    }
  });

  if (outboundLinks.length > 0)
    return {
      id,
      label,
      status: "good",
      message: `${outboundLinks.length} outbound link(s) found.`,
    };
  return {
    id,
    label,
    status: "warning",
    message:
      "No outbound links found. Linking to authoritative sources can improve trust.",
  };
}

/** Score weights: good=10, warning=5, danger=0 per check */
function calculateScore(checks: CheckResult[]): number {
  const total = checks.length * 10;
  const earned = checks.reduce((sum, c) => {
    if (c.status === "good") return sum + 10;
    if (c.status === "warning") return sum + 5;
    return sum;
  }, 0);
  return Math.round((earned / total) * 100);
}

export function analyzeSEO(
  input: SEOAnalysisInput,
  domain = ""
): SEOAnalysisResult {
  const text = input.contentText ?? stripMarkdown(input.content);

  const checks: CheckResult[] = [
    checkKeywordInField(
      input.keyword,
      input.title,
      "keyword-title",
      "Focus keyword in SEO title"
    ),
    checkKeywordInField(
      input.keyword,
      input.metaDescription,
      "keyword-desc",
      "Focus keyword in meta description"
    ),
    checkKeywordInSlug(input.keyword, input.slug),
    checkKeywordInFirstParagraph(input.keyword, text),
    checkKeywordDensity(input.keyword, text),
    checkTitleLength(input.title),
    checkDescriptionLength(input.metaDescription),
    checkContentLength(text),
    checkImageAltText(input.keyword, input.content),
    checkInternalLinks(input.content, domain),
    checkOutboundLinks(input.content, domain),
  ];

  return {
    score: calculateScore(checks),
    checks,
  };
}
