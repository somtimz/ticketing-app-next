import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import type { ApiErrorResponse } from '@/types';

interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  role: 'Employee' | 'Agent' | 'TeamLead' | 'Admin';
}

// POST /api/users - Create a new user
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json<ApiErrorResponse>(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Only Admin can create new users
  if (session.user.role !== 'Admin') {
    return NextResponse.json<ApiErrorResponse>(
      { error: 'Forbidden - Only admins can create users' },
      { status: 403 }
    );
  }

  try {
    const body = (await req.json()) as CreateUserInput;

    // Validate required fields
    if (!body.email || !body.password || !body.fullName || !body.role) {
      return NextResponse.json<ApiErrorResponse>(
        { error: 'Missing required fields: email, password, fullName, role' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['Employee', 'Agent', 'TeamLead', 'Admin'] as const;
    if (!validRoles.includes(body.role)) {
      return NextResponse.json<ApiErrorResponse>(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json<ApiErrorResponse>(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 10);

    // Create user
    const newUser = await db
      .insert(users)
      .values({
        email: body.email,
        passwordHash,
        fullName: body.fullName,
        role: body.role,
        isActive: true
      })
      .returning();

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = newUser[0];

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json<ApiErrorResponse>(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// GET /api/users - List all users (admin only)
export async function GET(_req: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json<ApiErrorResponse>(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Only Admin can view all users
  if (session.user.role !== 'Admin') {
    return NextResponse.json<ApiErrorResponse>(
      { error: 'Forbidden - Only admins can view users' },
      { status: 403 }
    );
  }

  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        departmentId: users.departmentId,
        location: users.location,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .orderBy(users.createdAt);

    return NextResponse.json({ users: allUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json<ApiErrorResponse>(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
