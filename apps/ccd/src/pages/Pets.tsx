import { useEffect, useState } from "react";
import { ShopifyProduct, STOREFRONT_QUERY, storefrontApiRequest } from "@/lib/shopify";
import { Loader2 } from "lucide-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { CartDrawer } from "@/components/CartDrawer";
import PageHero from "@/components/PageHero";
import ProductCard from "@/components/ProductCard";

const Pets = () => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await storefrontApiRequest(STOREFRONT_QUERY, { first: 30, query: "tag:pets" });
        setProducts(data?.data?.products?.edges || []);
      } catch (e) {
        console.error("Failed to load pet products:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Pet merch | Cats Can Dance",
    description:
      "Cats Can Dance pet merch. Nothing for sale right now.",
    url: "https://catscandance.com/pets",
    inLanguage: "en-IN",
    isPartOf: { "@type": "WebSite", name: "Cats Can Dance", url: "https://catscandance.com" },
  };

  const brandLd = {
    "@context": "https://schema.org",
    "@type": "Brand",
    name: "Cats Can Dance",
    url: "https://catscandance.com",
    logo: "https://catscandance.com/ccd-logo.png",
    category: "Pet Products",
  };

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: products.length,
    itemListElement: products.slice(0, 20).map((p, i) => {
      const variant = p.node.variants.edges[0]?.node;
      const image = p.node.images.edges[0]?.node?.url;
      return {
        "@type": "ListItem",
        position: i + 1,
        url: `https://catscandance.com/product/${p.node.handle}`,
        item: {
          "@type": "Product",
          name: p.node.title,
          url: `https://catscandance.com/product/${p.node.handle}`,
          image,
          brand: { "@type": "Brand", name: "Cats Can Dance" },
          category: "Pet Products",
          offers: variant
            ? {
                "@type": "Offer",
                price: variant.price.amount,
                priceCurrency: variant.price.currencyCode,
                availability: "https://schema.org/InStock",
                url: `https://catscandance.com/product/${p.node.handle}`,
              }
            : undefined,
        },
      };
    }),
  };

  return (
    <>
      <SEO
        title="Pet merch · Cats Can Dance"
        description="Cats Can Dance merch for pets. Nothing for sale right now; when there is, it shows up here."
        path="/pets"
        jsonLd={[collectionLd, brandLd, ...(products.length ? [itemListLd] : [])]}
      />
      <main className="bg-cream text-ink">
        <Nav />
        <PageHero eyebrow="PETS" title="PETS THAT PARTY." bg="bg-electric-blue" eyebrowColor="text-acid-yellow">
          <p className="font-display text-cream text-2xl mt-4">
            Merch for your cat or dog, when we have some.
          </p>
        </PageHero>

        <section className="container py-16 md:py-24 relative">
          <div className="absolute top-8 right-4 md:right-8 z-10">
            <CartDrawer />
          </div>

          <h2 className="font-display text-3xl md:text-5xl mb-2">
            Pet merch.
          </h2>
          <p className="text-ink/80 text-lg max-w-2xl mb-10">
            Looking to adopt instead? The <a href="/adopt" className="underline">Nine Lives directory</a> lists animal welfare groups across India.
          </p>

          {loading ? (
            <div className="flex justify-center py-32">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-32 border-4 border-ink chunk-shadow bg-cream">
              <p className="font-display text-3xl mb-2">NO PET PRODUCTS YET</p>
              <p className="text-muted-foreground">When there is a drop, it shows up here.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-8">
              {products.map((p) => (
                <ProductCard key={p.node.id} product={p} altSuffix="Cats Can Dance pet streetwear Bangalore" />
              ))}
            </div>
          )}
        </section>
        <Footer />
      </main>
    </>
  );
};

export default Pets;
