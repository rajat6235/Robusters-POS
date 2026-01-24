'use client';

import React, { useEffect, useState } from 'react';
import { User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { authService, RegisterRequest, UpdateUserRequest } from '@/services/authService';
import { UserForm } from '@/components/users/UserForm';
import { UserTable } from '@/components/users/UserTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, RefreshCw } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await authService.getAllUsers(1, 100);
      if (response.success) {
        setUsers(response.data.users);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (data: RegisterRequest | UpdateUserRequest) => {
    try {
      setIsSubmitting(true);
      if (editingUser) {
        await authService.updateUser(editingUser.id, data as UpdateUserRequest);
        toast({
          title: 'Success',
          description: 'User updated successfully',
        });
      } else {
        await authService.register(data as RegisterRequest);
        toast({
          title: 'Success',
          description: 'User created successfully',
        });
      }
      handleCloseForm();
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Operation failed',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      setIsLoading(true);
      if (user.isActive) {
        await authService.deactivateUser(user.id);
        toast({
          title: 'Success',
          description: `${user.firstName} ${user.lastName} has been deactivated`,
        });
      } else {
        await authService.activateUser(user.id);
        toast({
          title: 'Success',
          description: `${user.firstName} ${user.lastName} has been activated`,
        });
      }
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update user status',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Manage admin and manager accounts
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchUsers} disabled={isLoading} className="flex-1 sm:flex-none">
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">Refresh</span>
            </Button>
            <Button size="sm" onClick={handleCreateUser} className="flex-1 sm:flex-none">
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="text-lg md:text-xl">Users</CardTitle>
            <CardDescription>
              {users.length} user{users.length !== 1 ? 's' : ''} total
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            <UserTable
              users={users}
              currentUserId={currentUser?.id || ''}
              onEdit={handleEditUser}
              onToggleStatus={handleToggleStatus}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        <UserForm
          open={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={handleSubmit}
          user={editingUser}
          isLoading={isSubmitting}
        />
      </div>
    </ProtectedRoute>
  );
}
