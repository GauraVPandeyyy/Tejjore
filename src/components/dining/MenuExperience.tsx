import type { MenuCategory, RestaurantSettings } from "@/lib/content/types";
import { formatMoney } from "@/data/commerce";
import { Icon } from "@/components/ui/Icon";
import { MenuBrowser } from "./MenuBrowser";
import { operatingNotes, policyNotes } from "./diningFormat";

/**
 * The one menu experience, shared by /dining (in place, under the restaurant story) and
 * /dining/menu (the direct link): the verified operating notes as a quiet strip, the printed
 * policy notes, the egg legend, then the browser and its cart. Same component, same cart.
 */
export function MenuExperience({ menu, settings }: { menu: MenuCategory[]; settings: RestaurantSettings }) {
  const notes = operatingNotes(settings);
  const policies = policyNotes(settings);
  return (
    <div className="tj-menu-experience">
      {notes.length ? (
        <dl className="tj-menu-facts">
          {notes.map((note) => (
            <div key={note.label}>
              <dt>{note.label}</dt>
              <dd>{note.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <MenuBrowser menu={menu} settings={settings} />
      <div className="tj-menu-experience__foot">
        {policies.length ? (
          <ul className="tj-notes tj-notes--compact">
            {policies.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
        <p className="tj-menu-page__legend">
          <span className="tj-egg" aria-hidden="true">
            E
          </span>{" "}
          marks dishes that contain egg. Prices in rupees.
        </p>
      </div>
    </div>
  );
}

/**
 * The menu at a glance: every section as a numbered card with its dish count, a few dish names
 * and the starting price, each linking to that section of the menu. Typographic only — no food
 * photography exists yet, so none is implied.
 */
export function MenuOverview({ menu, hrefBase = "" }: { menu: MenuCategory[]; hrefBase?: string }) {
  return (
    <ol className="tj-menu-overview">
      {menu.map((category, index) => {
        const prices = category.items.map((item) => item.priceHalf ?? item.priceFull);
        const from = prices.length ? Math.min(...prices) : null;
        return (
          <li key={category.id}>
            <a className="tj-menu-overview__card" href={`${hrefBase}#${category.slug}`}>
              <span className="tj-menu-overview__no">{String(index + 1).padStart(2, "0")}</span>
              <span className="tj-menu-overview__name">{category.name}</span>
              <span className="tj-menu-overview__dishes">
                {category.items
                  .slice(0, 3)
                  .map((item) => item.name)
                  .join(" · ")}
                {category.items.length > 3 ? " …" : ""}
              </span>
              <span className="tj-menu-overview__meta">
                <span>
                  {category.items.length} {category.items.length === 1 ? "dish" : "dishes"}
                </span>
                {from !== null ? <span>from {formatMoney(from)}</span> : null}
                <Icon name="arrow-right" size={16} />
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
