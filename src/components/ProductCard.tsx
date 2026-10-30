import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";

type Props = {
  product: ShopifyProduct;
  altSuffix?: string;
};

const ProductCard = ({ product, altSuffix = "Cats Can Dance limited drop" }: Props) => {
  const addItem = useCartStore((s) => s.addItem);
  const syncing = useCartStore((s) => s.syncing);
  const variant = product.node.variants.edges[0]?.node;
  const img = product.node.images.edges[0]?.node;
  const priceAmount = parseFloat(variant?.price?.amount ?? "0");
  const currencyCode = variant?.price?.currencyCode ?? "INR";

  return (
    <article className="border-4 border-ink chunk-shadow bg-cream overflow-hidden hover:-translate-y-1 transition-transform">
      <Link href={`/product/${product.node.handle}`} className="block">
        <div className="aspect-square bg-acid-yellow border-b-4 border-ink overflow-hidden">
          {img && (
            <img
              src={img.url}
              alt={img.altText || `${product.node.title} — ${altSuffix}`}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          )}
        </div>
      </Link>
      <div className="p-5">
        <Link href={`/product/${product.node.handle}`}>
          <h3 className="font-display text-2xl mb-1 hover:text-magenta transition-colors">
            {product.node.title}
          </h3>
        </Link>
        <p className="font-display text-xl text-ink mb-1">
          {currencyCode === "INR" ? "₹" : currencyCode}{" "}
          {priceAmount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </p>
        <p className="text-ink/50 text-xs font-medium mb-4 uppercase tracking-widest">Limited drop · No restocks</p>
        <Button
          onClick={() =>
            variant &&
            addItem({
              variantId: variant.id,
              productId: product.node.id,
              title: product.node.title,
              variantTitle: variant.title,
              price: priceAmount,
              currency: currencyCode,
              image: img?.url ?? "",
            })
          }
          disabled={!variant || syncing}
          className="w-full bg-ink text-cream border-4 border-ink hover:bg-magenta"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : "ADD TO CART"}
        </Button>
      </div>
    </article>
  );
};

export default ProductCard;
