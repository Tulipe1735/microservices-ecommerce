import Image from "next/image";
import { Card, CardContent, CardFooter, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { OrderType, ProductsType } from "@repo/types";
import { auth } from "@clerk/nextjs/server";

// const popularProducts = [
//   {
//     id: 1,
//     name: "iPhone 13 Pro",
//     shortDescription: "The latest iPhone with A15 Bionic chip",
//     description:
//       "The iPhone 13 Pro features a 6.1-inch Super Retina XDR display, A15 Bionic chip, Pro camera system with Night mode, and up to 22 hours of battery life.",
//     price: 999,
//     images: {
//       0: "/products/1g.png",
//       1: "/products/1p.png",
//       2: "/products/1gr.png",
//     },
//   },
// ];

// const latestTransactions = [
//   {
//     id: 1,
//     title: "Order Payment",
//     badge: "John Doe",
//     image:
//       "https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=800",
//     count: 1400,
//   },
//   {
//     id: 2,
//     title: "Order Payment",
//     badge: "Jane Smith",
//     image:
//       "https://images.pexels.com/photos/4969918/pexels-photo-4969918.jpeg?auto=compress&cs=tinysrgb&w=800",
//     count: 2100,
//   },
//   {
//     id: 3,
//     title: "Order Payment",
//     badge: "Michael Johnson",
//     image:
//       "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=800",
//     count: 1300,
//   },
//   {
//     id: 4,
//     title: "Order Payment",
//     badge: "Lily Adams",
//     image:
//       "https://images.pexels.com/photos/712513/pexels-photo-712513.jpeg?auto=compress&cs=tinysrgb&w=800",
//     count: 2500,
//   },
//   {
//     id: 5,
//     title: "Order Payment",
//     badge: "Sam Brown",
//     image:
//       "https://images.pexels.com/photos/1680175/pexels-photo-1680175.jpeg?auto=compress&cs=tinysrgb&w=800",
//     count: 1400,
//   },
// ];

const CardList = async ({ title }: { title: string }) => {
  let products: ProductsType = [];
  let orders: OrderType[] = [];

  const { getToken } = await auth();
  const token = await getToken();

  // fetch products
  if (title === "Popular Products") {
    products = await fetch(
      `${process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL}/products?limit=5&popular=true`,
    ).then((res) => res.json());
  }
  // fetch orders
  else {
    orders = await fetch(
      `${process.env.NEXT_PUBLIC_ORDER_SERVICE_URL}/orders?limit=5`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    ).then((res) => res.json());
  }
  return (
    <div className="">
      <h1 className="text-lg font-medium mb-6">{title}</h1>
      <div className="flex flex-col gap-2">
        {title === "Popular Products"
          ? products.map((item) => (
              <Card
                key={item.id}
                className="flex-row items-center justify-between gap-4 p-4"
              >
                <div className="w-12 h-12 rounded-sm relative overflow-hidden">
                  <Image
                    src={
                      Object.values(item.images as Record<string, string>)[0] ||
                      ""
                    }
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <CardContent className="flex-1 p-0">
                  <CardTitle className="text-sm font-medium">
                    {item.name}
                  </CardTitle>
                </CardContent>
                <CardFooter className="p-0">${item.price}</CardFooter>
              </Card>
            ))
          : orders.map((item) => (
              <Card
                key={item._id}
                className="flex-row items-center justify-between gap-4 p-4"
              >
                <CardContent className="flex-1 p-0">
                  <CardTitle className="text-sm font-medium">
                    {item.email}
                  </CardTitle>
                  <Badge variant="secondary">{item.status}</Badge>
                </CardContent>
                <CardFooter className="p-0">${item.amount / 100}</CardFooter>
              </Card>
            ))}
      </div>
    </div>
  );
};

export default CardList;
