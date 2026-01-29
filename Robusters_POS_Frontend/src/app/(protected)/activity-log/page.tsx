'use client';

import React, { useEffect, useState } from 'react';
import { activityLogService, ActivityLog, ActivityLogFilters } from '@/services/activityLogService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, ChevronLeft, ChevronRight, Clock, User, Globe } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const ACTION_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  LOGIN: { label: 'Login', variant: 'default' },
  LOGOUT: { label: 'Logout', variant: 'secondary' },
  LOGIN_FAILED: { label: 'Login Failed', variant: 'destructive' },
  USER_CREATED: { label: 'User Created', variant: 'default' },
  USER_UPDATED: { label: 'User Updated', variant: 'secondary' },
  USER_DEACTIVATED: { label: 'User Deactivated', variant: 'destructive' },
  USER_ACTIVATED: { label: 'User Activated', variant: 'default' },
};

const ITEMS_PER_PAGE = 20;

export default function ActivityLogPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<ActivityLogFilters>({
    limit: ITEMS_PER_PAGE,
    offset: 0,
  });

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const response = await activityLogService.getActivityLogs(filters);
      if (response.success) {
        setLogs(response.data.logs);
        setTotal(response.data.pagination.total);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch activity logs',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActions = async () => {
    try {
      const response = await activityLogService.getActionTypes();
      if (response.success) {
        setActions(response.data.actions);
      }
    } catch (error) {
      // Silent fail for action types
    }
  };

  useEffect(() => {
    fetchActions();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const handleFilterChange = (key: keyof ActivityLogFilters, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
      offset: 0, // Reset pagination when filter changes
    }));
  };

  const handlePrevPage = () => {
    setFilters(prev => ({
      ...prev,
      offset: Math.max(0, (prev.offset || 0) - ITEMS_PER_PAGE),
    }));
  };

  const handleNextPage = () => {
    setFilters(prev => ({
      ...prev,
      offset: (prev.offset || 0) + ITEMS_PER_PAGE,
    }));
  };

  const currentPage = Math.floor((filters.offset || 0) / ITEMS_PER_PAGE) + 1;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm:ss a');
  };

  const formatDateShort = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, h:mm a');
  };

  const getActionBadge = (action: string) => {
    const config = ACTION_LABELS[action] || { label: action, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDetails = (details: Record<string, any>) => {
    if (!details || Object.keys(details).length === 0) return '-';

    const entries = Object.entries(details);
    return (
      <div className="text-xs space-y-1">
        {entries.slice(0, 3).map(([key, value]) => (
          <div key={key}>
            <span className="text-muted-foreground">{key}:</span>{' '}
            <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
          </div>
        ))}
        {entries.length > 3 && (
          <div className="text-muted-foreground">+{entries.length - 3} more</div>
        )}
      </div>
    );
  };

  // Mobile Card Component
  const MobileLogCard = ({ log }: { log: ActivityLog }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {getActionBadge(log.action)}
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">
                {log.userName || log.userEmail || 'Unknown'}
              </span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-right shrink-0">
            <div className="flex items-center gap-1 justify-end">
              <Clock className="h-3 w-3" />
              {formatDateShort(log.createdAt)}
            </div>
          </div>
        </div>

        {log.details && Object.keys(log.details).length > 0 && (
          <div className="mt-3 pt-3 border-t">
            {formatDetails(log.details)}
          </div>
        )}

        {log.ipAddress && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Globe className="h-3 w-3" />
            {log.ipAddress}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading && logs.length === 0) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
          <Card>
            <CardHeader className="pb-3 md:pb-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-10 w-full sm:w-[180px]" />
              </div>
            </CardHeader>
            <CardContent className="px-3 md:px-6">
              {/* Mobile skeleton */}
              <div className="md:hidden space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i} className="mb-3">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-20 rounded-full" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {/* Desktop skeleton */}
              <div className="hidden md:block space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 py-3 border-b last:border-0">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-4 w-48 hidden lg:block" />
                    <Skeleton className="h-4 w-24 hidden xl:block" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Activity Log</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Track all login, logout, and user management activities
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3 md:pb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg md:text-xl">Activity History</CardTitle>
                <CardDescription>
                  {total} total activit{total !== 1 ? 'ies' : 'y'}
                </CardDescription>
              </div>
              <Select
                value={filters.action || 'all'}
                onValueChange={(value) => handleFilterChange('action', value)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {ACTION_LABELS[action]?.label || action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            {logs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 border rounded-md">
                No activity logs found
              </div>
            ) : (
              <>
                {/* Mobile View */}
                <div className="md:hidden space-y-3">
                  {logs.map((log) => (
                    <MobileLogCard key={log.id} log={log} />
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead className="hidden lg:table-cell">Details</TableHead>
                        <TableHead className="hidden xl:table-cell">IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {formatDate(log.createdAt)}
                          </TableCell>
                          <TableCell>
                            {log.userName || log.userEmail || (
                              <span className="text-muted-foreground">Unknown</span>
                            )}
                          </TableCell>
                          <TableCell>{getActionBadge(log.action)}</TableCell>
                          <TableCell className="hidden lg:table-cell max-w-[300px]">
                            {formatDetails(log.details)}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell text-muted-foreground">
                            {log.ipAddress || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1 || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    <span className="hidden xs:inline">Previous</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages || isLoading}
                  >
                    <span className="hidden xs:inline">Next</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
