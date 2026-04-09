import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import axios from "axios";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cmsType, cmsApiUrl, cmsApiKey } = await req.json();

  if (!cmsApiUrl) {
    return NextResponse.json({ error: "API URL required" }, { status: 400 });
  }

  try {
    if (cmsType === "wordpress") {
      // Test WP REST API
      const baseUrl = cmsApiUrl.replace(/\/$/, "");
      const [username, appPassword] = (cmsApiKey ?? ":").split(":");
      const credentials = Buffer.from(`${username}:${appPassword}`).toString(
        "base64"
      );

      await axios.get(`${baseUrl}/wp-json/wp/v2/posts?per_page=1`, {
        headers: { Authorization: `Basic ${credentials}` },
        timeout: 8000,
      });

      return NextResponse.json({ success: true, message: "WordPress connected" });
    }

    // Custom API: just do a GET to the URL
    await axios.get(cmsApiUrl, { timeout: 8000 });
    return NextResponse.json({ success: true, message: "Connected" });
  } catch (err) {
    const message =
      axios.isAxiosError(err)
        ? `Connection failed: ${err.response?.status ?? err.message}`
        : "Connection failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
