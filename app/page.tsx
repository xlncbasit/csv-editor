import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to customize page with default parameters or show a landing page
  redirect('/edit');
}