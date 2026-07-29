'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Send, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import * as MealPackageService from '@/services/mealPackageService';

interface OTPVerificationStepProps {
  customerPackage: any;
  orderItems: any[];
  customerPhone: string;
  onOTPRequested: (data: any) => void;
  onOrderSuccess: (result: any) => void;
  onBack: () => void;
}

export function OTPVerificationStep({
  customerPackage,
  orderItems,
  customerPhone,
  onOTPRequested,
  onOrderSuccess,
  onBack,
}: OTPVerificationStepProps) {
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpData, setOtpData] = useState<any>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Stable for the lifetime of this order attempt — a retried request (wrong
  // OTP, network timeout, double-click) reuses the same key so the backend
  // can dedupe it instead of creating a second order. A genuinely new order
  // gets a new key naturally, since this component remounts when the wizard
  // resets to step 1.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  // Request OTP
  const requestOTPMutation = useMutation({
    mutationFn: () =>
      MealPackageService.requestOTPForOrder({
        customerPackageId: customerPackage.id,
        orderItems,
      }),
    onSuccess: (data) => {
      setOtpSent(true);
      setOtpData(data);
      onOTPRequested(data);
      toast.success(`OTP sent to ${data.phone}`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to send OTP');
    },
  });

  // Verify OTP and create order
  const verifyOTPMutation = useMutation({
    mutationFn: (otpCode: string) =>
      MealPackageService.verifyOTPAndCreateOrder(
        {
          customerPackageId: customerPackage.id,
          otp: otpCode,
          orderItems,
          mealsToConsume: 1,
        },
        idempotencyKey
      ),
    onSuccess: (result) => {
      toast.success('Order created successfully!');
      onOrderSuccess(result);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Invalid OTP';
      const attemptsRemaining = error?.response?.data?.attemptsRemaining;

      setVerificationError(
        attemptsRemaining !== undefined
          ? `${message} (${attemptsRemaining} attempts remaining)`
          : message
      );
      setOtp('');
    },
  });

  // Confirm order directly, without OTP (used while OTP verification is disabled)
  const confirmOrderMutation = useMutation({
    mutationFn: () =>
      MealPackageService.verifyOTPAndCreateOrder(
        {
          customerPackageId: customerPackage.id,
          orderItems,
          mealsToConsume: 1,
        },
        idempotencyKey
      ),
    onSuccess: (result) => {
      toast.success('Order created successfully!');
      onOrderSuccess(result);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create order');
    },
  });

  const handleSendOTP = () => {
    requestOTPMutation.mutate();
  };

  const handleVerifyOTP = () => {
    if (otp.length !== 6) {
      toast.error('Please enter complete 6-digit OTP');
      return;
    }

    setVerificationError(null);
    verifyOTPMutation.mutate(otp);
  };

  const orderSummary = (
    <div className="border rounded-lg p-4 bg-muted/50">
      <h3 className="font-semibold mb-3">Order Summary</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Package:</span>
          <span className="font-medium">{customerPackage.packageName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Remaining Meals:</span>
          <span className="font-medium text-green-600">
            {customerPackage.remainingMeals}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Customer Phone:</span>
          <span className="font-medium">{customerPhone}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t">
        <div className="font-semibold mb-2">Items ({orderItems.length}):</div>
        <div className="space-y-1">
          {orderItems.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span>
                {item.quantity}x {item.name}
              </span>
              <span className="text-muted-foreground">₹{Number(item.price).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (!MealPackageService.OTP_ENABLED) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {orderSummary}

        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="ml-2 text-amber-900">
            OTP verification is temporarily disabled while the SMS provider is being set up.
            Confirm below to create the order without a code.
          </AlertDescription>
        </Alert>

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={() => confirmOrderMutation.mutate()}
            disabled={confirmOrderMutation.isPending}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {confirmOrderMutation.isPending ? 'Creating Order...' : 'Confirm & Create Order'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      {orderSummary}

      {/* OTP Section */}
      {!otpSent ? (
        <div className="text-center py-8 space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Customer Verification Required</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Click below to send a 6-digit OTP to the customer's phone number.
              The customer must provide this OTP to confirm the order.
            </p>
          </div>

          <Button
            size="lg"
            onClick={handleSendOTP}
            disabled={requestOTPMutation.isPending}
          >
            <Send className="mr-2 h-4 w-4" />
            {requestOTPMutation.isPending ? 'Sending OTP...' : `Send OTP to ${customerPhone}`}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <Alert className="border-green-200 bg-green-50">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <AlertDescription className="ml-2 text-green-900">
              OTP sent successfully to {otpData?.phone}. Valid for {otpData?.expiryMinutes} minutes.
            </AlertDescription>
          </Alert>

          {verificationError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="ml-2">{verificationError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="text-center">
              <Label className="text-base font-semibold">Enter 6-Digit OTP</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Ask the customer for the OTP sent to their phone
              </p>
            </div>

            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => {
                  setOtp(value);
                  setVerificationError(null);
                }}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setOtpSent(false);
                  setOtp('');
                  setVerificationError(null);
                }}
              >
                Resend OTP
              </Button>
              <Button
                onClick={handleVerifyOTP}
                disabled={otp.length !== 6 || verifyOTPMutation.isPending}
                size="lg"
              >
                {verifyOTPMutation.isPending ? 'Verifying...' : 'Verify & Create Order'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
