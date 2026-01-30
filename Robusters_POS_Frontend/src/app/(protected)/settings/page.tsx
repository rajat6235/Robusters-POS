'use client';

import React, { useEffect, useState } from 'react';
import {
  settingsService,
  LoyaltyPointsRatio,
  TierThresholds,
  VipOrderThreshold,
} from '@/services/settingsService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Award, Users, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  const [loyaltyRatio, setLoyaltyRatio] = useState<LoyaltyPointsRatio>({
    spend_amount: 10,
    points_earned: 1,
  });
  const [tierThresholds, setTierThresholds] = useState<TierThresholds>({
    bronze: 0,
    silver: 2000,
    gold: 5000,
    platinum: 10000,
  });
  const [vipThreshold, setVipThreshold] = useState<VipOrderThreshold>({
    min_orders: 10,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await settingsService.getAllSettings();
      const s = response.data.settings;
      if (s.loyalty_points_ratio) setLoyaltyRatio(s.loyalty_points_ratio.value);
      if (s.tier_thresholds) setTierThresholds(s.tier_thresholds.value);
      if (s.vip_order_threshold) setVipThreshold(s.vip_order_threshold.value);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLoyalty = async () => {
    if (loyaltyRatio.spend_amount <= 0 || loyaltyRatio.points_earned <= 0) {
      toast.error('Both values must be positive numbers');
      return;
    }
    try {
      setSavingSection('loyalty');
      await settingsService.updateSetting('loyalty_points_ratio', loyaltyRatio);
      toast.success('Loyalty points ratio updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update');
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveTiers = async () => {
    const { bronze, silver, gold, platinum } = tierThresholds;
    if (silver < 0 || gold < 0 || platinum < 0) {
      toast.error('Thresholds must be non-negative');
      return;
    }
    if (!(bronze <= silver && silver <= gold && gold <= platinum)) {
      toast.error('Thresholds must be in ascending order');
      return;
    }
    try {
      setSavingSection('tiers');
      await settingsService.updateSetting('tier_thresholds', tierThresholds);
      toast.success('Tier thresholds updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update');
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveVip = async () => {
    if (!Number.isInteger(vipThreshold.min_orders) || vipThreshold.min_orders < 1) {
      toast.error('Minimum orders must be a positive whole number');
      return;
    }
    try {
      setSavingSection('vip');
      await settingsService.updateSetting('vip_order_threshold', vipThreshold);
      toast.success('VIP threshold updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update');
    } finally {
      setSavingSection(null);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-9 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Configure loyalty program and customer tiers
          </p>
        </div>

        {/* Loyalty Points Ratio */}
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-lg sm:text-xl">Loyalty Points</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Configure how loyalty points are earned per order
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="spend_amount">Spend Amount (Rs)</Label>
                <Input
                  id="spend_amount"
                  type="number"
                  min={1}
                  value={loyaltyRatio.spend_amount}
                  onChange={(e) =>
                    setLoyaltyRatio((prev) => ({
                      ...prev,
                      spend_amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="points_earned">Points Earned</Label>
                <Input
                  id="points_earned"
                  type="number"
                  min={1}
                  value={loyaltyRatio.points_earned}
                  onChange={(e) =>
                    setLoyaltyRatio((prev) => ({
                      ...prev,
                      points_earned: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Customers earn <strong>{loyaltyRatio.points_earned}</strong> point(s) for every{' '}
              <strong>Rs {loyaltyRatio.spend_amount}</strong> spent
            </p>
            <Button
              onClick={handleSaveLoyalty}
              disabled={savingSection === 'loyalty'}
              size="sm"
            >
              {savingSection === 'loyalty' && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save
            </Button>
          </CardContent>
        </Card>

        {/* Customer Tiers */}
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-lg sm:text-xl">Customer Tiers</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Set minimum total spent thresholds for each tier
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                  Bronze (Rs)
                </Label>
                <Input type="number" value={0} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="silver" className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
                  Silver (Rs)
                </Label>
                <Input
                  id="silver"
                  type="number"
                  min={0}
                  value={tierThresholds.silver}
                  onChange={(e) =>
                    setTierThresholds((prev) => ({
                      ...prev,
                      silver: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gold" className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                  Gold (Rs)
                </Label>
                <Input
                  id="gold"
                  type="number"
                  min={0}
                  value={tierThresholds.gold}
                  onChange={(e) =>
                    setTierThresholds((prev) => ({
                      ...prev,
                      gold: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platinum" className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                  Platinum (Rs)
                </Label>
                <Input
                  id="platinum"
                  type="number"
                  min={0}
                  value={tierThresholds.platinum}
                  onChange={(e) =>
                    setTierThresholds((prev) => ({
                      ...prev,
                      platinum: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <Button
              onClick={handleSaveTiers}
              disabled={savingSection === 'tiers'}
              size="sm"
            >
              {savingSection === 'tiers' && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save
            </Button>
          </CardContent>
        </Card>

        {/* VIP Threshold */}
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg sm:text-xl">VIP Status</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Set the minimum number of orders required for VIP badge
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
            <div className="max-w-xs space-y-2">
              <Label htmlFor="min_orders">Minimum Orders for VIP</Label>
              <Input
                id="min_orders"
                type="number"
                min={1}
                step={1}
                value={vipThreshold.min_orders}
                onChange={(e) =>
                  setVipThreshold({ min_orders: parseInt(e.target.value) || 1 })
                }
              />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Customers with more than <strong>{vipThreshold.min_orders}</strong> orders will
              receive the VIP badge
            </p>
            <Button
              onClick={handleSaveVip}
              disabled={savingSection === 'vip'}
              size="sm"
            >
              {savingSection === 'vip' && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save
            </Button>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
