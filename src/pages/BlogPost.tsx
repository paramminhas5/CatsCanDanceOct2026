import { useParams, Link, Navigate } from "@/lib/compat-router";
import { useSyncExternalStore } from "react";
import { useRouter } from "next/router";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import BlogCover from "@/components/BlogCover";
import { getPost, getRelatedPosts, subscribePosts, getAllPosts, dynamicPostsLoaded, type Category } from "@/content/posts";
import { useDynamicPosts } from "@/hooks/useDynamicPosts";

const SITE = "https://catscandance.com";

const FAQ_BY_CATEGORY: Record<string, { q: string; a: string }[]> = {
  GUIDES: [
    { q: "How do I find good electronic nights in Bengaluru?", a: "Check What's on at catscandance.com/whats-on. Every night listed there has a credible artist or promoter behind it. Our own nights, the Episodes, are at catscandance.com/nights." },
    { q: "What is a free list or RSVP?", a: "You put your name down before the night and get in free or at a set price. If you can't make it, take your name off so someone else can go." },
  ],
  DROPS: [
    { q: "Is Cats Can Dance merch for sale?", a: "Not right now. When there is a drop, it shows up at catscandance.com/shop." },
  ],
  ARTISTS: [
    { q: "Who plays at Cats Can Dance Episodes?", a: "Our residents DJazz, Hedz, Merman and Sartdawg, plus guests. The lineup for each night is at catscandance.com/nights." },
    { q: "How do I play a Cats Can Dance Episode?", a: "Send a mix and a short note to hello@catscandance.com, or use catscandance.com/for-artists." },
  ],
  CULTURE: [
    { q: "What is Cats Can Dance?", a: "Param Minhas and Satwik Harisenany in Bengaluru. We run our own nights (the Episodes), list good nights across India, keep sourced pages for South Asian electronic artists and run School, where you can learn to produce and DJ for free." },
    { q: "Where do Cats Can Dance Episodes happen?", a: "In Bengaluru: so far at Bar Wild and Indiranagar Social. Episode 5 is at The Humming Tree on 25 Nov 2026. Dates are at catscandance.com/nights." },
  ],
  JOURNAL: [
    { q: "Who writes the Cats Can Dance journal?", a: "The two of us who run Cats Can Dance in Bengaluru, Param Minhas and Satwik Harisenany." },
    { q: "What does the journal cover?", a: "How we find good nights, how RSVP lists work, and what happened at our own Episodes." },
  ],
};

const FAQ_DEFAULT = FAQ_BY_CATEGORY.CULTURE;

const TAKE_IT_FURTHER: Record<string, { to: string; label: string; desc: string }[]> = {
  GUIDES: [
    { to: "/nights", label: "Our next Episode", desc: "Date, venue and lineup." },
    { to: "/bengaluru-underground-dance-music", label: "The Bengaluru guide", desc: "Where to go in Bengaluru." },
    { to: "/journal", label: "More guides", desc: "The rest of the journal." },
  ],
  DROPS: [
    { to: "/shop", label: "The shop", desc: "Nothing for sale right now." },
    { to: "/nights", label: "Our Episodes", desc: "Dates and lineups." },
    { to: "/about", label: "About us", desc: "Who runs Cats Can Dance." },
  ],
  ARTISTS: [
    { to: "/artists", label: "The roster", desc: "South Asian electronic artists, every fact sourced." },
    { to: "/listen", label: "Our playlists", desc: "What we play." },
    { to: "/nights", label: "Upcoming Episodes", desc: "Dates and lineups." },
  ],
  CULTURE: [
    { to: "/about", label: "About Cats Can Dance", desc: "Who we are." },
    { to: "/nights", label: "Our Episodes", desc: "Dates and lineups." },
    { to: "/whats-on", label: "What's on", desc: "Nights across India worth going to." },
  ],
  JOURNAL: [
    { to: "/journal", label: "All posts", desc: "Browse the journal." },
    { to: "/nights", label: "Episodes", desc: "Live dates." },
    { to: "/about", label: "About us", desc: "Who runs Cats Can Dance." },
  ],
};

const TAKE_IT_FURTHER_DEFAULT = TAKE_IT_FURTHER.CULTURE;

const BlogPost = () => {
  useDynamicPosts();
  // Re-render when dynamic posts arrive
  useSyncExternalStore(subscribePosts, getAllPosts, getAllPosts);
  const postsLoaded = useSyncExternalStore(subscribePosts, dynamicPostsLoaded, () => false);
  const router = useRouter();
  const { slug = "" } = useParams();
  const post = getPost(slug);

  if (!post) {
    // On a direct load the slug arrives after the first render (router not ready)
    // and database posts arrive after that. Only give up once both are in.
    if (!router.isReady || !postsLoaded) {
      return (
        <main className="bg-background text-foreground min-h-screen">
          <Nav />
        </main>
      );
    }
    return <Navigate to="/" replace />;
  }

  const related = getRelatedPosts(post.slug, 3);
  const cat = (post.category as Category | undefined) ?? "JOURNAL";
  const faqEntries = FAQ_BY_CATEGORY[cat] ?? FAQ_DEFAULT;
  const takeFurther = TAKE_IT_FURTHER[cat] ?? TAKE_IT_FURTHER_DEFAULT;
  const wordCount = post.body.join(" ").split(/\s+/).filter(Boolean).length;
  const keywords = [post.tag, post.category, "Bangalore", "underground", "dance music", "Cats Can Dance"]
    .filter(Boolean)
    .join(", ");

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: [`${SITE}/og-image.jpg`],
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: "en-IN",
    wordCount,
    keywords,
    articleSection: post.category || post.tag,
    author: { "@type": "Person", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "Cats Can Dance",
      logo: { "@type": "ImageObject", url: `${SITE}/ccd-logo.png` },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE}/journal/${post.slug}`,
    },
    isPartOf: { "@type": "Blog", name: "Cats Can Dance Journal", url: `${SITE}/journal` },
    about: ["dance music", "events in Bangalore", "underground parties India"],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqEntries.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <>
      <SEO
        title={`${post.title} | Cats Can Dance`}
        description={post.excerpt}
        path={`/journal/${post.slug}`}
        type="article"
        keywords={keywords}
        jsonLd={[articleLd, faqLd]}
      />
      <main className="bg-background text-foreground min-h-screen">
        <Nav />
        <article className="pt-28 md:pt-32 pb-16">
          <div className="container max-w-3xl">
            <Breadcrumbs
              items={[
                { label: "Home", to: "/" },
                { label: "Journal", to: "/journal" },
                { label: post.title },
              ]}
            />
            <span className="inline-block bg-ink text-cream text-xs font-bold px-3 py-1 mb-4">{post.category || post.tag}</span>
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl text-ink mb-4 leading-[0.95] break-words">{post.title}</h1>
            {(() => {
              const authorSlugMap: Record<string, string> = {
                "the pack": "the-pack",
                "param minhas": "param-minhas",
                "satwik harisenany": "satwik-harisenany",
                "cats can dance": "the-pack",
              };
              const authorSlug = authorSlugMap[(post.author || "").toLowerCase().trim()];
              return (
                <p className="font-display text-ink/70 text-sm mb-1">
                  {post.date} ·{" "}
                  {authorSlug ? (
                    <Link to={`/authors/${authorSlug}`} className="underline decoration-2 underline-offset-2 hover:text-magenta">
                      {post.author}
                    </Link>
                  ) : (
                    post.author
                  )}
                </p>
              );
            })()}
            {/* Reading time — 200 wpm average */}
            {wordCount > 0 && (
              <p className="font-display text-ink/40 text-xs uppercase tracking-widest mb-4">
                {Math.max(1, Math.ceil(wordCount / 200))} min read · {wordCount.toLocaleString()} words
              </p>
            )}
            <div className="aspect-video w-full border-4 border-ink chunk-shadow-lg mb-10 overflow-hidden">
              <BlogCover title={post.title} coverTitle={post.coverTitle} category={post.category} tag={post.tag} issue={post.issue} color={post.coverColor} size="lg" className="border-0" />
            </div>

            {post.tldr && post.tldr.length > 0 && (
              <aside className="mb-10 bg-acid-yellow border-4 border-ink chunk-shadow p-5 sm:p-6">
                <p className="font-display text-ink text-xl sm:text-2xl mb-3">/ TL;DR</p>
                <ul className="space-y-2 list-none">
                  {post.tldr.map((t, i) => (
                    <li key={i} className="text-ink font-medium text-base sm:text-lg flex gap-3">
                      <span aria-hidden className="font-display text-magenta">→</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            )}

            <div className="space-y-6">
              {post.body.map((p, i) => {
                const insertPicks = post.quickPicks && i === Math.min(2, post.body.length - 1);
                const insertQuote = post.pullQuote && i === Math.min(Math.floor(post.body.length / 2), post.body.length - 1);
                return (
                  <div key={i} className="space-y-6">
                    <p
                      className="text-ink/85 font-medium text-base sm:text-lg leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: p.replace(/\*\*(.+?)\*\*/g, '<strong class="text-ink">$1</strong>'),
                      }}
                    />
                    {insertPicks && (
                      <aside className="bg-electric-blue text-cream border-4 border-ink chunk-shadow p-5 sm:p-6">
                        <p className="font-display text-acid-yellow text-base sm:text-lg mb-3">/ {post.quickPicks!.title}</p>
                        <ul className="space-y-2">
                          {post.quickPicks!.items.map((it, idx) => (
                            <li key={idx} className="font-medium text-cream/95 text-base sm:text-lg flex gap-3">
                              <span aria-hidden className="font-display text-acid-yellow">{idx + 1}.</span>
                              <span>{it}</span>
                            </li>
                          ))}
                        </ul>
                      </aside>
                    )}
                    {insertQuote && (
                      <blockquote className="border-l-8 border-magenta pl-5 sm:pl-6 py-2 my-4">
                        <p className="font-display text-2xl sm:text-3xl md:text-4xl text-ink leading-[1.05]">
                          “{post.pullQuote}”
                        </p>
                      </blockquote>
                    )}
                  </div>
                );
              })}

              {post.whatWedSkip && (
                <aside className="mt-8 bg-magenta text-cream border-4 border-ink chunk-shadow p-5 sm:p-6">
                  <p className="font-display text-acid-yellow text-base sm:text-lg mb-2">/ WHAT WE'D SKIP</p>
                  <p className="font-medium text-cream/95 text-base sm:text-lg">{post.whatWedSkip}</p>
                </aside>
              )}

              <p className="mt-10 font-display text-ink text-sm sm:text-base border-t-4 border-ink pt-6">
                Written by Cats Can Dance, Bengaluru.
              </p>
            </div>

            {/* Take it further — internal linking */}
            <aside className="mt-12 bg-cream border-4 border-ink chunk-shadow p-5 sm:p-6">
              <p className="font-display text-magenta text-base sm:text-lg mb-4">/ TAKE IT FURTHER</p>
              <ul className="grid gap-3 sm:grid-cols-3">
                {takeFurther.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="block bg-acid-yellow border-4 border-ink p-4 hover:-translate-y-1 hover:translate-x-1 transition-transform h-full"
                    >
                      <p className="font-display text-ink text-base sm:text-lg leading-tight mb-1">
                        {l.label} →
                      </p>
                      <p className="text-ink/70 text-xs sm:text-sm font-medium">{l.desc}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>

            {related.length > 0 && (
              <aside className="mt-16 pt-10 border-t-4 border-ink">
                <h2 className="font-display text-2xl sm:text-3xl text-ink mb-6">/ READ NEXT</h2>
                <ul className="grid gap-4 sm:grid-cols-3">
                  {related.map((r) => (
                    <li key={r.slug}>
                      <Link
                        to={`/journal/${r.slug}`}
                        className="block bg-cream border-4 border-ink chunk-shadow p-4 hover:-translate-y-1 hover:translate-x-1 transition-transform h-full"
                      >
                        <span className="inline-block bg-ink text-cream text-[10px] font-bold px-2 py-0.5 mb-2">
                          {r.tag}
                        </span>
                        <p className="font-display text-ink text-lg leading-tight mb-1">{r.title}</p>
                        <p className="text-ink/70 text-xs font-medium line-clamp-2">{r.excerpt}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </div>
        </article>
        <Footer />
      </main>
    </>
  );
};

export default BlogPost;
