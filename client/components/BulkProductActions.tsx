import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, Upload } from "lucide-react";
import { ProductionDetail } from "@shared/api";

interface BulkProductActionsProps {
  productionDetails: ProductionDetail[];
  updateProductionDetail: (
    productId: number,
    field: keyof ProductionDetail,
    value: string,
  ) => void;
  onBulkUpdate: (updates: Partial<ProductionDetail>) => void;
}

export const BulkProductActions: React.FC<BulkProductActionsProps> = ({
  productionDetails,
  updateProductionDetail,
  onBulkUpdate,
}) => {
  const [bulkData, setBulkData] = useState({
    areaOfProduction: "",
    unit: "",
    yearsOfProduction: "",
  });

  const [showBulkActions, setShowBulkActions] = useState(false);

  const handleBulkApply = () => {
    if (
      bulkData.areaOfProduction ||
      bulkData.unit ||
      bulkData.yearsOfProduction
    ) {
      productionDetails.forEach((detail) => {
        if (bulkData.areaOfProduction) {
          updateProductionDetail(
            detail.productId,
            "areaOfProduction",
            bulkData.areaOfProduction,
          );
        }
        if (bulkData.unit) {
          updateProductionDetail(detail.productId, "unit", bulkData.unit);
        }
        if (bulkData.yearsOfProduction) {
          updateProductionDetail(
            detail.productId,
            "yearsOfProduction",
            bulkData.yearsOfProduction,
          );
        }
      });
      setBulkData({ areaOfProduction: "", unit: "", yearsOfProduction: "" });
    }
  };

  const exportData = () => {
    const exportData = productionDetails.map((detail) => ({
      productName: detail.productName,
      annualProduction: detail.annualProduction,
      unit: detail.unit,
      areaOfProduction: detail.areaOfProduction,
      yearsOfProduction: detail.yearsOfProduction,
      annualTurnover: detail.annualTurnover,
      additionalNotes: detail.additionalNotes,
    }));

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = "production-details.json";

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const getCompletionStats = () => {
    const totalProducts = productionDetails.length;
    const completedProducts = productionDetails.filter(
      (detail) =>
        detail.annualProduction &&
        detail.areaOfProduction &&
        detail.yearsOfProduction,
    ).length;

    return {
      total: totalProducts,
      completed: completedProducts,
      percentage:
        totalProducts > 0
          ? Math.round((completedProducts / totalProducts) * 100)
          : 0,
    };
  };

  const stats = getCompletionStats();

  if (productionDetails.length <= 1) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-blue-800 flex items-center gap-2">
            <Copy size={20} />
            Multiple Products Management
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white">
              {stats.completed}/{stats.total} Complete
            </Badge>
            <Badge
              variant={stats.percentage === 100 ? "default" : "secondary"}
              className={stats.percentage === 100 ? "bg-green-500" : ""}
            >
              {stats.percentage}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showBulkActions ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkActions(true)}
              className="text-blue-700 border-blue-300 hover:bg-blue-50"
            >
              <Copy size={16} className="mr-2" />
              Apply Common Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportData}
              className="text-green-700 border-green-300 hover:bg-green-50"
            >
              <Download size={16} className="mr-2" />
              Export Data
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Common Area of Production
                </Label>
                <Input
                  value={bulkData.areaOfProduction}
                  onChange={(e) =>
                    setBulkData((prev) => ({
                      ...prev,
                      areaOfProduction: e.target.value,
                    }))
                  }
                  placeholder="e.g., Local Workshop"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Common Unit
                </Label>
                <Select
                  value={bulkData.unit}
                  onValueChange={(value) =>
                    setBulkData((prev) => ({ ...prev, unit: value }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pieces">Pieces</SelectItem>
                    <SelectItem value="meters">Meters</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="liters">Liters</SelectItem>
                    <SelectItem value="tons">Tons</SelectItem>
                    <SelectItem value="bundles">Bundles</SelectItem>
                    <SelectItem value="sets">Sets</SelectItem>
                    <SelectItem value="pairs">Pairs</SelectItem>
                    <SelectItem value="boxes">Boxes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Common Years of Production
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    value={bulkData.yearsOfProduction}
                    onChange={(e) =>
                      setBulkData((prev) => ({
                        ...prev,
                        yearsOfProduction: e.target.value,
                      }))
                    }
                    placeholder="1"
                    className="w-16"
                  />
                  <span className="text-gray-600 text-sm">years</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleBulkApply}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={
                  !bulkData.areaOfProduction &&
                  !bulkData.unit &&
                  !bulkData.yearsOfProduction
                }
              >
                Apply to All Products
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowBulkActions(false)}
              >
                Cancel
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              Only filled fields will be applied to all{" "}
              {productionDetails.length} products.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
