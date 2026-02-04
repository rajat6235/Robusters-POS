'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrderStore } from '@/hooks/useOrderStore';
import { CancellationRequest } from '@/services/orderService';
import { CancellationApprovalDialog } from './CancellationApprovalDialog';
import { Clock, User, Phone, DollarSign } from 'lucide-react';

export function CancellationRequestsList() {
  const { cancellationRequests, loadCancellationRequests, isLoading } = useOrderStore();
  const [selectedRequest, setSelectedRequest] = useState<CancellationRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadCancellationRequests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReviewRequest = (request: CancellationRequest) => {
    setSelectedRequest(request);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedRequest(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Cancellation Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4 sm:pb-6">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
            <span className="text-lg sm:text-xl">Pending Cancellation Requests</span>
            <Badge variant="secondary" className="w-fit">
              {cancellationRequests.length} pending
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {cancellationRequests.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              No pending cancellation requests
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {cancellationRequests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-3 sm:p-4 hover:bg-accent/50 hover:border-accent-foreground/20 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">{request.order_number}</Badge>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                        Pending Review
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleReviewRequest(request)}
                      className="hover:bg-primary/90 transition-colors duration-200 w-full sm:w-auto"
                    >
                      Review
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-sm">
                    <div className="flex items-center gap-2 p-2 sm:p-0 bg-muted/30 sm:bg-transparent rounded sm:rounded-none">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-xs sm:text-sm">Customer</div>
                        <div className="text-muted-foreground text-xs sm:text-sm truncate">
                          {request.customer_name || 'Walk-in'}
                        </div>
                      </div>
                    </div>

                    {request.customer_phone && (
                      <div className="flex items-center gap-2 p-2 sm:p-0 bg-muted/30 sm:bg-transparent rounded sm:rounded-none">
                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-xs sm:text-sm">Phone</div>
                          <div className="text-muted-foreground text-xs sm:text-sm font-mono">
                            {request.customer_phone}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 p-2 sm:p-0 bg-muted/30 sm:bg-transparent rounded sm:rounded-none">
                      <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-xs sm:text-sm">Amount</div>
                        <div className="text-muted-foreground text-xs sm:text-sm font-semibold">₹{request.total}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-2 sm:p-0 bg-muted/30 sm:bg-transparent rounded sm:rounded-none">
                      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-xs sm:text-sm">Requested</div>
                        <div className="text-muted-foreground text-xs sm:text-sm">
                          {new Date(request.cancellation_requested_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/50">
                    <div className="space-y-2">
                      <div className="text-xs sm:text-sm">
                        <span className="font-medium text-muted-foreground">Requested by:</span>{' '}
                        <span className="text-foreground">{request.requester_first_name} {request.requester_last_name}</span>
                      </div>
                      <div className="text-xs sm:text-sm">
                        <span className="font-medium text-muted-foreground">Reason:</span>{' '}
                        <span className="text-foreground break-words">
                          {request.cancellation_reason.length > 80
                            ? `${request.cancellation_reason.substring(0, 80)}...`
                            : request.cancellation_reason
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CancellationApprovalDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        request={selectedRequest}
      />
    </>
  );
}