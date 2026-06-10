/**
 * Seed randomized product reviews/ratings for launch social proof.
 *
 *   - Every product gets 50-100 ratings, with an average in [4.2, 4.95].
 *   - 8-9 of those ratings per product are written reviews (title + body).
 *   - Written-review copy is chosen by a per-product "persona" (the product's
 *     vibe, e.g. coastal-linen / heritage-plaid / resort-polo / travel-utility
 *     / everyday-tee / quiet-luxury). It evokes the vibe, never names the product.
 *   - Copy is dealt WITHOUT repetition within a product (each of a product's
 *     written reviews gets a distinct title and body), and the banks are shuffled
 *     per product so different products read differently.
 *   - Reviewers come from an identifiable seed-user pool (emails end in
 *     `@seed.reviews`) so they're easy to filter/delete later.
 *   - Re-runnable: products without seed reviews are seeded fresh; products that
 *     already have them get their written-review COPY refreshed in place
 *     (ratings/counts/users/timestamps untouched). So editing the copy below and
 *     re-running updates the live reviews without re-rolling the numbers.
 *
 * Run:  pnpm --filter @earth-revibe/db db:seed:reviews
 * NOTE: writes to whatever DATABASE_URL points at (prod, in this project).
 *       These are placeholder reviews; replace with genuine ones over time.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const USER_POOL_SIZE = 220; // > max ratings/product so each product gets distinct reviewers

const FIRST_NAMES = [
  'Aarav',
  'Vivaan',
  'Aditya',
  'Arjun',
  'Sai',
  'Reyansh',
  'Krishna',
  'Ishaan',
  'Rohan',
  'Kabir',
  'Ananya',
  'Diya',
  'Saanvi',
  'Aadhya',
  'Myra',
  'Anika',
  'Riya',
  'Ira',
  'Kiara',
  'Navya',
  'Karan',
  'Rahul',
  'Neha',
  'Priya',
  'Sneha',
  'Ayaan',
  'Dev',
  'Tara',
  'Zara',
  'Mehul',
  'Nikhil',
  'Pooja',
  'Sanya',
  'Veer',
  'Aryan',
  'Isha',
  'Manav',
  'Tanya',
  'Yash',
  'Simran',
];
const LAST_NAMES = [
  'Sharma',
  'Verma',
  'Gupta',
  'Singh',
  'Kumar',
  'Patel',
  'Reddy',
  'Nair',
  'Iyer',
  'Mehta',
  'Shah',
  'Joshi',
  'Rao',
  'Das',
  'Bose',
  'Kapoor',
  'Malhotra',
  'Chopra',
  'Bhat',
  'Menon',
];

type Persona = 'coastal' | 'heritage' | 'resort' | 'utility' | 'everyday' | 'quiet';

// Per-product persona copy. Old-money / vacation voice, understated and warm,
// with a tasteful emoji and no em dashes. Each line evokes the product's vibe
// without ever naming the product. Banks are deliberately large so a product's
// 8-9 written reviews can all be distinct.
const POSITIVE: Record<Persona, { titles: string[]; bodies: string[] }> = {
  // linen, sea, Mediterranean, sailing, villa, harbour
  coastal: {
    titles: [
      'Sea breeze in fabric form 🌊',
      'Made for the coast ⛵️',
      'A holiday in one piece 🏖️',
      'Light as a Mediterranean morning ☀️',
      'Quietly perfect by the water 🐚',
      'Effortless resort ease 🤍',
      'My villa wardrobe staple 🍋',
      'Breezy and beautifully cut ✨',
      'Harbour to dinner with ease 🛥️',
      'Cool, calm, coastal 🌊',
      'Summer in a single piece ☀️',
      'Linen done right 🤍',
    ],
    bodies: [
      'Wore this for a long lunch by the marina and it kept me cool all afternoon. The fabric breathes like a sea breeze. 🌊',
      'Packed it for a week of sailing and barely took it off. Light, elegant, and it shrugs off creases beautifully. ⛵️',
      'Feels like a slow morning on the Mediterranean. The drape is gorgeous and the colour is wonderfully muted. ☀️',
      'Threw it on over swimwear for sundowners and looked impossibly put together. A holiday wardrobe essential. 🏖️',
      'The linen has a lovely weight, breezy but never flimsy, and it looks far more expensive than it is. 🤍',
      'Coastal, calm, and quietly luxurious. I have practically lived in it since the first warm day. 🐚',
      'Cool against the skin even in the afternoon heat, and it pairs with everything from sandals to loafers. ✨',
      'It carries from the beach to dinner without missing a beat. Exactly the understated elegance I hoped for. 🌊',
      'Spent a fortnight by the sea in this and it only got better. Soft, light, and effortlessly elegant. 🛥️',
      'The colour is like sun on water and the fit is generous in the loveliest way. A true summer favourite. 🍋',
      'Cool and weightless on the hottest days, yet it still looks considered with linen trousers. ☀️',
      'Has that just-off-the-boat ease to it. I keep reaching for it whenever the weather turns warm. ⛵️',
      'Beautifully relaxed without ever looking careless. It has become my default for the coast. 🏖️',
      'Quietly refined and impossibly comfortable. The kind of piece you wear all summer and never tire of. 🤍',
    ],
  },
  // countryside, estate, autumn, fireside, tweed, moors
  heritage: {
    titles: [
      'A country house staple 🍂',
      'Made for crisp mornings 🌰',
      'Quiet heritage charm 🏡',
      'Autumn in a single layer 🍷',
      'Timeless and grounding 🍂',
      'Effortless weekend tailoring 🤎',
      'Built for the long walk 🍁',
      'Old-world and beautifully made 🥃',
      'Estate-ready and easy 🐎',
      'Warm without the bulk 🍂',
      'A keeper for the cooler months 🌰',
      'Quietly distinguished 🤎',
    ],
    bodies: [
      'Perfect for long walks on a crisp morning and a glass of something by the fire afterwards. Warm without any bulk. 🍂',
      'Has that lived-in country house feel from the very first wear. The pattern is rich but never loud. 🏡',
      'Reaches for autumn beautifully. Layered it under a jacket for the weekend and it felt instantly timeless. 🌰',
      'Quietly handsome and impeccably finished. The kind of piece you keep for years and then pass on. 🍷',
      'The weave has real depth and character. It dresses up with wool trousers or down with denim. 🤎',
      'Grounding, refined, and endlessly versatile. It looks like it belongs on a country estate. 🐎',
      'Soft, substantial, and beautifully muted. Ideal for cooler days when you still want to look considered. ✨',
      'Exactly the heritage feel I was after, with a cut that flatters rather than fusses. 🍂',
      'Wore it through a long weekend in the hills and it only looked better with each day. Proper old-world charm. 🍁',
      'The colours have a wonderful depth, like turning leaves. Smart enough for dinner, easy enough for the walk there. 🥃',
      'Substantial without weighing you down, and the finish is lovely throughout. A genuine cold-weather favourite. 🌰',
      'Pairs beautifully with corduroy and good boots. It has that effortless estate ease I always look for. 🐎',
      'Rich, warm, and quietly confident. The kind of piece that makes a grey morning feel considered. 🍂',
      'Beautifully tailored and built to last. I can see myself reaching for this every autumn for years. 🍁',
    ],
  },
  // poolside, club, golf, refined leisure (polos)
  resort: {
    titles: [
      'Poolside perfection 🏝️',
      'Club house ready ⛳️',
      'Leisure done right 🍸',
      'Sun lounger essential 🌴',
      'Quietly elegant ease 🥂',
      'A resort wardrobe favourite 🤍',
      'Terrace to dinner with ease 🍹',
      'Effortless and refined 🌺',
      'Made for slow afternoons 🌴',
      'Smart, breezy, beautiful 🥂',
      'My holiday go-to 🏝️',
      'Polished without the effort 🍸',
    ],
    bodies: [
      'Wore it from the pool to a long lunch without a second thought. Smart, breezy, and beautifully relaxed. 🏝️',
      'The collar holds its shape all day and the fit is generous in the best way. Made for unhurried afternoons. ⛳️',
      'Threw it on for sundowners and felt instantly polished. Quiet luxury you can actually lounge in. 🍸',
      'Soft handle, refined colour, and it pairs perfectly with tailored shorts or linen trousers. 🌴',
      'Looks wonderful with a drink in hand by the water. Understated and effortlessly expensive looking. 🥂',
      'Comfortable enough for a lazy day yet smart enough for dinner. A true resort staple. 🤍',
      'Holds up beautifully in the heat and never looks tired. The cut is leisurely but considered. ✨',
      'Exactly the elevated leisure piece I wanted, refined without trying too hard. 🏝️',
      'Lived in it on the terrace all holiday. Cool, elegant, and it never once looked crumpled. 🍹',
      'The fabric drapes beautifully and feels wonderful against the skin. Made for long, easy afternoons. 🌺',
      'Equally at home by the pool or at dinner. Quietly smart with a lovely relaxed line. 🌴',
      'Breezy, polished, and effortlessly cool. It has become the first thing I pack for the sun. 🥂',
      'Looks far more expensive than it is and wears beautifully in the warmth. A genuine leisure favourite. 🍸',
      'Generous, soft, and quietly refined. Perfect for that unhurried holiday pace. 🏝️',
    ],
  },
  // travel, layering, journeys, airports, the road (pants, cargo, shackets)
  utility: {
    titles: [
      'Built for the journey ✈️',
      'A travel wardrobe hero 🧳',
      'Refined and ready 🗺️',
      'My layer of choice 🏔️',
      'Effortless and practical 🤎',
      'A quiet workhorse 🤍',
      'Made for the road 🧭',
      'Smart and hard-wearing 🚂',
      'Goes everywhere with me ✈️',
      'Dependable and easy 🧳',
      'Considered down to the detail 🗺️',
      'The piece I always pack 🏔️',
    ],
    bodies: [
      'Lived in this through three airports and it still looked sharp at the other end. Comfortable and quietly smart. ✈️',
      'The fit is generous and the fabric moves with you. Ideal for long travel days and everything after. 🧳',
      'Layers beautifully and shrugs off a full day of wear. Practical without giving up an ounce of elegance. 🏔️',
      'Roomy in the right places and beautifully finished throughout. It has become my default for the road. 🗺️',
      'Holds its shape from morning to night. The kind of dependable piece you reach for without thinking. 🤎',
      'Understated, hard wearing, and endlessly versatile. Works as well in the city as out of it. 🤍',
      'Comfortable from the first wear with none of the stiffness, and the detailing is subtle and considered. ✨',
      'Exactly the easy, refined staple I hoped for, and the quality feels built to last. ✈️',
      'Took it across three cities in a carry-on and it looked considered the whole way. Quietly excellent. 🧭',
      'The pockets are genuinely useful and the cut stays sharp even after a long day. A real travel companion. 🚂',
      'Moves with you and never feels restrictive. Smart enough for dinner straight off the train. 🗺️',
      'Beautifully made and endlessly practical. It has quietly become the first thing into my bag. 🧳',
      'Tough where it needs to be and refined everywhere else. I reach for it on every trip now. 🏔️',
      'Holds up to everything I throw at it and still looks the part. Dependable in the best way. 🤎',
    ],
  },
  // weekend, easy, relaxed-cool, cafe (tees, boxy)
  everyday: {
    titles: [
      'An easy everyday favourite 🤍',
      'A weekend in one piece 😌',
      'Quietly cool 🌿',
      'Soft and effortless ☕️',
      'My new go-to 🤍',
      'Relaxed done right 😌',
      'Lives in my rotation 🍃',
      'Easy from the first wear 🛋️',
      'Comfort without compromise 🙂',
      'Simple and beautifully soft 🌿',
      'The one I always reach for 🤍',
      'Effortless any day ☕️',
    ],
    bodies: [
      'Soft from the very first wear and the fit sits just right, relaxed without ever looking sloppy. ☕️',
      'I reach for it on slow weekends and lazy mornings. Easy, breezy, and beautifully made. 😌',
      'The cotton has a lovely weight and the cut is spot on. Quietly cool with zero effort. 🌿',
      'Goes with everything and looks considered even when you are not trying. A true everyday staple. 🤍',
      'Wonderfully comfortable and holds its shape wash after wash. It has quietly become my default. 😌',
      'Relaxed, refined, and endlessly wearable. The kind of piece you end up buying in every colour. 🌿',
      'Light, soft, and effortless. Perfect for coffee runs and long unhurried afternoons. ☕️',
      'Exactly the easy elegance I wanted, with a fit that flatters without any fuss. ✨',
      'The softest thing in my wardrobe and it still looks sharp out of the house. I wear it constantly. 🍃',
      'Easy to throw on yet it always looks put together. The fabric only gets better with washing. 🛋️',
      'Just the right weight, just the right cut. It has become my uniform for the weekend. 🙂',
      'Comfortable enough to lounge in and smart enough for a casual dinner. Quietly brilliant. 🌿',
      'Beautifully made and endlessly easy. The kind of piece that quietly earns its keep. 🤍',
      'Soft, breathable, and flattering. I find myself reaching for it far more than I expected. ☕️',
    ],
  },
  // timeless, understated, versatile (fallback)
  quiet: {
    titles: [
      'Quietly luxurious ✨',
      'Timeless and refined 🤍',
      'Understated elegance 🕊️',
      'Effortlessly considered ✨',
      'A genuine keeper 🤍',
      'Beautifully made ✨',
      'Quiet good taste 🤎',
      'Refined without effort 🌙',
      'Elegant in every detail 🕊️',
      'The kind you keep 🤍',
      'Subtle and beautifully cut ✨',
      'Understated and lovely 🤎',
    ],
    bodies: [
      'Impeccably cut and quietly elegant. It looks far more expensive than it is and pairs with anything. ✨',
      'The kind of understated piece you reach for again and again. Beautiful fabric and a flattering fit. 🤍',
      'Refined without trying too hard. The finish is lovely and it carries from day to evening with ease. 🕊️',
      'Timeless, versatile, and beautifully made. A genuine wardrobe workhorse that never looks tired. ✨',
      'Soft, considered, and endlessly wearable. Exactly the quiet luxury I was hoping for. 🤍',
      'Lovely weight and a gorgeous muted tone. It quietly elevates everything I wear it with. ✨',
      'Understated quality you can feel. The tailoring is subtle and the comfort is immediate. 🕊️',
      'Exactly the elegant, easy piece I wanted, and the craftsmanship really shows. 🤍',
      'Nothing shouts about it, which is exactly the appeal. Beautifully made and effortlessly versatile. 🌙',
      'The colour is beautifully muted and the cut is quietly flattering. It goes with everything I own. 🤎',
      'A piece you do not have to think about, which is the highest compliment. Refined and easy. ✨',
      'Understated, well made, and lovely to wear. It has become a quiet staple in my rotation. 🤍',
      'The detailing is subtle and the fabric feels wonderful. Elegant in the most effortless way. 🕊️',
      'Beautifully restrained and impeccably finished. The kind of quality you notice over time. 🤎',
    ],
  },
};

// Shared, refined, persona-agnostic copy for the rare written review that lands
// on a middling/low rating. Still warm, still no em dashes.
const MIXED = {
  titles: [
    'Lovely, with a note on fit 🤔',
    'Beautiful, sizing runs generous 📏',
    'Refined but slightly relaxed 🙂',
    'Gorgeous, just size down 📐',
    'Lovely piece, lighter than I expected 🙂',
    'Elegant, a small caveat 🤔',
  ],
  bodies: [
    'The quality is lovely though the cut runs generous. Consider sizing down for a sharper silhouette. 📏',
    'Beautifully made and elegant. The shade is a touch lighter than pictured but still very refined. 🙂',
    'Comfortable and nicely finished. Delivery took a little longer than hoped, yet it was worth the wait. 📦',
    'A handsome piece overall. The fabric is a little lighter than expected but it still looks the part. 🙂',
    'Really elegant once on, though I would suggest going a size down for a cleaner line. 📐',
    'Lovely colour and finish. The fit is a little relaxed for my taste but the quality is clear. 🤔',
  ],
};
const CRITICAL = {
  titles: [
    'Lighter than expected 😕',
    'Generous on the fit 📏',
    'Beautiful, but runs large 📐',
    'Lovely look, check the sizing 🤷',
  ],
  bodies: [
    'The colour and finish are elegant, though the fabric is lighter in weight than I had anticipated. 😕',
    'A refined piece, but the cut ran more relaxed than the size guide suggested for my frame. 📏',
    'Handsome design and nice fabric, however it came up noticeably larger than expected. 📐',
    'The look is lovely but I would size down next time, as the fit was generous on me. 🤷',
  ],
};

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Map a product to a persona by vibe keywords in its name (garment-defined first). */
function personaFor(name: string): Persona {
  const n = name.toLowerCase();
  if (/pant|trouser|cargo|shacket|bellbottom|utility/.test(n)) return 'utility';
  if (/polo/.test(n)) return 'resort';
  if (
    /plaid|check|glen|pinstripe|herbarium|alpine|fireside|ember|dustroad|solstice|mocha|mulberry|heritage/.test(
      n
    )
  )
    return 'heritage';
  if (
    /linen|cloudweave|tidewater|shoreline|marine|coastal|powder|ether|void|terra|tropical|aqua/.test(
      n
    )
  )
    return 'coastal';
  if (/tee|boxy|graphic|print|puff|word|star/.test(n)) return 'everyday';
  return 'quiet';
}

/**
 * Per-product copy dealer. Shuffles each tier's title/body banks once, then hands
 * out the next distinct pair on each call, so a single product never repeats a
 * title or body (banks are sized > the 8-9 written reviews per product).
 */
function createCopyDealer(persona: Persona) {
  const posT = shuffle(POSITIVE[persona].titles);
  const posB = shuffle(POSITIVE[persona].bodies);
  const mixT = shuffle(MIXED.titles);
  const mixB = shuffle(MIXED.bodies);
  const criT = shuffle(CRITICAL.titles);
  const criB = shuffle(CRITICAL.bodies);
  let p = 0;
  let m = 0;
  let c = 0;
  return (rating: number): { title: string; content: string } => {
    if (rating >= 4) {
      const out = { title: posT[p % posT.length]!, content: posB[p % posB.length]! };
      p++;
      return out;
    }
    if (rating === 3) {
      const out = { title: mixT[m % mixT.length]!, content: mixB[m % mixB.length]! };
      m++;
      return out;
    }
    const out = { title: criT[c % criT.length]!, content: criB[c % criB.length]! };
    c++;
    return out;
  };
}

/** Generate `n` ratings whose mean ≈ targetAvg, skewed high with a realistic tail. */
function makeRatings(n: number, targetAvg: number): number[] {
  const ratings = new Array(n).fill(5);
  let deficit = Math.round((5 - targetAvg) * n); // total star-points to subtract from all-5s
  for (let i = 0; i < n && deficit > 0; i++) {
    const roll = Math.random();
    let drop: number;
    if (roll < 0.78)
      drop = 1; // -> 4 (most common)
    else if (roll < 0.93)
      drop = 2; // -> 3
    else if (roll < 0.985)
      drop = 3; // -> 2
    else drop = 4; // -> 1 (rare)
    drop = Math.min(drop, deficit, 4);
    ratings[i] = 5 - drop;
    deficit -= drop;
  }
  return shuffle(ratings);
}

/** A random timestamp within the last ~6 months. */
function recentDate(): Date {
  const now = Date.now();
  const sixMonths = 1000 * 60 * 60 * 24 * 30 * 6;
  return new Date(now - Math.floor(Math.random() * sixMonths));
}

async function ensureReviewerPool(): Promise<string[]> {
  const users = Array.from({ length: USER_POOL_SIZE }, (_, i) => ({
    email: `seed-reviewer-${i}@seed.reviews`,
    firstName: pick(FIRST_NAMES),
    lastName: pick(LAST_NAMES),
    emailVerified: true,
  }));
  await prisma.user.createMany({ data: users, skipDuplicates: true });
  const rows = await prisma.user.findMany({
    where: { email: { endsWith: '@seed.reviews' } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function main() {
  console.log(
    '→ Seeding/refreshing product reviews. Target DB:',
    process.env.DATABASE_URL?.split('@')[1] ?? '(unknown)'
  );

  const userIds = await ensureReviewerPool();
  console.log(`  reviewer pool: ${userIds.length} users`);

  const products = await prisma.product.findMany({ select: { id: true, name: true } });
  console.log(`  products: ${products.length}`);

  let seeded = 0;
  let refreshed = 0;
  let refreshedRows = 0;
  for (const product of products) {
    const persona = personaFor(product.name);
    const deal = createCopyDealer(persona); // fresh shuffle per product -> no repeats within it
    const existing = await prisma.review.findMany({
      where: { productId: product.id, user: { email: { endsWith: '@seed.reviews' } } },
      select: { id: true, rating: true, content: true },
    });

    if (existing.length === 0) {
      // Fresh seed.
      const total = randInt(50, 100);
      const targetAvg = 4.2 + Math.random() * (4.95 - 4.2);
      const ratings = makeRatings(total, targetAvg);
      const reviewers = shuffle(userIds).slice(0, total);
      const writtenCount = randInt(8, 9);

      const rows = ratings.map((rating, idx) => {
        const withText = idx < writtenCount;
        const text = withText ? deal(rating) : null;
        return {
          productId: product.id,
          userId: reviewers[idx]!,
          rating,
          title: text?.title ?? null,
          content: text?.content ?? null,
          isVerified: Math.random() < 0.55, // mix of verified/unverified for realism
          isApproved: true,
          createdAt: recentDate(),
        };
      });

      await prisma.review.createMany({ data: rows, skipDuplicates: true });
      const achieved = (ratings.reduce((s, r) => s + r, 0) / total).toFixed(2);
      console.log(
        `  ✓ seeded ${product.name} [${persona}]: ${total} ratings (avg ${achieved}), ${writtenCount} written`
      );
      seeded++;
    } else {
      // Refresh the copy on the existing written reviews (preserve everything else).
      const written = existing.filter((r) => r.content !== null);
      await Promise.all(
        written.map((r) => {
          const text = deal(r.rating);
          return prisma.review.update({
            where: { id: r.id },
            data: { title: text.title, content: text.content },
          });
        })
      );
      console.log(`  ↻ refreshed ${product.name} [${persona}]: ${written.length} written reviews`);
      refreshed++;
      refreshedRows += written.length;
    }
  }

  console.log(
    `\nDone. Seeded ${seeded} products fresh, refreshed copy on ${refreshed} products (${refreshedRows} written reviews).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
