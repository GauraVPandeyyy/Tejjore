import { authorizeAdmin } from "@/lib/admin/authz";
import { CmsUnavailable } from "@/lib/admin/cms/engine";
import { cmsErrorResponse, cmsJson } from "@/lib/admin/cms/http";
import { getApprovedAiKnowledge } from "@/lib/content/aiKnowledge";
import { contentDatabase } from "@/lib/content/db";

const words = (value: string) => new Set(value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 2));

/**
 * GET ?topic=&q= → exactly what the public knowledge getter returns now (read uncached, through
 * the same public + approved filter), optionally ranked by word overlap with a test question.
 * Phase 7 replaces the ranking with the concierge's own retrieval.
 */
export async function GET(request: Request) {
  const auth = await authorizeAdmin(request, "ai_knowledge.view");
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const topic = url.searchParams.get("topic")?.trim() || null;
  const question = (url.searchParams.get("q") ?? "").slice(0, 300);
  try {
    const db = contentDatabase();
    if (!db) throw new CmsUnavailable("Content editing needs the database (DATABASE_URL with migrations 003–005).");
    const result = await getApprovedAiKnowledge(topic, { db });
    const asked = words(question);
    const ranked = result.data
      .map((entry) => ({ entry, score: [...words(`${entry.question} ${entry.answer}`)].filter((word) => asked.has(word)).length }))
      .filter((item) => !asked.size || item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    return cmsJson({ source: result.source, total: result.data.length, matches: ranked.map(({ entry, score }) => ({ ...entry, score })) });
  } catch (error) {
    return cmsErrorResponse("ai-knowledge/preview", error, "The preview could not be loaded.");
  }
}
