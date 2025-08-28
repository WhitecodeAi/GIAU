import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductionDetail } from "@shared/api";
import { BulkProductActions } from "./BulkProductActions";

const UNIT_OPTIONS = [
  { value: "pieces", label: "Pieces" },
  { value: "meters", label: "Meters" },
  { value: "kg", label: "Kilograms" },
  { value: "liters", label: "Liters" },
  { value: "tons", label: "Tons" },
  { value: "bundles", label: "Bundles" },
  { value: "sets", label: "Sets" },
  { value: "pairs", label: "Pairs" },
  { value: "boxes", label: "Boxes" },
  { value: "other", label: "Other" },
];

interface ProductionDetailsSectionProps {
  productionDetails: ProductionDetail[];
  updateProductionDetail: (
    productId: number,
    field: keyof ProductionDetail,
    value: string,
  ) => void;
  errors: Record<string, string>;
}

export const ProductionDetailsSection: React.FC<
  ProductionDetailsSectionProps
> = ({ productionDetails, updateProductionDetail, errors }) => {
  const handleBulkUpdate = (updates: Partial<ProductionDetail>) => {
    // This function would be called from BulkProductActions
    // but since we're using the updateProductionDetail callback pattern,
    // the actual bulk update is handled in BulkProductActions component
  };

  if (productionDetails.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          No products selected for production details.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          Production Details
        </h2>
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          {productionDetails.length} Product
          {productionDetails.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Bulk Actions for Multiple Products */}
      <BulkProductActions
        productionDetails={productionDetails}
        updateProductionDetail={updateProductionDetail}
        onBulkUpdate={handleBulkUpdate}
      />

      <div className="space-y-6">
        {productionDetails.map((detail, index) => (
          <Card key={detail.productId} className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                  Product {index + 1}
                </span>
                {detail.productName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Annual Production & Unit */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-700 font-medium">
                      Annual Production*
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      The quantity of the product produced
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Input
                        required
                        type="text"
                        value={detail.annualProduction}
                        onChange={(e) => {
                          const value = e.target.value.replace(
                            /[^a-zA-Z0-9]/g,
                            "",
                          );
                          updateProductionDetail(
                            detail.productId,
                            "annualProduction",
                            value,
                          );
                        }}
                        placeholder="Enter quantity (alphanumeric only)"
                        className="flex-1 input-desktop bg-white border-gray-300"
                      />
                      <Select
                        value={detail.unit}
                        onValueChange={(value) =>
                          updateProductionDetail(
                            detail.productId,
                            "unit",
                            value,
                          )
                        }
                      >
                        <SelectTrigger className="w-32 input-desktop bg-white border-gray-300">
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_OPTIONS.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {unit.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {errors[`production_${detail.productId}_annual`] && (
                      <p className="error-message">
                        {errors[`production_${detail.productId}_annual`]}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-gray-700 font-medium">
                      Annual Turnover*
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Yearly income from this product
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Input
                        required
                        type="number"
                        value={detail.annualTurnover || ""}
                        onChange={(e) =>
                          updateProductionDetail(
                            detail.productId,
                            "annualTurnover",
                            e.target.value,
                          )
                        }
                        placeholder="Enter amount"
                        className="input-desktop bg-white border-gray-300 flex-1"
                      />
                      <Select
                        value={detail.turnoverUnit || "lakh"}
                        onValueChange={(value) =>
                          updateProductionDetail(
                            detail.productId,
                            "turnoverUnit",
                            value,
                          )
                        }
                      >
                        <SelectTrigger className="input-desktop bg-white border-gray-300 w-40">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hundred">Hundred</SelectItem>
                          <SelectItem value="thousand">Thousand</SelectItem>
                          <SelectItem value="lakh">Lakh</SelectItem>
                          <SelectItem value="crore">Crore</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {errors[`production_${detail.productId}_turnover`] && (
                      <p className="error-message">
                        {errors[`production_${detail.productId}_turnover`]}
                      </p>
                    )}
                  </div>
                </div>

                {/* Area and Years of Production */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-700 font-medium">
                      Area of Production*
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      The place where the products are produced
                    </p>
                    <Input
                      required
                      value={detail.areaOfProduction}
                      onChange={(e) =>
                        updateProductionDetail(
                          detail.productId,
                          "areaOfProduction",
                          e.target.value,
                        )
                      }
                      placeholder="e.g., Farm, Workshop, Factory"
                      className="mt-2 input-desktop bg-white border-gray-300"
                    />
                    {errors[`production_${detail.productId}_area`] && (
                      <p className="error-message">
                        {errors[`production_${detail.productId}_area`]}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-gray-700 font-medium">
                      Years of Production*
                    </Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        required
                        type="number"
                        value={detail.yearsOfProduction}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          updateProductionDetail(
                            detail.productId,
                            "yearsOfProduction",
                            value,
                          );
                        }}
                        placeholder="1"
                        className="w-20 input-desktop bg-white border-gray-300"
                        min="1"
                        max="100"
                      />
                      <span className="text-gray-600 font-medium">years</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the number of years you have been producing this
                      item
                    </p>
                    {errors[`production_${detail.productId}_years`] && (
                      <p className="error-message">
                        {errors[`production_${detail.productId}_years`]}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Notes - Full Width */}
              <div>
                <Label className="text-gray-700 font-medium">
                  Additional Notes (Optional)
                </Label>
                <Input
                  value={detail.additionalNotes || ""}
                  onChange={(e) =>
                    updateProductionDetail(
                      detail.productId,
                      "additionalNotes",
                      e.target.value,
                    )
                  }
                  placeholder="Any additional production information"
                  className="mt-2 input-desktop bg-white border-gray-300"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Section */}
      {productionDetails.length > 1 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg text-blue-800">
              Production Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {productionDetails.length}
                </p>
                <p className="text-sm text-gray-600">Total Products</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {productionDetails.filter((d) => d.annualProduction).length}
                </p>
                <p className="text-sm text-gray-600">With Production Data</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {productionDetails.filter((d) => d.areaOfProduction).length}
                </p>
                <p className="text-sm text-gray-600">With Area Data</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
