'use client';

import { signOut, useSession } from 'next-auth/react';

export default function LogoutButton(): JSX.Element {
  const { data: session } = useSession();

  if (!session) {
    return <></>;
  }

  const handleLogout = async (): Promise<void> => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <button
      onClick={handleLogout}
      className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
    >
      Logout
    </button>
  );
}
