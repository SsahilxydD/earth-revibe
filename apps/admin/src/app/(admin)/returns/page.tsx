import { ReturnsView } from '@/components/returns/returns-view';

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  return <ReturnsView initialStatus={status} />;
}
