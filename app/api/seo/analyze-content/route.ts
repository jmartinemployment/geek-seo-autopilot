import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { analyzeSEO, stripMarkdown } from "@/lib/seo-analysis";
import { analyzeReadability } from "@/lib/readability";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { keyword, title, metaDescription, slug, content } = await req.json();

  if (!content) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  const text = stripMarkdown(content);

  const seo = analyzeSEO({
    keyword: keyword ?? "",
    title: title ?? "",
    metaDescription: metaDescription ?? "",
    slug: slug ?? "",
    content,
    contentText: text,
  });

  const readability = analyzeReadability(text);

  return NextResponse.json({ seo, readability });
}
