import { signOut } from '@/lib/auth';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

export default function LogoutForm(): JSX.Element {
  return (
    <form
      action={async () => {
        'use server';
        await signOut({ redirectTo: '/login' });
      }}
    >
      <button
        type="submit"
        title="Logout"
        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
      >
        <ArrowRightOnRectangleIcon className="h-5 w-5" />
      </button>
    </form>
  );
}
