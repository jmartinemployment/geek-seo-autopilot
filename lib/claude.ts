import Anthropic from "@anthropic-ai/sdk";

export const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODEL = "claude-opus-4-6";
export const MAX_TOKENS = 8096;

export const WEB_SEARCH_TOOL = {
  type: "web_search_20250305" as const,
  name: "web_search" as const,
};

export const SEO_SYSTEM_PROMPT = `You are an expert SEO content strategist and writer.
You produce high-quality, well-researched content that ranks well in search engines.
Always write in a clear, engaging style optimized for both readers and search engines.
Your keyword research is data-driven and focused on actionable opportunities.`;
