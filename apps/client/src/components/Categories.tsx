"use client";
import {
  CoatHanger,
  ShoppingBagOpenIcon,
  HoodieIcon,
  BaseballCapIcon,
  SockIcon,
  SneakerMoveIcon,
  TShirtIcon,
  PantsIcon,
} from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const categories = [
  {
    name: "All",
    icon: <ShoppingBagOpenIcon className="w-4 h-4" />,
    slug: "all",
  },
  {
    name: "Collections",
    icon: <CoatHanger className="w-4 h-4" />,
    slug: "collections",
  },
  {
    name: "T-shirts",
    icon: <TShirtIcon className="w-4 h-4" />,
    slug: "t-shirts",
  },
  {
    name: "Pants",
    icon: <PantsIcon className="w-4 h-4" />,
    slug: "pants",
  },
  {
    name: "Hoodies",
    icon: <HoodieIcon className="w-4 h-4" />,
    slug: "hoodies",
  },
  {
    name: "Shoes",
    icon: <SneakerMoveIcon className="w-4 h-4" />,
    slug: "shoes",
  },
  {
    name: "Caps",
    icon: <BaseballCapIcon className="w-4 h-4" />,
    slug: "caps",
  },
  {
    name: "Socks",
    icon: <SockIcon className="w-4 h-4" />,
    slug: "socks",
  },
];

const Categories = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selectedCategory = searchParams.get("category") || "all";

  const handleChange = (value: string | null) => {
    const params = new URLSearchParams(searchParams);

    if (!value || value === "all") {
      params.delete("category");
    } else {
      params.set("category", value);
    }

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 bg-gray-100 p-2 rounded-lg mb-4 text-sm">
      {categories.map((category) => (
        <div
          className={`flex items-center justify-center gap-2 cursor-pointer px-2 py-1 rounded-md ${
            category.slug === selectedCategory ? "bg-white" : "text-gray-500"
          }`}
          key={category.name}
          onClick={() => handleChange(category.slug)}
        >
          {category.icon}
          {category.name}
        </div>
      ))}
    </div>
  );
};

export default Categories;
