'use client';

import { useSession } from 'next-auth/react';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import LogoutForm from './LogoutForm';

export default function LogoutButton(): JSX.Element {
  const { data: session } = useSession();

  if (!session) {
    return <></>;
  }

  return <LogoutForm />;
}
