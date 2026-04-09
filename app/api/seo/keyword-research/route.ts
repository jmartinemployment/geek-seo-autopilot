import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { claude, MODEL, MAX_TOKENS, WEB_SEARCH_TOOL, SEO_SYSTEM_PROMPT } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { siteId, topic } = await req.json();
  if (!siteId || !topic) {
    return NextResponse.json({ error: "siteId and topic required" }, { status: 400 });
  }

  const site = await prisma.site.findFirst({
    where: { id: siteId, userId: session.user.id },
  });
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const response = await claude.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SEO_SYSTEM_PROMPT,
    tools: [WEB_SEARCH_TOOL],
    messages: [
      {
        role: "user",
        content: `Research the top 20 SEO keywords for the topic "${topic}" for a website at ${site.domain}.

Use web search to find current search trends and competition data.

Return a JSON array of exactly 20 keywords with this structure:
[
  {
    "keyword": "exact keyword phrase",
    "searchVolume": "low|medium|high",
    "difficulty": 0-100,
    "intent": "informational|commercial|transactional|navigational",
    "longTail": true|false,
    "suggestedTitle": "suggested blog post title using this keyword",
    "topicCluster": "cluster name"
  }
]

Focus on a mix of:
- High-volume head terms (2-3 keywords)
- Medium-competition middle terms (10 keywords)
- Low-competition long-tail keywords (7-8 keywords)

Return ONLY the JSON array, no explanation.`,
      },
    ],
  });

  // Extract the last text block
  const textBlock = response.content
    .filter((b) => b.type === "text")
    .pop();

  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json({ error: "No response from Claude" }, { status: 500 });
  }

  let keywords;
  try {
    // Extract JSON from the response (may have markdown code fences)
    const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found");
    keywords = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse keyword results" },
      { status: 500 }
    );
  }

  return NextResponse.json({ keywords });
}
