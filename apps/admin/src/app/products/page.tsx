import { Product, columns } from "./columns";
import { DataTable } from "./data-table";

const getData = async (): Promise<Product[]> => {
  return [
    {
      id: "prod-001",
      name: "Classic Cotton Tee",
      price: 29.99,
      shortDescription: "Soft everyday T-shirt",
      description:
        "A breathable cotton T-shirt designed for daily wear with a relaxed fit and clean finish.",
      images: {
        white:
          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=300&q=80",
        black:
          "https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=300&q=80",
        navy: "https://images.unsplash.com/photo-1583743814966-8936f37f4678?auto=format&fit=crop&w=300&q=80",
      },
    },
    {
      id: "prod-002",
      name: "Oversized Hoodie",
      price: 64.5,
      shortDescription: "Warm fleece hoodie",
      description:
        "Heavyweight fleece hoodie with a roomy silhouette, ribbed cuffs, and a structured hood.",
      images: {
        gray: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=300&q=80",
        olive:
          "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=300&q=80",
      },
    },
    {
      id: "prod-003",
      name: "Slim Denim Jacket",
      price: 88,
      shortDescription: "Modern denim outerwear",
      description:
        "A slim-fit denim jacket with durable stitching and a lightly washed finish for layering.",

      images: {
        blue: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=300&q=80",
        charcoal:
          "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=300&q=80",
      },
    },
    {
      id: "prod-004",
      name: "Essential Joggers",
      price: 42.75,
      shortDescription: "Tapered comfort pants",
      description:
        "Stretch joggers with an elastic waistband, ankle cuffs, and a tapered shape for casual wear.",

      images: {
        black:
          "https://images.unsplash.com/photo-1506629905607-d9c297d6a8d1?auto=format&fit=crop&w=300&q=80",
        stone:
          "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=300&q=80",
      },
    },
    {
      id: "prod-005",
      name: "Canvas Sneakers",
      price: 54.2,
      shortDescription: "Low-top casual sneakers",
      description:
        "Minimal canvas sneakers with cushioned insoles and durable rubber soles for all-day use.",

      images: {
        cream:
          "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=300&q=80",
        green:
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=300&q=80",
      },
    },
    {
      id: "prod-006",
      name: "Leather Crossbody Bag",
      price: 79.9,
      shortDescription: "Compact daily bag",
      description:
        "A structured crossbody bag with adjustable strap, internal pockets, and smooth matte leather.",

      images: {
        tan: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=300&q=80",
        black:
          "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=300&q=80",
      },
    },
    {
      id: "prod-007",
      name: "Striped Linen Shirt",
      price: 47.3,
      shortDescription: "Lightweight summer shirt",
      description:
        "A relaxed linen shirt with vertical stripes, button front, and airy fabric for warm weather.",

      images: {
        sky: "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=300&q=80",
        sand: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=300&q=80",
      },
    },
    {
      id: "prod-008",
      name: "Wool Blend Coat",
      price: 129,
      shortDescription: "Tailored cold-weather coat",
      description:
        "A mid-length wool blend coat with clean lapels, button closure, and a sharp structured drape.",

      images: {
        camel:
          "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=300&q=80",
        graphite:
          "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=300&q=80",
      },
    },
  ];
};

const ProductsPage = async () => {
  const data = await getData();

  return (
    <div className="">
      <div className="mb-8 rounded-md bg-secondary px-4 py-2">
        <h1 className="font-semibold">All Products</h1>
      </div>
      <DataTable columns={columns} data={data} />
    </div>
  );
};

export default ProductsPage;
