import "server-only";
import { isLiveAnnouncement } from "./rules";
import type { AnnouncementRow } from "./rows";
import { readContent, type ReadOptions } from "./source";
import type { Announcement, ContentResult } from "./types";
import { bool, mapRows, optionalText, text } from "./validate";

function mapAnnouncement(row: AnnouncementRow): Announcement {
  const link = optionalText(row, "link", 500);
  return {
    id: text(row, "id", 200),
    text: text(row, "text", 280),
    link: link && /^(\/|https:\/\/)/.test(link) ? link : null,
    publishFrom: optionalText(row, "publish_from", 40),
    publishUntil: optionalText(row, "publish_until", 40),
    published: bool(row, "published"),
  };
}

const ISO = (column: string) => `to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS ${column}`;

/** Published announcements whose window includes `now` (window applied per request, not cached). */
export async function getActiveAnnouncements(options: ReadOptions = {}): Promise<ContentResult<Announcement[]>> {
  const now = options.now ?? new Date();
  const result = await readContent(
    {
      domain: "announcements",
      key: "announcements:published",
      load: async (db) =>
        mapRows(
          "announcements",
          (
            await db.query<AnnouncementRow>(
              `SELECT id, text, link, ${ISO("publish_from")}, ${ISO("publish_until")}, published
                 FROM announcements WHERE published ORDER BY publish_from NULLS FIRST, id`,
            )
          ).rows,
          mapAnnouncement,
        ),
      fallback: () => [],
    },
    options,
  );
  return { data: result.data.filter((item) => isLiveAnnouncement(item, now)), source: result.source };
}
