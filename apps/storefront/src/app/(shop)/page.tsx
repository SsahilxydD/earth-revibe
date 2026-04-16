import { redirect } from 'next/navigation';

// The dedicated homepage is gone — `/` is now the catalog. This is a
// permanent (308) server-side redirect to /products.
export default function HomePage(): never {
  redirect('/products');
}
