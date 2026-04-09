import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import axios from "axios";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { articleId, siteId } = await req.json();
  if (!articleId || !siteId) {
    return NextResponse.json(
      { error: "articleId and siteId required" },
      { status: 400 }
    );
  }

  const [article, site] = await Promise.all([
    prisma.article.findFirst({
      where: { id: articleId, siteId, site: { userId: session.user.id } },
    }),
    prisma.site.findFirst({
      where: { id: siteId, userId: session.user.id },
    }),
  ]);

  if (!article || !site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!site.cmsApiUrl || !site.cmsApiKey) {
    return NextResponse.json(
      { error: "WordPress credentials not configured. Go to Site Settings." },
      { status: 400 }
    );
  }

  const baseUrl = site.cmsApiUrl.replace(/\/$/, "");
  const [username, appPassword] = site.cmsApiKey.split(":");
  const credentials = Buffer.from(`${username}:${appPassword}`).toString(
    "base64"
  );

  // Convert markdown content to HTML for WordPress
  const htmlContent = article.content
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(.+)$/, "<p>$1</p>");

  try {
    const response = await axios.post(
      `${baseUrl}/wp-json/wp/v2/posts`,
      {
        title: article.title,
        content: htmlContent,
        slug: article.slug,
        status: "draft",
        meta: {
          _yoast_wpseo_title: article.metaTitle,
          _yoast_wpseo_metadesc: article.metaDescription,
        },
      },
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    // Update article with CMS post ID
    await prisma.article.update({
      where: { id: articleId },
      data: {
        cmsPostId: String(response.data.id),
        publishedAt: new Date(),
        status: "published",
      },
    });

    return NextResponse.json({
      success: true,
      wpPostId: response.data.id,
      wpPostUrl: response.data.link,
    });
  } catch (err) {
    const message = axios.isAxiosError(err)
      ? `WordPress error: ${err.response?.status ?? err.message}`
      : "Failed to publish to WordPress";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
