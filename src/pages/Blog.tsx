import { Link } from "@/lib/compat-router";
import { useSyncExternalStore } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import PageHero from "@/components/PageHero";
import Breadcrumbs from "@/components/Breadcrumbs";
import BlogCover from "@/components/BlogCover";
import { getAllPosts, subscribePosts } from "@/content/posts";
import { useDynamicPosts } from "@/hooks/useDynamicPosts";

const Blog = () => {
  useDynamicPosts();
  const posts = useSyncExternalStore(subscribePosts, getAllPosts, getAllPosts);
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: posts.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://catscandance.com/journal/${p.slug}`,
      name: p.title,
    })),
  };

  const blogLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Cats Can Dance Journal",
    description: "Short notes from Cats Can Dance in Bengaluru: how we find good nights, how RSVP lists work, our Episodes and the DJs who played them.",
    url: "https://catscandance.com/journal",
    inLanguage: "en-IN",
    publisher: {
      "@type": "Organization",
      name: "Cats Can Dance",
      logo: { "@type": "ImageObject", url: "https://catscandance.com/ccd-logo.png" },
    },
    blogPost: posts.slice(0, 20).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `https://catscandance.com/journal/${p.slug}`,
      datePublished: p.date,
      author: { "@type": "Person", name: p.author },
    })),
  };

  return (
    <>
      <SEO
        title="Journal · Cats Can Dance"
        description="Short notes from Cats Can Dance in Bengaluru: how we find good nights, how RSVP lists work, our Episodes and the DJs who played them."
        path="/journal"
        jsonLd={[blogLd, itemListLd]}
      />
      <main className="bg-background text-foreground min-h-screen">
        <Nav />
        <PageHero
          eyebrow="READ · JOURNAL"
          title="THE JOURNAL."
          bg="bg-acid-yellow"
          textColor="text-ink"
          eyebrowColor="text-magenta"
          shadow={false}
        >
          <p className="text-ink/80 font-medium text-base sm:text-lg max-w-2xl">
            Short notes from us in Bengaluru: how we find good nights, how RSVP lists work, and what happened at our Episodes.
          </p>
        </PageHero>
        <section className="container py-12 md:py-20">
          <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Journal" }]} />
          <div className="grid gap-6 sm:grid-cols-2 max-w-5xl">
            {posts.map((p) => (
              <Link
                key={p.slug}
                to={`/journal/${p.slug}`}
                className="bg-cream border-4 border-ink chunk-shadow flex flex-col hover:-translate-y-1 hover:translate-x-1 transition-transform overflow-hidden"
              >
                <div className="aspect-video border-b-4 border-ink overflow-hidden">
                  <BlogCover title={p.title} coverTitle={p.coverTitle} category={p.category} tag={p.tag} issue={p.issue} color={p.coverColor} className="border-0" />
                </div>
                <div className="p-5 sm:p-6">
                  <span className="inline-block bg-ink text-cream text-xs font-bold px-3 py-1 mb-3">{p.category || p.tag}</span>
                  <h2 className="font-display text-2xl sm:text-3xl text-ink mb-2 leading-[0.95] break-words">{p.title}</h2>
                  <p className="text-ink/70 font-medium mb-3 text-sm sm:text-base">{p.excerpt}</p>
                  <p className="font-display text-ink/60 text-xs sm:text-sm">
                    {p.date} · {p.author}
                    {p.body && p.body.length > 0 && (
                      <span className="ml-2 text-ink/40">
                        · {Math.max(1, Math.ceil(p.body.join(" ").split(/\s+/).filter(Boolean).length / 200))} min read
                      </span>
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <Footer />
      </main>
    </>
  );
};

export default Blog;
