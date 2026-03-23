import { User, columns } from "./columns";
import { DataTable } from "./data-table";

const getData = async (): Promise<User[]> => {
  return [
    {
      id: "728ed521",
      avatar: "https://i.pravatar.cc/150?img=1",
      fullName: "John Doe",
      phone: "+1 202 555 0142",
      status: "active",
    },
    {
      id: "728ed522",
      avatar: "https://i.pravatar.cc/150?img=2",
      fullName: "Jane Doe",
      phone: "+1 202 555 0168",
      status: "active",
    },
    {
      id: "728ed523",
      avatar: "https://i.pravatar.cc/150?img=3",
      fullName: "Mike Galloway",
      phone: "+1 202 555 0191",
      status: "inactive",
    },
    {
      id: "728ed524",
      avatar: "https://i.pravatar.cc/150?img=4",
      fullName: "Minerva Robinson",
      phone: "+1 202 555 0117",
      status: "active",
    },
    {
      id: "728ed525",
      avatar: "https://i.pravatar.cc/150?img=5",
      fullName: "Mable Clayton",
      phone: "+1 202 555 0135",
      status: "inactive",
    },
    {
      id: "728ed526",
      avatar: "https://i.pravatar.cc/150?img=6",
      fullName: "Nathan McDaniel",
      phone: "+1 202 555 0174",
      status: "active",
    },
    {
      id: "728ed527",
      avatar: "https://i.pravatar.cc/150?img=7",
      fullName: "Myrtie Lamb",
      phone: "+1 202 555 0126",
      status: "active",
    },
    {
      id: "728ed528",
      avatar: "https://i.pravatar.cc/150?img=8",
      fullName: "Leona Bryant",
      phone: "+1 202 555 0183",
      status: "inactive",
    },
    {
      id: "728ed529",
      avatar: "https://i.pravatar.cc/150?img=9",
      fullName: "Aaron Willis",
      phone: "+1 202 555 0159",
      status: "active",
    },
    {
      id: "728ed52a",
      avatar: "https://i.pravatar.cc/150?img=10",
      fullName: "Joel Keller",
      phone: "+1 202 555 0108",
      status: "active",
    },
    {
      id: "728ed52b",
      avatar: "https://i.pravatar.cc/150?img=11",
      fullName: "Daniel Ellis",
      phone: "+1 202 555 0149",
      status: "inactive",
    },
    {
      id: "728ed52c",
      avatar: "https://i.pravatar.cc/150?img=12",
      fullName: "Gordon Kennedy",
      phone: "+1 202 555 0112",
      status: "active",
    },
  ];
};

const UsersPage = async () => {
  const data = await getData();

  return (
    <div className="">
      <div className="mb-8 rounded-md bg-secondary px-4 py-2">
        <h1 className="font-semibold">All Users</h1>
      </div>
      <DataTable columns={columns} data={data} />
    </div>
  );
};

export default UsersPage;
