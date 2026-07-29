'use client';

import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PackageSelectionStepProps {
  packages: any[];
  onPackageSelected: (pkg: any) => void;
  onBack: () => void;
}

export function PackageSelectionStep({ packages, onPackageSelected, onBack }: PackageSelectionStepProps) {
  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={onBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="grid gap-4 md:grid-cols-2">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="border rounded-lg p-6 hover:border-primary transition-colors cursor-pointer"
            onClick={() => onPackageSelected(pkg)}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">{pkg.packageName}</h3>
                <Badge className="mt-1">{pkg.status}</Badge>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">
                  {pkg.remainingMeals}
                </div>
                <div className="text-sm text-muted-foreground">meals left</div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Total Meals:</span>
                <span className="font-medium text-foreground">{pkg.totalMeals}</span>
              </div>
              <div className="flex justify-between">
                <span>Consumed:</span>
                <span className="font-medium text-foreground">{pkg.consumedMeals}</span>
              </div>
              {pkg.expiresAt && (
                <div className="flex justify-between">
                  <span>Expires:</span>
                  <span className="font-medium text-foreground">
                    {new Date(pkg.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            <Button className="w-full mt-4">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Select This Package
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
