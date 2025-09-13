import './globals.css';
import Link from 'next/link';
import AuthListener from '@/app/AuthListener'; // ⬅️ add this import

export const metadata = {
  title: 'Coastal Loyalty',
  description: 'Perks for your card',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">
        {/* Keeps server session cookies in sync */}
        <AuthListener />

        <div className="max-w-screen-sm mx-auto pb-16">
          {children}
        </div>

        {/* Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 border-t bg-white">
          <div className="max-w-screen-sm mx-auto flex justify-around p-3 text-sm">
            <Link href="/">Feed</Link>
            <Link href="/card">My Card</Link>
            <Link href="/login">Login</Link>
          </div>
        </nav>
      </body>
    </html>
  );
}
