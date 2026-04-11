"use client";

import { useEffect } from "react";
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { useAuth } from "@clerk/nextjs";
import { CreateOrderType, OrderFormSchema, ProductsType } from "@repo/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

type AdminUser = {
  id: string;
  username: string | null;
  emailAddresses: { emailAddress: string }[];
};

type AdminUsersResponse = {
  data: AdminUser[];
  totalCount: number;
};

const AddOrder = () => {
  const form = useForm<z.infer<typeof OrderFormSchema>>({
    resolver: zodResolver(OrderFormSchema),
    defaultValues: {
      username: "",
      status: "pending",
      productName: "",
      quantity: 1,
    },
  });

  const { getToken } = useAuth();
  const router = useRouter();
  const username = form.watch("username");
  const productName = form.watch("productName");
  const quantity = form.watch("quantity");

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<AdminUser[]> => {
      const baseUrl = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL?.trim();

      if (!baseUrl) {
        throw new Error("NEXT_PUBLIC_AUTH_SERVICE_URL is not configured.");
      }

      const token = await getToken();
      const res = await fetch(`${baseUrl}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch users.");
      }

      const data: AdminUsersResponse | AdminUser[] = await res.json();

      if (Array.isArray(data)) {
        return data;
      }

      return Array.isArray(data.data) ? data.data : [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["order-products"],
    queryFn: async (): Promise<ProductsType> => {
      const baseUrl = process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL?.trim();

      if (!baseUrl) {
        throw new Error("NEXT_PUBLIC_PRODUCT_SERVICE_URL is not configured.");
      }

      const res = await fetch(`${baseUrl}/products`);

      if (!res.ok) {
        throw new Error("Failed to fetch products.");
      }

      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const matchedUser = users.find(
    (user) =>
      user.username?.trim().toLowerCase() === username.trim().toLowerCase(),
  );
  const matchedProduct = products.find(
    (product) =>
      product.name.trim().toLowerCase() === productName.trim().toLowerCase(),
  );
  const estimatedTotal = matchedProduct
    ? matchedProduct.price * quantity
    : null;

  useEffect(() => {
    if (!matchedUser) {
      return;
    }

    form.clearErrors("username");
  }, [form, matchedUser]);

  const mutation = useMutation({
    mutationFn: async (data: CreateOrderType) => {
      const token = await getToken();
      const baseUrl = process.env.NEXT_PUBLIC_ORDER_SERVICE_URL?.trim();

      if (!baseUrl) {
        throw new Error("NEXT_PUBLIC_ORDER_SERVICE_URL is not configured.");
      }

      try {
        const res = await fetch(`${baseUrl}/orders`, {
          method: "POST",
          body: JSON.stringify(data),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(
            typeof json?.message === "string"
              ? json.message
              : "Failed to create order!",
          );
        }
      } catch (error) {
        throw new Error(
          error instanceof Error
            ? error.message
            : "Failed to reach order-service.",
        );
      }
    },
    onSuccess: () => {
      toast.success("Order created successfully");
      form.reset({
        username: "",
        status: "pending",
        productName: "",
        quantity: 1,
      });
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  return (
    <SheetContent>
      <SheetHeader>
        <SheetTitle className="mb-4">Add Order</SheetTitle>
        <SheetDescription asChild>
          <Form {...form}>
            <form
              className="space-y-8"
              onSubmit={form.handleSubmit((data) => {
                const selectedUser = users.find(
                  (user) =>
                    user.username?.trim().toLowerCase() ===
                    data.username.trim().toLowerCase(),
                );

                const email = selectedUser?.emailAddresses[0]?.emailAddress;

                if (!selectedUser || !email) {
                  form.setError("username", {
                    type: "manual",
                    message: "Username not found.",
                  });
                  return;
                }

                mutation.mutate({
                  ...data,
                  userId: selectedUser.id,
                  email,
                });
              })}
            >
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} list="order-usernames" />
                    </FormControl>
                    <datalist id="order-usernames">
                      {users
                        .map((user) => user.username)
                        .filter((value): value is string => Boolean(value))
                        .map((value) => (
                          <option key={value} value={value} />
                        ))}
                    </datalist>
                    <FormDescription>
                      Enter the customer username.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-2">
                <Label>Customer Email</Label>
                <Input
                  type="email"
                  value={matchedUser?.emailAddresses[0]?.emailAddress ?? ""}
                  placeholder="Resolved from username"
                  disabled
                />
              </div>
              <FormField
                control={form.control}
                name="productName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input {...field} list="order-products" />
                    </FormControl>
                    <datalist id="order-products">
                      {products.map((product) => (
                        <option key={product.id} value={product.name} />
                      ))}
                    </datalist>
                    <FormDescription>
                      Enter one product name for this order.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the quantity for this product.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-2">
                <Label>Estimated Total</Label>
                <Input
                  value={estimatedTotal ? `$${estimatedTotal}` : ""}
                  placeholder="Calculated from product price x quantity"
                  disabled
                />
              </div>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Enter the status of the order
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? "Submitting..." : "Submit"}
              </Button>
            </form>
          </Form>
        </SheetDescription>
      </SheetHeader>
    </SheetContent>
  );
};

export default AddOrder;
