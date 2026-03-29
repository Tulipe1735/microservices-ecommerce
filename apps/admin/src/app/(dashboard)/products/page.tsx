import { ProductType } from "@repo/types";
import { columns } from "./columns";
import { DataTable } from "./data-table";

const getData = async (): Promise<ProductType[]> => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_PRODUCT_SERVICE_URL}/products`,
    );
    const data = res.json();
    return data;
  } catch (error) {
    console.log(error);
    return [];
  }
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
