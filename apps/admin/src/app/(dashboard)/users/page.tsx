import { auth, type User } from "@clerk/nextjs/server";
import { columns } from "./columns";
import { DataTable } from "./data-table";

type UsersResponse = {
  data: User[];
  totalCount: number;
};

const getData = async (): Promise<UsersResponse> => {
  const { getToken } = await auth();
  const token = await getToken();

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_AUTH_SERVICE_URL}/users`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      return { data: [], totalCount: 0 };
    }

    const data: UsersResponse = await res.json();
    return data;
  } catch (err) {
    console.log(err);
    return { data: [], totalCount: 0 };
  }
};

const UsersPage = async () => {
  const res = await getData();

  return (
    <div>
      <div className="mb-8 rounded-md bg-secondary px-4 py-2">
        <h1 className="font-semibold">All Users</h1>
      </div>
      <DataTable columns={columns} data={res.data} />
    </div>
  );
};

export default UsersPage;
