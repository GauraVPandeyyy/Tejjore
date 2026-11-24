// JSON-LD can contain database content, so "<" is escaped: a value such as "</script>" can never
// close the script element.
export function StructuredData({ data }: { data: Record<string, unknown> | Array<Record<string, unknown>> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
