import Link from "next/link";
import PaymentStatus from "@/components/PaymentStatus";

export default async function ReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  if (!session_id)
    return (
      <div className="p-8">
        No payment session found. <Link href="/cart">Return to cart</Link>
      </div>
    );
  return <PaymentStatus sessionId={session_id} />;
}
