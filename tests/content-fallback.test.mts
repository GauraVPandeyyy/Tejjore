import { strict as assert } from "node:assert";
import { beforeEach, describe, test } from "node:test";
import { isolateEnv, setEnv } from "./setup/env.mts";

// The public site must stay usable when content reads fail, and the fallback must never expose
// content the ledger forbids (placeholder/conflict facts, demo reviews, demo offers, placeholder
// policies, illustrative media as photography).
isolateEnv();

const { getRooms } = await import("../src/lib/content/rooms");
const { getPublicPropertyFacts } = await import("../src/lib/content/facts");
const { getPublishedFaqs } = await import("../src/lib/content/faqs");
const { getPublishedPolicies } = await import("../src/lib/content/policies");
const { getPublishedTestimonials } = await import("../src/lib/content/testimonials");
const { getActiveOffers } = await import("../src/lib/content/offers");
const { getApprovedAiKnowledge } = await import("../src/lib/content/aiKnowledge");
const { getActiveAnnouncements } = await import("../src/lib/content/announcements");
const { getRestaurantMenu, getRestaurantSettings } = await import("../src/lib/content/restaurant");
const { getGalleryImages } = await import("../src/lib/content/media");
const { getReadyTourScenes } = await import("../src/lib/content/tour");
const { resetContentCircuit } = await import("../src/lib/content/source");
const { propertyFactSources } = await import("../src/data/propertyFacts");
const { DEMO_REVIEWS } = await import("../src/data/reviews");
const { homeFaqs } = await import("../src/data/hospitality");

const refused = { query: async () => { throw Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }); } };
const unmigrated = { query: async () => { throw Object.assign(new Error('relation "rooms" does not exist'), { code: "42P01" }); } };
const silence = () => {
  const original = console.warn;
  const messages: string[] = [];
  console.warn = (...args: unknown[]) => { messages.push(args.join(" ")); };
  return { messages, restore: () => { console.warn = original; } };
};

describe("database failure → safe fallback", () => {
  beforeEach(() => resetContentCircuit());

  test("rooms, facts, FAQs, policies and the menu all render from the fallback", async () => {
    const log = silence();
    try {
      const rooms = await getRooms({ db: refused });
      assert.equal(rooms.source, "fallback");
      assert.deepEqual(rooms.data.map((room) => room.id), ["deluxe", "super-deluxe", "premium"]);
      assert.ok(rooms.data.every((room) => room.imageSet.length > 0 && room.startingPrice));

      const facts = await getPublicPropertyFacts({ db: refused });
      assert.equal(facts.source, "fallback");
      assert.equal(facts.data.text("name"), "Tejjora Lake View");

      const faqs = await getPublishedFaqs({ db: refused });
      assert.deepEqual(faqs.data.map((faq) => faq.question), homeFaqs.map((faq) => faq.q));

      const policies = await getPublishedPolicies({ db: refused });
      assert.deepEqual(policies.data, [], "placeholder policies are never returned as approved policy");

      const menu = await getRestaurantMenu({ db: refused });
      assert.equal(menu.source, "fallback");
      assert.equal(menu.data.flatMap((category) => category.items).length, 90);
      assert.ok(log.messages.some((message) => message.includes("using fallback content")));
    } finally {
      log.restore();
    }
  });

  test("missing content tables (migrations not applied) fall back with a migrate hint", async () => {
    const log = silence();
    try {
      assert.equal((await getRooms({ db: unmigrated })).source, "fallback");
      assert.ok(log.messages.some((message) => message.includes("npm run db:migrate")));
    } finally {
      log.restore();
    }
  });

  test("no DATABASE_URL → fallback without any connection attempt", async () => {
    setEnv({ DATABASE_URL: "" });
    const result = await getRooms();
    assert.equal(result.source, "fallback");
    assert.equal(result.data.length, 3);
  });

  test("the fallback never exposes disallowed content", async () => {
    const log = silence();
    try {
      const facts = await getPublicPropertyFacts({ db: refused });
      const exposed = new Set(facts.data.entries.map((entry) => entry.key));
      for (const fact of propertyFactSources) {
        assert.equal(exposed.has(fact.key), fact.status === "verified" && fact.public, `${fact.key} (${fact.status})`);
      }
      const testimonials = await getPublishedTestimonials({ db: refused });
      assert.deepEqual(testimonials.data, []);
      const demoTexts = new Set(DEMO_REVIEWS.map((review) => review.text));
      assert.ok(testimonials.data.every((item) => !demoTexts.has(item.text)));
      assert.deepEqual((await getActiveOffers({ db: refused })).data, [], "demo offers are never public");
      assert.deepEqual((await getApprovedAiKnowledge(null, { db: refused })).data, []);
      assert.deepEqual((await getActiveAnnouncements({ db: refused })).data, []);

      const gallery = await getGalleryImages({ db: refused });
      assert.ok(gallery.data.length > 0);
      assert.ok(gallery.data.every((image) => !/\.svg$|\/[dm][1-4]\.png$|panoramas\//.test(image.src)), "no placeholder or illustrative art in the photo gallery");

      const tour = await getReadyTourScenes({ db: refused });
      assert.ok(tour.data.length >= 1);
      assert.ok(tour.data.every((scene) => !scene.isPropertyMedia && scene.provenance === "placeholder"), "demo panoramas keep their non-property provenance");
    } finally {
      log.restore();
    }
  });

  test("a malformed database row is skipped instead of crashing the page", async () => {
    const log = silence();
    try {
      const good = { id: "deluxe", slug: "deluxe", name: "Deluxe Room", summary: "s", body: "b", size_sqft: null, bed_type: null, max_adults: null, max_children: null, view: null, amenities: [], sort_order: 0, published: true };
      const rows = [good, { ...good, id: "premium", slug: "premium", amenities: "not-an-array" }, { ...good, id: "suite-x", slug: "suite-x" }];
      const db = { query: async (text: string) => ({ rows: text.includes("FROM rooms") ? rows : [] }) };
      const result = await getRooms({ db });
      assert.equal(result.source, "database");
      assert.deepEqual(result.data.map((room) => room.id), ["deluxe"], "malformed and unknown room rows are dropped");
      assert.ok(log.messages.some((message) => message.includes("skipped invalid rooms row premium")));
    } finally {
      log.restore();
    }
  });
});
