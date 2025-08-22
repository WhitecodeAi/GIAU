import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Camera, Upload } from "lucide-react";
import { DocumentUpload } from "@/components/DocumentUpload";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MobileNav from "@/components/MobileNav";
import { registrationsAPI, productsAPI } from "@/lib/api";
import { toast } from "sonner";
import { ProductionDetailsSection } from "@/components/ProductionDetailsSection";
import {
  ProductionDetail,
  VerificationRequest,
  VerificationResponse,
} from "@shared/api";

interface FormData {
  // Step 1
  name: string;
  address: string;
  age: string;
  gender: string;
  phone: string;
  email: string;
  aadharNumber: string;
  voterId: string;
  panNumber: string;

  // Step 2 - Documents
  documents: {
    aadharCard: File | null;
    panCard: File | null;
    proofOfProduction: File | null;
    signature: File | null;
    photo: File | null;
  };

  // Step 3
  productCategory: string;

  // Step 4
  existingProducts: string[];

  // Step 5
  productionDetails: ProductionDetail[];
  selectedProducts: string[];
}

export default function Registration() {
  const [currentStep, setCurrentStep] = useState(0); // Start at step 0 for verification
  const [showInstructions, setShowInstructions] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [stepValidation, setStepValidation] = useState<{
    [key: number]: boolean;
  }>({ 1: false, 2: false, 3: false, 4: false, 5: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]); // All products from all categories
  const [existingProducts, setExistingProducts] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Verification state
  const [verificationStatus, setVerificationStatus] = useState<
    "none" | "checking" | "unique" | "existing"
  >("none");
  const [verificationResult, setVerificationResult] =
    useState<VerificationResponse | null>(null);
  const [isAdditionalRegistration, setIsAdditionalRegistration] =
    useState(false);
  const [verificationData, setVerificationData] = useState({
    aadharNumber: "",
    voterId: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
      loadData();
    } else {
      navigate("/");
    }
  }, [navigate]);

  const loadData = async () => {
    try {
      const [
        categoriesData,
        productsData,
        allProductsData,
        existingProductsData,
      ] = await Promise.all([
        productsAPI.getCategories(),
        productsAPI.getProducts(),
        productsAPI.getProducts(), // Get all products for final step
        productsAPI.getExistingProducts(),
      ]);
      setCategories(categoriesData.categories);
      setProducts(productsData.products);
      setAllProducts(allProductsData.products); // Store all products separately
      setExistingProducts(existingProductsData.existingProducts);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load form data");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const [formData, setFormData] = useState<FormData>({
    name: "",
    address: "",
    age: "",
    gender: "",
    phone: "",
    email: "",
    aadharNumber: "",
    panNumber: "",
    documents: {
      aadharCard: null,
      panCard: null,
      proofOfProduction: null,
      signature: null,
      photo: null,
    },
    productCategory: "",
    existingProducts: [],
    productionDetails: [],
    selectedProducts: [],
    voterId: "",
  });

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0:
        return (
          verificationStatus === "unique" || verificationStatus === "existing"
        );
      case 1:
        const hasBasicInfo = !!(
          formData.name &&
          formData.address &&
          formData.age &&
          formData.gender &&
          formData.phone &&
          (formData.aadharNumber || formData.voterId)
        );

        // Validate Aadhar number format if provided - must be exactly 12 digits
        if (formData.aadharNumber) {
          if (
            formData.aadharNumber.length !== 12 ||
            !/^\d{12}$/.test(formData.aadharNumber)
          ) {
            return false;
          }
        }

        // Validate Voter ID format if provided - must be 3 letters + 7 digits
        if (formData.voterId) {
          if (!/^[A-Z]{3}[0-9]{7}$/i.test(formData.voterId)) {
            return false;
          }
        }

        return hasBasicInfo;
      case 2:
        return !!(
          formData.documents.aadharCard &&
          formData.documents.panCard &&
          formData.documents.proofOfProduction &&
          formData.documents.signature &&
          formData.documents.photo
        );
      case 3:
        return !!formData.productCategory;
      case 4:
        return formData.existingProducts.length > 0; // Now compulsory - must select at least one existing product
      case 5:
        // Check if all production details have required fields
        return (
          formData.productionDetails.length > 0 &&
          formData.productionDetails.every(
            (detail) =>
              detail.annualProduction &&
              detail.areaOfProduction &&
              detail.yearsOfProduction,
          )
        );
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateCurrentStep() && currentStep < 5) {
      setStepValidation((prev) => ({ ...prev, [currentStep]: true }));
      setCurrentStep(currentStep + 1);
    }
  };

  // Verification functions
  const handleVerification = async () => {
    if (!verificationData.aadharNumber && !verificationData.voterId) {
      toast.error("Please enter either Aadhar Number or Voter ID");
      return;
    }

    setVerificationStatus("checking");
    try {
      const response = await fetch("/api/registrations/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aadharNumber: verificationData.aadharNumber || undefined,
          voterId: verificationData.voterId || undefined,
        }),
      });

      const result: VerificationResponse = await response.json();
      setVerificationResult(result);

      if (result.isRegistered) {
        setVerificationStatus("existing");
        // Pre-fill form with existing data if available
        if (result.userData) {
          setFormData((prev) => ({
            ...prev,
            name: result.userData?.name || "",
            address: result.userData?.address || "",
            age: result.userData?.age?.toString() || "",
            gender: result.userData?.gender || "",
            phone: result.userData?.phone || "",
            email: result.userData?.email || "",
            aadharNumber: result.userData?.aadharNumber || "",
            voterId: result.userData?.voterId || "",
            panNumber: result.userData?.panNumber || "",
          }));
        }
      } else {
        setVerificationStatus("unique");
        // Pre-fill Aadhar/Voter ID in form
        setFormData((prev) => ({
          ...prev,
          aadharNumber: verificationData.aadharNumber || prev.aadharNumber,
          voterId: verificationData.voterId || prev.voterId,
        }));
      }
    } catch (error) {
      console.error("Verification failed:", error);
      toast.error("Verification failed. Please try again.");
      setVerificationStatus("none");
    }
  };

  const handleCreateAdditional = () => {
    setIsAdditionalRegistration(true);
    setCurrentStep(1);
  };

  // Update validation whenever form data changes
  useEffect(() => {
    setStepValidation((prev) => ({
      ...prev,
      [currentStep]: validateCurrentStep(),
    }));
  }, [formData, currentStep]);

  const handleFileUpload = (field: keyof FormData["documents"], file: File) => {
    setFormData((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [field]: file,
      },
    }));
  };

  // Function to create production details when products are selected
  const updateProductionDetails = (selectedProducts: string[]) => {
    const newProductionDetails: ProductionDetail[] = selectedProducts.map(
      (productName) => {
        const existingDetail = formData.productionDetails.find(
          (detail) => detail.productName === productName,
        );

        if (existingDetail) {
          return existingDetail;
        }

        const product = existingProducts.find((p) => p.name === productName);
        return {
          productId: product?.id || 0,
          productName: productName,
          annualProduction: "",
          unit: "pieces",
          areaOfProduction: "",
          yearsOfProduction: "",
          annualTurnover: "",
          additionalNotes: "",
        };
      },
    );

    setFormData((prev) => ({
      ...prev,
      productionDetails: newProductionDetails,
    }));
  };

  // Function to update individual production detail
  const updateProductionDetail = (
    productId: number,
    field: keyof ProductionDetail,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      productionDetails: prev.productionDetails.map((detail) =>
        detail.productId === productId ? { ...detail, [field]: value } : detail,
      ),
    }));
  };

  const handleProductToggle = (product: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedProducts: prev.selectedProducts.includes(product)
        ? prev.selectedProducts.filter((p) => p !== product)
        : [...prev.selectedProducts, product],
    }));
  };

  const handleConfirmSubmit = () => {
    setShowConfirmation(true);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const categoryId = categories.find(
        (cat) => cat.name === formData.productCategory,
      )?.id;
      if (!categoryId) {
        toast.error("Invalid product category selected");
        return;
      }

      const existingProductIds = formData.existingProducts
        .map(
          (productName) =>
            existingProducts.find((p) => p.name === productName)?.id,
        )
        .filter(Boolean);

      const selectedProductIds = formData.selectedProducts
        .map((productName) => products.find((p) => p.name === productName)?.id)
        .filter(Boolean);

      const registrationData = {
        name: formData.name,
        address: formData.address,
        age: parseInt(formData.age),
        gender: formData.gender as "male" | "female",
        phone: formData.phone,
        email: formData.email || undefined,
        aadharNumber: formData.aadharNumber,
        panNumber: formData.panNumber || undefined,
        productCategoryIds: categoryId ? [categoryId] : [],
        existingProducts: existingProductIds,
        selectedProducts: selectedProductIds,
        productionDetails: formData.productionDetails,
        isAdditionalRegistration: isAdditionalRegistration, // Add the flag
      };

      const response = await registrationsAPI.create(
        registrationData,
        formData.documents,
      );

      toast.success("🎉 Registration Completed Successfully!", {
        description: `Your GI registration has been submitted and is now being processed. Registration ID: ${response.registrationId}. You will be redirected to the dashboard shortly.`,
        duration: 5000,
        style: {
          fontSize: "20px",
          padding: "30px",
          minHeight: "100px",
          fontWeight: "bold",
        },
      });

      // Navigate to dashboard after successful registration
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Registration submission failed:", error);
      toast.error("Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getValidationMessage = (): string => {
    switch (currentStep) {
      case 0:
        if (verificationStatus === "none") {
          return "⚠️ MANDATORY: You must verify your Aadhar Number or Voter ID before proceeding with registration";
        }
        return "";
      case 1:
        const missingFields = [];
        if (!formData.name) missingFields.push("Name");
        if (!formData.address) missingFields.push("Address");
        if (!formData.age) missingFields.push("Age");
        if (!formData.gender) missingFields.push("Gender");
        if (!formData.phone) missingFields.push("Mobile Number");

        // Check if either Aadhar OR Voter ID is provided
        if (!formData.aadharNumber && !formData.voterId) {
          missingFields.push("Either Aadhar Number or Voter ID");
        } else {
          // Validate format if Aadhar is provided
          if (
            formData.aadharNumber &&
            (formData.aadharNumber.length !== 12 ||
              !/^\d{12}$/.test(formData.aadharNumber))
          ) {
            missingFields.push("Aadhar Number must be exactly 12 digits");
          }
          // Validate format if Voter ID is provided
          if (
            formData.voterId &&
            !/^[A-Z]{3}[0-9]{7}$/i.test(formData.voterId)
          ) {
            missingFields.push(
              "Voter ID must be 3 letters + 7 digits (e.g., ABC1234567)",
            );
          }
        }
        return missingFields.length > 0
          ? `Please fill in: ${missingFields.join(", ")}`
          : "";
      case 2:
        const missingDocs = [];
        if (!formData.documents.aadharCard) missingDocs.push("Aadhar Card");
        // PAN Card and Proof of Production are now optional
        // if (!formData.documents.panCard) missingDocs.push("PAN Card");
        // if (!formData.documents.proofOfProduction)
        //   missingDocs.push("Proof of Production");
        if (!formData.documents.signature) missingDocs.push("Signature");
        if (!formData.documents.photo) missingDocs.push("Photo");
        return missingDocs.length > 0
          ? `Please upload: ${missingDocs.join(", ")}`
          : "";
      case 3:
        return !formData.productCategory
          ? "Please select a product category"
          : "";
      case 4:
        return formData.existingProducts.length === 0
          ? "Please select at least one product you have already produced"
          : "";
      case 5:
        const missing5 = [];
        const incompleteProducts = formData.productionDetails.filter(
          (detail) =>
            !detail.annualProduction ||
            !detail.areaOfProduction ||
            !detail.yearsOfProduction,
        );

        if (formData.productionDetails.length === 0) {
          missing5.push("At least one product with production details");
        } else if (incompleteProducts.length > 0) {
          missing5.push(
            `Complete production details for ${incompleteProducts.length} product(s)`,
          );
        }

        if (formData.selectedProducts.length === 0) {
          missing5.push("At least one product to produce");
        }

        return missing5.length > 0
          ? `Please provide: ${missing5.join(", ")}`
          : "";
      default:
        return "";
    }
  };

  const renderStep0 = () => (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        🔒 MANDATORY: Identity Verification
      </h2>
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 text-sm font-medium">
          <strong>⚠️ COMPULSORY STEP:</strong> You must verify your Aadhar
          Number or Voter ID before proceeding. This prevents duplicate
          registrations and ensures data integrity.
          <span className="block mt-2 text-red-700">
            ❌ You cannot move to the next step without completing this
            verification.
          </span>
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <div>
          <Label htmlFor="aadhar-check" className="text-gray-700 font-medium">
            Aadhar Number (12 digits)
          </Label>
          <Input
            id="aadhar-check"
            value={verificationData.aadharNumber}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              if (value.length <= 12) {
                setVerificationData((prev) => ({
                  ...prev,
                  aadharNumber: value,
                }));
              }
            }}
            placeholder="Enter 12-digit Aadhar Number"
            className="mt-2 input-desktop bg-gray-50 border-gray-300"
            maxLength={12}
            disabled={verificationStatus === "checking"}
          />
        </div>

        <div className="text-center text-gray-500 font-medium">OR</div>

        <div>
          <Label htmlFor="voter-check" className="text-gray-700 font-medium">
            Voter ID (ABC1234567)
          </Label>
          <Input
            id="voter-check"
            value={verificationData.voterId}
            onChange={(e) => {
              const value = e.target.value.toUpperCase();
              if (value.length <= 10) {
                setVerificationData((prev) => ({ ...prev, voterId: value }));
              }
            }}
            placeholder="Enter Voter ID (3 letters + 7 digits)"
            className="mt-2 input-desktop bg-gray-50 border-gray-300"
            maxLength={10}
            disabled={verificationStatus === "checking"}
          />
        </div>

        <div className="text-center">
          <Button
            onClick={handleVerification}
            disabled={
              verificationStatus === "checking" ||
              (!verificationData.aadharNumber && !verificationData.voterId)
            }
            className="btn-primary btn-desktop w-full"
          >
            {verificationStatus === "checking"
              ? "Checking..."
              : "Check Registration Status"}
          </Button>
        </div>

        {/* Show validation error if trying to proceed without verification */}
        {!validateCurrentStep() && verificationStatus === "none" && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm text-center font-medium">
              {getValidationMessage()}
            </p>
          </div>
        )}

        {/* Verification Results */}
        {verificationStatus === "unique" && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-green-800">
              <p className="font-medium">✓ No Existing Registration Found</p>
              <p className="text-sm mt-1">
                You can proceed with new registration.
              </p>
            </div>
          </div>
        )}

        {verificationStatus === "existing" && verificationResult && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-yellow-800">
              <p className="font-medium">⚠️ Existing Registration Found</p>
              <p className="text-sm mt-1">
                Name: <strong>{verificationResult.name}</strong>
              </p>
              <p className="text-sm">
                Registered:{" "}
                {verificationResult.registrationDate
                  ? new Date(
                      verificationResult.registrationDate,
                    ).toLocaleDateString()
                  : "Unknown"}
              </p>

              <div className="mt-4 space-y-2">
                <Button
                  onClick={handleCreateAdditional}
                  className="btn-accent w-full"
                >
                  Create Additional Registration
                </Button>
                <p className="text-xs text-yellow-700 text-center">
                  For different product categories, geographic locations, or
                  business expansion
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Personal Information{" "}
        {isAdditionalRegistration && (
          <span className="text-blue-600">(Additional Registration)</span>
        )}
      </h2>

      {/* Verification Status Display */}
      {verificationStatus === "unique" && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm">
            ✓ <strong>Verification Complete:</strong> No existing registration
            found. You can proceed with new registration.
          </p>
        </div>
      )}

      {verificationStatus === "existing" && isAdditionalRegistration && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-700 text-sm">
            ℹ️ <strong>Additional Registration:</strong> Creating additional
            registration for {verificationResult?.name}. This is for different
            product categories, geographic locations, or business expansion.
          </p>
        </div>
      )}

      {!validateCurrentStep() && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-700 text-sm">{getValidationMessage()}</p>
        </div>
      )}
      <div className="form-grid">
        <div className="form-section">
          <div>
            <Label htmlFor="name" className="text-gray-700 font-medium">
              Name*
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Full Name*"
              className="mt-2 input-desktop bg-gray-50 border-gray-300"
            />
          </div>

          <div>
            <Label htmlFor="address" className="text-gray-700 font-medium">
              Address*
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, address: e.target.value }))
              }
              placeholder="Address*"
              className="mt-2 input-desktop bg-gray-50 border-gray-300"
            />
          </div>

          <div>
            <Label htmlFor="age" className="text-gray-700 font-medium">
              Age*
            </Label>
            <Input
              id="age"
              type="number"
              value={formData.age}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setFormData((prev) => ({ ...prev, age: value }));
              }}
              placeholder="Age*"
              className="mt-2 input-desktop bg-gray-50 border-gray-300"
              min="1"
              max="120"
            />
          </div>

          <div>
            <Label className="text-gray-700 font-medium">Gender*</Label>
            <RadioGroup
              value={formData.gender}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, gender: value }))
              }
              className="mt-2"
            >
              <div className="flex items-center justify-around border border-gray-300 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="male"
                    id="male"
                    className="border-blue-500"
                  />
                  <Label htmlFor="male" className="text-gray-700">
                    Male
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="female"
                    id="female"
                    className="border-blue-500"
                  />
                  <Label htmlFor="female" className="text-gray-700">
                    Female
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="form-section">
          <div>
            <Label htmlFor="phone" className="text-gray-700 font-medium">
              Mobile Number*
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, ""); // Only allow digits
                if (value.length <= 15) {
                  // Limit to 15 digits
                  setFormData((prev) => ({ ...prev, phone: value }));
                }
              }}
              placeholder="Mobile Number*"
              className="mt-2 input-desktop bg-gray-50 border-gray-300"
              maxLength={15}
              pattern="[0-9]*"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-gray-700 font-medium">
              Email
            </Label>
            <Input
              id="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="Email"
              className="mt-2 input-desktop bg-gray-50 border-gray-300"
            />
          </div>

          <div>
            <Label htmlFor="aadhar" className="text-gray-700 font-medium">
              Aadhar Number (Either Aadhar OR Voter ID required*)
            </Label>
            <Input
              id="aadhar"
              value={formData.aadharNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, ""); // Only allow digits
                if (value.length <= 12) {
                  setFormData((prev) => ({
                    ...prev,
                    aadharNumber: value,
                  }));
                }
              }}
              placeholder="12-digit Aadhar Number"
              className="mt-2 input-desktop bg-gray-50 border-gray-300"
              maxLength={12}
            />
          </div>

          <div>
            <Label htmlFor="voterId" className="text-gray-700 font-medium">
              Voter ID (Alternative to Aadhar)
            </Label>
            <Input
              id="voterId"
              value={formData.voterId}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                if (value.length <= 10) {
                  setFormData((prev) => ({
                    ...prev,
                    voterId: value,
                  }));
                }
              }}
              placeholder="Voter ID (3 letters + 7 digits, e.g., ABC1234567)"
              className="mt-2 input-desktop bg-gray-50 border-gray-300"
              maxLength={10}
            />
          </div>

          <div>
            <Label htmlFor="pan" className="text-gray-700 font-medium">
              PAN Number
            </Label>
            <Input
              id="pan"
              value={formData.panNumber}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, panNumber: e.target.value }))
              }
              placeholder="PAN Number (e.g., ABCDE1234F)"
              className="mt-2 input-desktop bg-gray-50 border-gray-300"
              maxLength={10}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Document Upload
      </h2>
      {!validateCurrentStep() && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-700 text-sm">{getValidationMessage()}</p>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {[
            { key: "aadharCard", label: "Aadhar Card", required: true },
            { key: "panCard", label: "PAN Card", required: false },
            {
              key: "proofOfProduction",
              label: "Proof of Production",
              required: false,
            },
            { key: "signature", label: "Signature", required: true },
          ].map(({ key, label, required }) => (
            <DocumentUpload
              key={key}
              label={label}
              file={formData.documents[key as keyof FormData["documents"]]}
              onFileChange={(file) =>
                handleFileUpload(key as keyof FormData["documents"], file)
              }
              onFileRemove={() => {
                setFormData((prev) => ({
                  ...prev,
                  documents: {
                    ...prev.documents,
                    [key]: null,
                  },
                }));
              }}
              required={required}
              accept="image/*"
            />
          ))}
        </div>

        <div className="flex flex-col items-center justify-center">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            Profile Photo*
          </h3>
          <div className="w-full max-w-sm">
            <DocumentUpload
              label="Profile Photo"
              file={formData.documents.photo}
              onFileChange={(file) => handleFileUpload("photo", file)}
              onFileRemove={() => {
                setFormData((prev) => ({
                  ...prev,
                  documents: {
                    ...prev.documents,
                    photo: null,
                  },
                }));
              }}
              required={true}
              accept="image/*"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      {!validateCurrentStep() && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-700 text-sm">{getValidationMessage()}</p>
        </div>
      )}
      <div>
        <Label className="text-gray-700 font-medium">
          Select Product Category*
        </Label>
        <Select
          value={formData.productCategory}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, productCategory: value }))
          }
        >
          <SelectTrigger className="mt-2 h-12 bg-gray-50 border-gray-200">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.name}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-gray-700 font-medium">
          Select Products already produced*
        </Label>
        <div className="mt-4 border border-gray-200 rounded-lg p-4 space-y-3">
          {existingProducts.map((product) => (
            <div key={product.id} className="flex items-center space-x-3">
              <Checkbox
                id={product.name}
                checked={formData.existingProducts.includes(product.name)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFormData((prev) => ({
                      ...prev,
                      existingProducts: [
                        ...prev.existingProducts,
                        product.name,
                      ],
                    }));
                  } else {
                    setFormData((prev) => ({
                      ...prev,
                      existingProducts: prev.existingProducts.filter(
                        (p) => p !== product.name,
                      ),
                    }));
                  }
                }}
                className="border-blue-500"
              />
              <div className="flex flex-col">
                <Label
                  htmlFor={product.name}
                  className="text-gray-700 font-medium"
                >
                  {product.name}
                </Label>
                {product.category_name && (
                  <span className="text-sm text-gray-500">
                    Category: {product.category_name}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div>
      {!validateCurrentStep() && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-700 text-sm">{getValidationMessage()}</p>
        </div>
      )}

      <ProductionDetailsSection
        productionDetails={formData.productionDetails}
        updateProductionDetail={updateProductionDetail}
        errors={errors}
      />

      <div className="mb-8">
        <Label className="text-gray-700 font-medium text-lg">
          Select additional products for future
        </Label>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {allProducts
            .filter(
              (product) => !formData.existingProducts.includes(product.name),
            )
            .map((product, index) => (
              <div
                key={product.id}
                className="border border-gray-300 rounded-lg p-3 hover:border-purple-400 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={product.name}
                    checked={formData.selectedProducts.includes(product.name)}
                    onCheckedChange={(checked) =>
                      handleProductToggle(product.name)
                    }
                    className="border-blue-500"
                  />
                  <div className="flex flex-col">
                    <Label
                      htmlFor={product.name}
                      className="text-gray-700 text-sm font-medium"
                    >
                      {product.name}
                    </Label>
                    <span className="text-xs text-gray-500 mt-1">
                      {categories.find((cat) => cat.id === product.category_id)
                        ?.name || "Unknown Category"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        <Button className="btn-slate btn-desktop">Add New Product</Button>
        <Button
          className="btn-accent btn-desktop"
          onClick={handleConfirmSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Registration"}
        </Button>
      </div>
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav
        user={user}
        currentPage="registration"
        currentStep={currentStep}
        onLogout={handleLogout}
      />

      <div className="desktop-layout">
        {/* Sidebar */}
        <div className="desktop-sidebar">
          {/* Logo Section */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <img
                src="https://indiangi.com/wp-content/uploads/2018/07/Indian-GI-Logo.jpg"
                alt="Indian GI Logo"
                className="w-12 h-12"
              />
              <div>
                <h1 className="font-bold text-lg text-gray-800">Indian GI</h1>
                <p className="text-sm text-gray-600">Registration App</p>
              </div>
            </div>
          </div>

          {/* Step Navigation */}
          <div className="p-4">
            <h3 className="font-semibold text-gray-800 mb-4">
              Registration Steps
            </h3>
            <nav className="space-y-2">
              {[
                { step: 0, title: "Check Registration Status" },
                { step: 1, title: "Personal Information" },
                { step: 2, title: "Document Upload" },
                { step: 3, title: "Product Category" },
                { step: 4, title: "Existing Products" },
                { step: 5, title: "Production Details" },
              ].map(({ step, title }) => (
                <div
                  key={step}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                    currentStep === step
                      ? "bg-blue-50 text-blue-700 border-l-4 border-blue-500"
                      : stepValidation[step]
                        ? "bg-teal-50 text-teal-700"
                        : "text-gray-500"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      currentStep === step
                        ? "bg-blue-500 text-white"
                        : stepValidation[step]
                          ? "bg-teal-500 text-white"
                          : "bg-gray-300 text-gray-600"
                    }`}
                  >
                    {stepValidation[step] && currentStep !== step ? "✓" : step}
                  </div>
                  <span className="text-sm font-medium">{title}</span>
                </div>
              ))}
            </nav>
          </div>

          {/* Progress */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-sm text-gray-600 mb-2">Progress</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(Object.values(stepValidation).filter(Boolean).length / 6) * 100}%`,
                }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Step {currentStep} of 6
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="desktop-main">
          {/* Header */}
          <div className="desktop-header">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-[hsl(var(--gi-secondary))] hover:text-[hsl(var(--gi-secondary))]/80"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {isAdditionalRegistration
                    ? "Additional Registration"
                    : "Register New User"}{" "}
                  - Step {currentStep}
                </h1>
                <p className="text-gray-600">
                  {currentStep === 0 && "Check your registration status first"}
                  {currentStep === 1 && "Enter personal information"}
                  {currentStep === 2 && "Upload required documents"}
                  {currentStep === 3 && "Select product category"}
                  {currentStep === 4 && "Choose existing products"}
                  {currentStep === 5 &&
                    "Production details and additional product selection"}
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="desktop-content">
            <div className="max-w-6xl mx-auto">
              <div className="card-container">
                {currentStep === 0 && renderStep0()}
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
                {currentStep === 4 && renderStep4()}
                {currentStep === 5 && renderStep5()}

                {/* Navigation Buttons */}
                {currentStep > 0 && (
                  <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                    <div>
                      {currentStep > 1 && (
                        <Button
                          onClick={() => setCurrentStep(currentStep - 1)}
                          variant="outline"
                          className="btn-desktop"
                        >
                          Previous
                        </Button>
                      )}
                      {currentStep === 1 && (
                        <Button
                          onClick={() => setCurrentStep(0)}
                          variant="outline"
                          className="btn-desktop"
                        >
                          Back to Verification
                        </Button>
                      )}
                    </div>

                    <div className="flex gap-3">
                      {currentStep < 5 && (
                        <Button
                          onClick={handleNext}
                          disabled={!validateCurrentStep()}
                          className={`btn-desktop ${
                            validateCurrentStep()
                              ? "btn-primary"
                              : "bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300"
                          }`}
                        >
                          Next Step
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <DialogContent className="max-w-4xl mx-auto max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-800">
                Confirm Registration Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-gray-900">
                    Personal Information
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Name:</span> {formData.name}
                    </div>
                    <div>
                      <span className="font-medium">Age:</span> {formData.age}
                    </div>
                    <div>
                      <span className="font-medium">Gender:</span>{" "}
                      {formData.gender}
                    </div>
                    <div>
                      <span className="font-medium">Mobile Number:</span>{" "}
                      {formData.phone}
                    </div>
                    {formData.email && (
                      <div>
                        <span className="font-medium">Email:</span>{" "}
                        {formData.email}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Address:</span>{" "}
                      {formData.address}
                    </div>
                    <div>
                      <span className="font-medium">Aadhar Number:</span>{" "}
                      {formData.aadharNumber}
                    </div>
                    {formData.panNumber && (
                      <div>
                        <span className="font-medium">PAN Number:</span>{" "}
                        {formData.panNumber}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-gray-900">
                    Product Information
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Category:</span>{" "}
                      {formData.productCategory}
                    </div>
                    {formData.existingProducts.length > 0 && (
                      <div>
                        <span className="font-medium">Existing Products:</span>{" "}
                        {formData.existingProducts.join(", ")}
                      </div>
                    )}
                    {formData.selectedProducts.length > 0 && (
                      <div>
                        <span className="font-medium">Selected Products:</span>{" "}
                        {formData.selectedProducts.join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {formData.productionDetails.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-gray-900">
                    Production Details
                  </h3>
                  <div className="space-y-3">
                    {formData.productionDetails.map((detail, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 p-3 rounded-lg border"
                      >
                        <h4 className="font-medium text-gray-900 mb-2">
                          {detail.productName}
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {detail.annualProduction && (
                            <div>
                              <span className="font-medium">
                                Annual Production:
                              </span>{" "}
                              {detail.annualProduction} {detail.unit}
                            </div>
                          )}
                          {detail.areaOfProduction && (
                            <div>
                              <span className="font-medium">Area:</span>{" "}
                              {detail.areaOfProduction}
                            </div>
                          )}
                          {detail.yearsOfProduction && (
                            <div>
                              <span className="font-medium">Years:</span>{" "}
                              {detail.yearsOfProduction}
                            </div>
                          )}
                          {detail.annualTurnover && (
                            <div>
                              <span className="font-medium">Turnover:</span> ₹
                              {detail.annualTurnover}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-gray-900">
                  Documents
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {formData.documents.aadharCard && (
                    <div className="text-green-600">✓ Aadhar Card</div>
                  )}
                  {formData.documents.panCard && (
                    <div className="text-green-600">✓ PAN Card</div>
                  )}
                  {formData.documents.proofOfProduction && (
                    <div className="text-green-600">✓ Proof of Production</div>
                  )}
                  {formData.documents.signature && (
                    <div className="text-green-600">✓ Signature</div>
                  )}
                  {formData.documents.photo && (
                    <div className="text-green-600">�� Profile Photo</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                disabled={isSubmitting}
              >
                Edit Details
              </Button>
              <Button
                onClick={() => {
                  setShowConfirmation(false);
                  handleSubmit();
                }}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isSubmitting ? "Submitting..." : "Confirm & Submit"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Instructions Dialog */}
        <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
          <DialogContent className="bg-gray-800 text-white max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle className="text-white text-lg font-semibold">
                Registration Instructions
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <p className="font-semibold">Adding Products:</p>
              <ol className="space-y-2">
                <li>1. Fill out product information and click 'Submit'</li>
                <li>2. To add more products, click 'Previous'</li>
                <li>
                  3. When all products are added, click 'Submit' to complete
                  registration
                </li>
              </ol>
            </div>
            <div className="text-right">
              <Button
                onClick={() => setShowInstructions(false)}
                className="bg-teal-500 hover:bg-teal-600 text-white"
              >
                GOT IT
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
