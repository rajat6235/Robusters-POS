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
import { useOrderStore } from '@/hooks/useOrderStore';
import { toast } from 'sonner';

interface CancelOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
}

export function CancelOrderDialog({ 
  isOpen, 
  onClose, 
  orderId, 
  orderNumber 
}: CancelOrderDialogProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { requestCancellation } = useOrderStore();

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    if (reason.trim().length < 5) {
      toast.error('Cancellation reason must be at least 5 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await requestCancellation(orderId, reason.trim());
      // The success message from the API will include loyalty points info if applicable
      onClose();
      setReason('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit cancellation request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setReason('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Order</DialogTitle>
          <DialogDescription>
            Request cancellation for order {orderNumber}. This request will be sent to an admin for approval.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="reason">Reason for Cancellation *</Label>
            <Textarea
              id="reason"
              placeholder="Please provide a detailed reason for cancelling this order..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1"
              rows={4}
              maxLength={500}
              disabled={isSubmitting}
            />
            <p className="text-sm text-muted-foreground mt-1">
              {reason.length}/500 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? 'Submitting...' : 'Request Cancellation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}