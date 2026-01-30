'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useOrderStore } from '@/hooks/useOrderStore';
import { CancellationRequest } from '@/services/orderService';
import { toast } from 'sonner';

interface CancellationApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  request: CancellationRequest | null;
}

export function CancellationApprovalDialog({ 
  isOpen, 
  onClose, 
  request 
}: CancellationApprovalDialogProps) {
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { approveCancellation } = useOrderStore();

  const handleApproval = async (approved: boolean) => {
    if (!request) return;

    setIsSubmitting(true);
    try {
      await approveCancellation(request.id, approved, adminNotes.trim());
      // The success message from the API will include refund info if applicable
      onClose();
      setAdminNotes('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to process cancellation request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setAdminNotes('');
    }
  };

  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] overflow-y-auto mx-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-lg sm:text-xl font-bold">Review Cancellation Request</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Review and approve or reject the cancellation request for order {request.order_number}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 sm:space-y-6">
          {/* Order Details */}
          <div className="bg-muted/50 p-3 sm:p-4 rounded-lg space-y-3 border">
            <h4 className="font-semibold text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">Order Details</h4>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                <span className="font-medium text-xs sm:text-sm">Order Number:</span>
                <Badge variant="outline" className="font-mono text-xs w-fit">{request.order_number}</Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                <span className="font-medium text-xs sm:text-sm">Customer:</span>
                <span className="text-xs sm:text-sm">{request.customer_name || 'Walk-in'}</span>
              </div>
              {request.customer_phone && (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                  <span className="font-medium text-xs sm:text-sm">Phone:</span>
                  <span className="text-xs sm:text-sm font-mono">{request.customer_phone}</span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 pt-2 border-t">
                <span className="font-medium text-xs sm:text-sm">Total Amount:</span>
                <span className="font-bold text-base sm:text-lg">₹{request.total}</span>
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div className="bg-muted/30 p-3 sm:p-4 rounded-lg space-y-3 border">
            <h4 className="font-semibold text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">Request Information</h4>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                <span className="font-medium text-xs sm:text-sm">Requested by:</span>
                <span className="text-xs sm:text-sm">{request.requester_first_name} {request.requester_last_name}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                <span className="font-medium text-xs sm:text-sm">Requested at:</span>
                <span className="text-xs sm:text-sm">{new Date(request.cancellation_requested_at).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Cancellation Reason */}
          <div className="space-y-3">
            <Label className="font-semibold text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">Cancellation Reason</Label>
            <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border min-h-[60px] sm:min-h-[80px]">
              <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                {request.cancellation_reason || 'No reason provided'}
              </p>
            </div>
          </div>

          {/* Admin Notes */}
          <div className="space-y-3">
            <Label htmlFor="adminNotes" className="font-semibold text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
              Admin Notes (Optional)
            </Label>
            <Textarea
              id="adminNotes"
              placeholder="Add any notes about your decision..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="min-h-[80px] sm:min-h-[100px] resize-none border-2 focus:border-primary/50 text-sm"
              rows={3}
              maxLength={500}
              disabled={isSubmitting}
            />
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 text-xs text-muted-foreground">
              <span>Optional notes for record keeping</span>
              <span className={adminNotes.length > 450 ? 'text-warning' : ''}>
                {adminNotes.length}/500 characters
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-2 pt-4 sm:pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isSubmitting}
            className="min-w-[80px] w-full sm:w-auto order-3 sm:order-1"
          >
            Close
          </Button>
          <Button 
            variant="outline"
            onClick={() => handleApproval(false)}
            disabled={isSubmitting}
            className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive min-w-[80px] w-full sm:w-auto order-2 sm:order-2"
          >
            {isSubmitting ? 'Processing...' : 'Reject'}
          </Button>
          <Button 
            onClick={() => handleApproval(true)}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 text-white min-w-[80px] w-full sm:w-auto order-1 sm:order-3"
          >
            {isSubmitting ? 'Processing...' : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}