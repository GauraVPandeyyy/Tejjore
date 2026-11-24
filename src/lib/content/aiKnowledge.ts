import "server-only";
import { isUsableKnowledge } from "./rules";
import type { AiKnowledgeRow } from "./rows";
import { readContent, type ReadOptions } from "./source";
import type { AiKnowledgeEntry, ContentResult } from "./types";
import { bool, mapRows, text } from "./validate";

function mapKnowledge(row: AiKnowledgeRow): AiKnowledgeEntry {
  return {
    id: text(row, "id", 200),
    topic: text(row, "topic", 40),
    question: text(row, "question", 300),
    answer: text(row, "answer", 3000),
    public: bool(row, "public"),
    approved: bool(row, "approved"),
  };
}

/** Exported for tests: the filter every knowledge entry passes before the concierge may use it. */
export const usableKnowledge = (rows: AiKnowledgeRow[]) => mapRows("ai_knowledge", rows, mapKnowledge).filter(isUsableKnowledge);

/**
 * Staff-approved public knowledge for the concierge (Phase 7 wires it into Gemini tools).
 * Nothing is seeded, so the fallback is empty.
 */
export async function getApprovedAiKnowledge(topic: string | null = null, options?: ReadOptions): Promise<ContentResult<AiKnowledgeEntry[]>> {
  const result = await readContent(
    {
      domain: "aiKnowledge",
      key: "ai-knowledge:approved",
      load: async (db) =>
        usableKnowledge(
          (
            await db.query<AiKnowledgeRow>(
              "SELECT id, topic, question, answer, public, approved FROM ai_knowledge WHERE public AND approved ORDER BY topic, id",
            )
          ).rows,
        ),
      fallback: () => [],
    },
    options,
  );
  return { data: topic ? result.data.filter((entry) => entry.topic === topic) : result.data, source: result.source };
}
