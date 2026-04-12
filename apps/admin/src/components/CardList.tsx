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
  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  const { getToken } = await auth();
  const token = await getToken();

  // fetch orders only

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_ORDER_SERVICE_URL}/orders?limit=5`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );
    const data = await res.json();

    orders = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to load latest transactions", error);
  }

  return (
    <div className="">
      <h1 className="text-lg font-medium mb-6">{title}</h1>
      <div className="flex flex-col gap-2">
        {orders.map((item) => {
          const total =
            item.products?.reduce(
              (sum, product) => sum + product.price * product.quantity,
              0,
            ) ?? item.amount;

          return (
            <Card
              key={item._id}
              className="flex-row items-center justify-between gap-4 p-4"
            >
              <CardContent className="flex-1 p-0">
                <CardTitle className="text-sm font-medium">
                  {item.username || item.email}
                </CardTitle>
                <Badge variant="secondary">{item.status}</Badge>
              </CardContent>
              <CardFooter className="p-0">
                {currencyFormatter.format(total)}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CardList;
