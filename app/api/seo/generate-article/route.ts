import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { claude, MODEL, MAX_TOKENS, WEB_SEARCH_TOOL, SEO_SYSTEM_PROMPT } from "@/lib/claude";

function sse(data: object) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { siteId, keyword, wordCount = 1500 } = await req.json();

  const site = await prisma.site.findFirst({
    where: { id: siteId, userId: session.user.id },
  });
  if (!site) {
    return new Response("Site not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  async function write(data: object) {
    await writer.write(encoder.encode(sse(data)));
  }

  // Run generation in background, stream progress
  (async () => {
    try {
      // Step 0: Research
      await write({ step: 0, status: "running" });

      const researchResponse = await claude.messages.create({
        model: MODEL,
        max_tokens: 2000,
        system: SEO_SYSTEM_PROMPT,
        tools: [WEB_SEARCH_TOOL],
        messages: [
          {
            role: "user",
            content: `Search for the top 5 articles ranking for "${keyword}". Summarize:
1. Common headings/sections used
2. Average content depth (word count estimate)
3. Key points covered
4. Content gaps (what they miss)

Be concise. This is for writing a competing article for ${site.domain}.`,
          },
        ],
      });

      const researchText =
        researchResponse.content
          .filter((b) => b.type === "text")
          .map((b) => b.type === "text" ? b.text : "")
          .join("\n") ?? "";

      await write({ step: 0, status: "done" });

      // Step 1: Outline
      await write({ step: 1, status: "running" });

      const outlineResponse = await claude.messages.create({
        model: MODEL,
        max_tokens: 2000,
        system: SEO_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Based on this research about "${keyword}":
${researchText}

Create a detailed article outline for ${site.domain} with:
- H1 title (include keyword, compelling, under 60 chars)
- H2 sections (5-7 sections)
- H3 subsections where appropriate
- FAQ section (3-5 questions)
- Meta title (under 60 chars)
- Meta description (under 160 chars)
- URL slug

Format as structured markdown.`,
          },
        ],
      });

      const outlineText =
        outlineResponse.content
          .filter((b) => b.type === "text")
          .map((b) => b.type === "text" ? b.text : "")
          .join("\n") ?? "";

      await write({ step: 1, status: "done" });

      // Step 2: Write article
      await write({ step: 2, status: "running" });

      const articleResponse = await claude.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SEO_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Write a complete, ${wordCount}-word SEO article for "${keyword}" for ${site.domain}.

Use this outline:
${outlineText}

Requirements:
- Natural keyword placement (not stuffed) — use "${keyword}" in first 100 words
- Conversational but authoritative tone
- Short paragraphs (2-4 sentences)
- Include transition words
- Add relevant statistics/data where appropriate
- End with a clear CTA

Write in markdown format. Include the full article, not a summary.`,
          },
        ],
      });

      const articleContent =
        articleResponse.content
          .filter((b) => b.type === "text")
          .map((b) => b.type === "text" ? b.text : "")
          .join("\n") ?? "";

      await write({ step: 2, status: "done" });

      // Step 3: Parse + save
      await write({ step: 3, status: "running" });

      // Extract title from first H1
      const titleMatch = articleContent.match(/^#\s+(.+)$/m);
      const title = titleMatch?.[1] ?? keyword;

      // Extract meta from outline
      const metaTitleMatch = outlineText.match(/meta title[:\s]+(.+)/i);
      const metaDescMatch = outlineText.match(/meta description[:\s]+(.+)/i);
      const slugMatch = outlineText.match(/url slug[:\s]+([a-z0-9-]+)/i);

      const slug =
        slugMatch?.[1] ??
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

      const wordCountActual = articleContent
        .replace(/[#*`_]/g, "")
        .split(/\s+/)
        .filter(Boolean).length;

      const article = await prisma.article.create({
        data: {
          siteId,
          title,
          slug,
          content: articleContent,
          targetKeyword: keyword,
          metaTitle: metaTitleMatch?.[1]?.trim() ?? title,
          metaDescription: metaDescMatch?.[1]?.trim() ?? "",
          wordCount: wordCountActual,
          status: "draft",
        },
      });

      await write({ step: 3, status: "done" });
      await write({ articleId: article.id });
    } catch (err) {
      await write({
        error: err instanceof Error ? err.message : "Generation failed",
      });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
