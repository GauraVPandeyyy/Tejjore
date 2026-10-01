import Link from "next/link";
import { rooms } from "@/data/rooms";
import { SectionLabel } from "@/components/shared/SectionLabel";

const comparisonRows = [
  { label: "Air conditioning", render: () => "Included" },
  { label: "Wi-Fi", render: () => "Included" },
  { label: "Flat-screen TV", render: () => "Included" },
  { label: "Work desk", render: () => "Included" },
  { label: "Private bathroom", render: () => "Included" },
  { label: "Lake view", render: () => "Confirm with hotel" },
  { label: "Bed configuration", render: () => "Confirm with hotel" },
  { label: "Max occupancy", render: () => "Confirm with hotel" },
] as const;

export function RoomComparison({ compact = false }: { compact?: boolean }) {
  return (
    <section id="compare" className={`room-comparison ${compact ? "room-comparison--compact" : ""}`.trim()} aria-labelledby="room-comparison-title" tabIndex={-1}>
      <div className="site-container">
        <div className="room-comparison__topline">
          <SectionLabel index="03B">COMPARE</SectionLabel>
          <Link href="/book" className="room-comparison__book">Check dates ↗</Link>
        </div>

        <div className="room-comparison__heading">
          <h2 id="room-comparison-title">Choose by what<br /><em>matters to you.</em></h2>
          <p>No invented room specifications: details that still require hotel confirmation are clearly marked instead of being guessed.</p>
        </div>

        <div className="room-comparison__table-wrap" tabIndex={0} aria-label="Room comparison table. Scroll horizontally on small screens.">
          <table className="room-comparison__table">
            <thead>
              <tr>
                <th scope="col">Room detail</th>
                {rooms.map((room, index) => (
                  <th scope="col" key={room.id}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{room.name}</strong>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {rooms.map((room) => <td key={room.id}>{row.render()}</td>)}
                </tr>
              ))}
              <tr className="room-comparison__cta-row">
                <th scope="row">Explore</th>
                {rooms.map((room) => (
                  <td key={room.id}><Link href={`/rooms#${room.id}`}>View room ↗</Link></td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
