'use client';

import { signOut, useSession } from 'next-auth/react';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

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
      title="Logout"
      className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
    >
      <ArrowRightOnRectangleIcon className="h-5 w-5" />
    </button>
  );
}
