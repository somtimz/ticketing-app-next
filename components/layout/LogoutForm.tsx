import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { logout } from '@/lib/actions/auth';

export default function LogoutForm(): JSX.Element {
  return (
    <form action={logout}>
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
