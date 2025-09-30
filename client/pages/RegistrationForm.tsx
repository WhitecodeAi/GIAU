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
import { ArrowLeft, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MobileNav from "@/components/MobileNav";
import { DocumentUpload } from "@/components/DocumentUpload";
import {
  productsAPI,
  registrationsAPI,
  handleAPIError,
  authAPI,
} from "@/lib/api";
import { VerificationRequest, VerificationResponse } from "@shared/api";
import { toast } from "sonner";
const GG =
  "https://cdn.builder.io/api/v1/image/assets%2F6d290b314071499797627b72ba9eee0c%2F8534ae45ef654b0787f8a11feecfb02c?format=webp&width=800";
interface ProductionDetails {
  areaOfProduction: string;
  annualProduction: string;
  annualTurnover: string;
  yearsOfProduction: string;
  unit: string;
  turnoverUnit?: string;
}

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
    // Combined image sent to server
    aadharCard: File | null;
    // Front and Back captured from user
    aadharCardFront: File | null;
    aadharCardBack: File | null;
    panCard: File | null;
    proofOfProduction: File | null;
    signature: File | null;
    photo: File | null;
  };

  // Step 3
  productCategoryIds: number[];

  // Step 4
  existingProducts: number[];

  // Step 5 - Production details for each existing product
  existingProductDetails: { [productId: number]: ProductionDetails };
  selectedProducts: number[];
}

export default function RegistrationForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [stepValidation, setStepValidation] = useState<{
    [key: number]: boolean;
  }>({ 1: false, 2: false, 3: false, 4: false, 5: false });
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isRegistered: boolean;
    name?: string;
    registrationDate?: string;
    userData?: any;
  } | null>(null);
  const [isAdditionalRegistration, setIsAdditionalRegistration] =
    useState(false);
  const [baseRegistrationId, setBaseRegistrationId] = useState<number | null>(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    address: "",
    age: "",
    gender: "",
    phone: "",
    email: "",
    aadharNumber: "",
    voterId: "",
    panNumber: "",
    documents: {
      aadharCard: null,
      aadharCardFront: null,
      aadharCardBack: null,
      panCard: null,
      proofOfProduction: null,
      signature: null,
      photo: null,
    },
    productCategoryIds: [],
    existingProducts: [],
    existingProductDetails: {},
    selectedProducts: [],
  });

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate("/");
      return;
    }

    // Proactively verify token; if invalid, force re-login
    authAPI.verifyToken().catch(() => {
      toast.error("Session expired. Please login again.");
      localStorage.removeItem("user");
      navigate("/");
    });

    fetchCategories();
  }, [navigate]);

  useEffect(() => {
    // Load all products regardless of category selection
    fetchAllProducts();
  }, []);

  // Fetch products whenever selected categories change
  useEffect(() => {
    const ids = formData.productCategoryIds;
    if (!ids || ids.length === 0) {
      // No categories selected - show no products to force category selection
      setProducts([]);
      return;
    }
    fetchProductsForCategories(ids);
  }, [formData.productCategoryIds]);

  const fetchCategories = async () => {
    try {
      const data = await productsAPI.getCategories();
      setCategories(data.categories);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchAllProducts = async () => {
    try {
      const data = await productsAPI.getProducts(); // Get all products regardless of category
      setProducts(data.products);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setProducts([]);
    }
  };

  const fetchProductsForCategories = async (categoryIds: number[]) => {
    try {
      const data = await productsAPI.getProductsByCategories(categoryIds);
      setProducts(data.products);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setProducts([]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        const hasBasicInfo = !!(
          formData.name &&
          formData.address &&
          formData.age &&
          formData.gender &&
          formData.phone &&
          (formData.aadharNumber || formData.voterId)
        );

        // Validate Aadhar number format if provided
        if (formData.aadharNumber) {
          if (
            formData.aadharNumber.length !== 12 ||
            !/^\d{12}$/.test(formData.aadharNumber)
          ) {
            return false;
          }
        }

        // Validate Voter ID format if provided
        if (formData.voterId) {
          if (!/^[A-Z]{3}[0-9]{7}$/i.test(formData.voterId)) {
            return false;
          }
        }

        // Require verification to be performed before proceeding
        if (!verificationResult) {
          return false;
        }

        // If verification was done and user is already registered, prevent proceeding unless it's additional registration
        if (
          verificationResult &&
          verificationResult.isRegistered &&
          !isAdditionalRegistration
        ) {
          return false;
        }

        return hasBasicInfo;
      case 2: {
        const hasAadharFrontBack =
          !!formData.documents.aadharCardFront && !!formData.documents.aadharCardBack;
        const hasAadharFromBase = !!(
          isAdditionalRegistration && verificationResult?.userData?.documentPaths?.aadharCard
        );
        const hasSignature = !!formData.documents.signature || !!(
          isAdditionalRegistration && verificationResult?.userData?.documentPaths?.signature
        );
        const hasPhoto = !!formData.documents.photo || !!(
          isAdditionalRegistration && verificationResult?.userData?.documentPaths?.photo
        );

        return !!(
          (hasAadharFrontBack || hasAadharFromBase) && hasSignature && hasPhoto
        );
      }
      case 3:
        return formData.productCategoryIds.length > 0;
      case 4:
        return formData.existingProducts.length > 0; // Now compulsory - must select at least one existing product
      case 5:
        // All production details must be filled for each selected product
        return formData.existingProducts.every((productId) => {
          const details = formData.existingProductDetails[productId];
          return (
            !!details &&
            !!details.areaOfProduction &&
            !!details.unit &&
            !!details.annualProduction &&
            !!details.annualTurnover &&
            !!details.yearsOfProduction
          );
        });
      default:
        return false;
    }
  };

  const handleNext = () => {
    // Check if user is already registered when trying to proceed from step 1 (unless it's additional registration)
    if (
      currentStep === 1 &&
      verificationResult &&
      verificationResult.isRegistered &&
      !isAdditionalRegistration
    ) {
      setError(
        "Cannot proceed: This ID is already registered. Please use a different Aadhar Number or Voter ID or create an additional registration.",
      );
      return;
    }

    if (validateCurrentStep() && currentStep < 5) {
      setStepValidation((prev) => ({ ...prev, [currentStep]: true }));
      setCurrentStep(currentStep + 1);
      setError("");
    } else {
      setError("Please complete all required fields");
    }
  };

  // Update validation whenever form data changes
  useEffect(() => {
    setStepValidation((prev) => ({
      ...prev,
      [currentStep]: validateCurrentStep(),
    }));
  }, [formData, currentStep]);

  const handleFileUpload = (
    field: keyof FormData["documents"],
    file: File | null,
  ) => {
    setFormData((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [field]: file,
      },
    }));
  };

  // Load an image from a File
  const loadImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image"));
      };
      img.src = url;
    });
  };

  // Combine two images side-by-side into a single JPEG File
  const combineAadharImages = async (
    front: File,
    back: File,
  ): Promise<File> => {
    const [img1, img2] = await Promise.all([loadImage(front), loadImage(back)]);
    const targetHeight = Math.max(img1.height, img2.height) || 1000;
    const scale1 = targetHeight / (img1.height || targetHeight);
    const scale2 = targetHeight / (img2.height || targetHeight);
    const width1 = Math.max(
      1,
      Math.round((img1.width || targetHeight) * scale1),
    );
    const width2 = Math.max(
      1,
      Math.round((img2.width || targetHeight) * scale2),
    );

    const canvas = document.createElement("canvas");
    canvas.width = width1 + width2;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    ctx.drawImage(img1, 0, 0, width1, targetHeight);
    ctx.drawImage(img2, width1, 0, width2, targetHeight);

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Failed to create image"))),
        "image/jpeg",
        0.9,
      );
    });

    return new File([blob], "aadhar-combined.jpg", { type: "image/jpeg" });
  };

  // When both front and back are available, auto-combine into a single file for server
  useEffect(() => {
    const front = formData.documents.aadharCardFront;
    const back = formData.documents.aadharCardBack;

    if (front && back) {
      (async () => {
        try {
          const combined = await combineAadharImages(front, back);
          setFormData((prev) => ({
            ...prev,
            documents: { ...prev.documents, aadharCard: combined },
          }));
        } catch (e) {
          console.error("Failed to combine Aadhar images:", e);
        }
      })();
    } else {
      if (formData.documents.aadharCard) {
        setFormData((prev) => ({
          ...prev,
          documents: { ...prev.documents, aadharCard: null },
        }));
      }
    }
  }, [formData.documents.aadharCardFront, formData.documents.aadharCardBack]);

  const handleProductToggle = (productId: number) => {
    setFormData((prev) => ({
      ...prev,
      selectedProducts: prev.selectedProducts.includes(productId)
        ? prev.selectedProducts.filter((p) => p !== productId)
        : [...prev.selectedProducts, productId],
    }));
  };

  const handleExistingProductToggle = (productId: number) => {
    setFormData((prev) => {
      const isRemoving = prev.existingProducts.includes(productId);
      const newExistingProducts = isRemoving
        ? prev.existingProducts.filter((p) => p !== productId)
        : [...prev.existingProducts, productId];

      const newProductDetails = { ...prev.existingProductDetails };

      if (isRemoving) {
        // Remove production details for this product
        delete newProductDetails[productId];
      } else {
        // Initialize production details for new product
        newProductDetails[productId] = {
          areaOfProduction: "",
          annualProduction: "",
          annualTurnover: "",
          yearsOfProduction: "",
          unit: "kg", // Default unit
          turnoverUnit: "lakh", // Default turnover unit
        };
      }

      return {
        ...prev,
        existingProducts: newExistingProducts,
        existingProductDetails: newProductDetails,
      };
    });
  };

  const handleVerification = async () => {
    // Clear previous verification result
    setVerificationResult(null);

    if (!formData.aadharNumber && !formData.voterId) {
      setError("Please enter either Aadhar Number or Voter ID to verify");
      return;
    }

    setIsVerifying(true);

    try {
      const verificationData: VerificationRequest = {
        aadharNumber: formData.aadharNumber || undefined,
        voterId: formData.voterId || undefined,
      };

      const response = await fetch("/api/registrations/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(verificationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Verification failed");
      }

      const result: VerificationResponse = await response.json();
      setVerificationResult(result);

      // Clear any previous errors
      setError("");
    } catch (error) {
      console.error("Verification error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Verification failed. Please try again.",
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirmSubmit = () => {
    if (!validateCurrentStep()) {
      setError("Please complete all required fields");
      return;
    }
    setShowConfirmation(true);
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      setError("Please complete all required fields");
      return;
    }

    setLoading(true);
    try {
      // Convert existingProductDetails to proper productionDetails format
      const productionDetails = Object.entries(
        formData.existingProductDetails,
      ).map(([productIdStr, details]) => {
        const productId = parseInt(productIdStr, 10);
        const product = products.find((p) => p.id === productId);

        return {
          productId: productId,
          productName: product?.name || `Product ${productId}`,
          annualProduction: details.annualProduction || "",
          unit: details.unit || "kg",
          areaOfProduction: details.areaOfProduction || "",
          yearsOfProduction: details.yearsOfProduction || "",
          annualTurnover: details.annualTurnover || "",
          turnoverUnit: details.turnoverUnit || "",
          additionalNotes: "",
        };
      });

      // Prepare registration data
      const registrationData = {
        name: formData.name,
        address: formData.address,
        age: parseInt(formData.age) || 0,
        gender: formData.gender as "male" | "female",
        phone: formData.phone,
        email: formData.email,
        aadharNumber: formData.aadharNumber || undefined,
        voterId: formData.voterId || undefined,
        panNumber: formData.panNumber,
        productCategoryIds: formData.productCategoryIds,
        existingProducts: formData.existingProducts,
        selectedProducts: formData.selectedProducts,
        productionDetails: productionDetails,
        existingProductDetails: formData.existingProductDetails, // Keep for backwards compatibility
        isAdditionalRegistration: isAdditionalRegistration, // Flag for additional registration
      };

      // Prepare only expected document fields for server
      const documentsToSend = {
        aadharCard: formData.documents.aadharCard,
        panCard: formData.documents.panCard,
        proofOfProduction: formData.documents.proofOfProduction,
        signature: formData.documents.signature,
        photo: formData.documents.photo,
      } as const;

      const result = await registrationsAPI.create(
        registrationData,
        documentsToSend,
      );

      toast.success("🎉 Registration Completed Successfully!", {
        description: `Your GI registration has been submitted and is now being processed. Registration ID: ${result.registrationId}. Redirecting to dashboard...`,
        duration: 5000,
        style: {
          fontSize: "20px",
          padding: "30px",
          minHeight: "100px",
          fontWeight: "bold",
        },
      });
      navigate("/dashboard", { state: { message: "Registration completed!" } });
    } catch (err: any) {
      const errorMessage = err.message || "Something went wrong";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getValidationMessage = (): string => {
    switch (currentStep) {
      case 1:
        const missingFields = [];
        if (!formData.name) missingFields.push("Name");
        if (!formData.address) missingFields.push("Address");
        if (!formData.age) missingFields.push("Age");
        if (!formData.gender) missingFields.push("Gender");
        if (!formData.phone) missingFields.push("Mobile Number");
        // Require either Aadhar or Voter ID
        if (!formData.aadharNumber && !formData.voterId) {
          missingFields.push("Either Aadhar Number or Voter ID is required");
        } else {
          // Validate Aadhar number format if provided
          if (
            formData.aadharNumber &&
            (formData.aadharNumber.length !== 12 ||
              !/^\d{12}$/.test(formData.aadharNumber))
          ) {
            missingFields.push("Aadhar Number must be exactly 12 digits");
          }
          // Validate Voter ID format if provided
          if (
            formData.voterId &&
            !/^[A-Z]{3}[0-9]{7}$/i.test(formData.voterId)
          ) {
            missingFields.push(
              "Voter ID must be in format ABC1234567 (3 letters + 7 digits)",
            );
          }
        }

        // Check if verification is required
        if (!verificationResult) {
          if (missingFields.length > 0) {
            missingFields.push(
              "Click 'Check Registration Status' to verify your ID",
            );
          } else {
            return "Please click 'Check Registration Status' to verify your ID before proceeding";
          }
        }

        if (
          verificationResult &&
          verificationResult.isRegistered &&
          !isAdditionalRegistration
        ) {
          return "Cannot proceed: This ID is already registered. Please use a different Aadhar Number or Voter ID or create an additional registration.";
        }
        return missingFields.length > 0
          ? `Please fill in: ${missingFields.join(", ")}`
          : "";
      case 2: {
        const missingDocs = [] as string[];
        const aadharAvailableFromBase = !!(
          isAdditionalRegistration && verificationResult?.userData?.documentPaths?.aadharCard
        );
        const signatureAvailableFromBase = !!(
          isAdditionalRegistration && verificationResult?.userData?.documentPaths?.signature
        );
        const photoAvailableFromBase = !!(
          isAdditionalRegistration && verificationResult?.userData?.documentPaths?.photo
        );

        if (!formData.documents.aadharCardFront && !aadharAvailableFromBase)
          missingDocs.push("Aadhar Card (Front)");
        if (!formData.documents.aadharCardBack && !aadharAvailableFromBase)
          missingDocs.push("Aadhar Card (Back)");
        // PAN Card and Proof of Production are optional
        if (!formData.documents.signature && !signatureAvailableFromBase)
          missingDocs.push("Signature");
        if (!formData.documents.photo && !photoAvailableFromBase)
          missingDocs.push("Photo");
        return missingDocs.length > 0
          ? `Please upload: ${missingDocs.join(", ")}`
          : "";
      }
      case 3:
        return formData.productCategoryIds.length === 0
          ? "Please select at least one product category"
          : "";
      case 4:
        return ""; // Optional step
      case 5:
        const incomplete = formData.existingProducts.filter((productId) => {
          const d = formData.existingProductDetails[productId];
          return (
            !d ||
            !d.areaOfProduction ||
            !d.unit ||
            !d.annualProduction ||
            !d.annualTurnover ||
            !d.yearsOfProduction
          );
        });
        if (incomplete.length > 0) {
          const productNames = incomplete.map(
            (id) => products.find((p) => p.id === id)?.name || `Product ${id}`,
          );
          return `Please complete all production details (Area of Production, Annual Production, Unit, Annual Turnover, Years of Production) for: ${productNames.join(", ")}`;
        }
        return "";
      default:
        return "";
    }
  };

  const renderStep1 = () => (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Personal Information
        {isAdditionalRegistration && (
          <span className="text-blue-600"> (Additional Registration)</span>
        )}
      </h2>
      {!validateCurrentStep() && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-700 text-sm">{getValidationMessage()}</p>
        </div>
      )}
      <div className="form-grid">
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-medium text-gray-800 mb-3">
              Identification Verification
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide either your Aadhar Number OR Voter ID for
              verification.
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="aadhar" className="text-gray-700 font-medium">
                  Aadhar Number
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
                      // Clear verification result when input changes
                      setVerificationResult(null);
                    }
                  }}
                  placeholder="12-digit Aadhar Number"
                  className="mt-2 input-desktop bg-gray-50 border-gray-300"
                  maxLength={12}
                />
              </div>

              <div className="text-center text-gray-500 font-medium">OR</div>

              <div>
                <Label htmlFor="voterId" className="text-gray-700 font-medium">
                  Voter ID
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
                      // Clear verification result when input changes
                      setVerificationResult(null);
                    }
                  }}
                  placeholder="Voter ID (e.g., ABC1234567)"
                  className="mt-2 input-desktop bg-gray-50 border-gray-300"
                  maxLength={10}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handleVerification}
                  disabled={
                    isVerifying || (!formData.aadharNumber && !formData.voterId)
                  }
                  className="w-full btn-secondary"
                >
                  {isVerifying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Verifying...
                    </>
                  ) : (
                    "Check Registration Status"
                  )}
                </Button>
              </div>

              {verificationResult && (
                <div
                  className={`p-3 rounded-lg ${
                    verificationResult.isRegistered
                      ? "bg-yellow-50 border border-yellow-200"
                      : "bg-green-50 border border-green-200"
                  }`}
                >
                  {verificationResult.isRegistered ? (
                    <div className="text-yellow-800">
                      <p className="font-medium">⚠️ Already Registered</p>
                      <p className="text-sm mt-1">
                        This ID is already registered under the name:{" "}
                        <strong>{verificationResult.name}</strong>
                      </p>
                      <p className="text-sm">
                        Registration Date:{" "}
                        {new Date(
                          verificationResult.registrationDate!,
                        ).toLocaleDateString()}
                      </p>

                      {!isAdditionalRegistration && (
                        <div className="mt-4 space-y-2">
                          <Button
                            type="button"
                            onClick={() => {
                              setIsAdditionalRegistration(true);
                              // Save base registration id for createAdditional
                              setBaseRegistrationId(
                                verificationResult.registrationId ||
                                  verificationResult.existingRegistrations?.[0]?.id ||
                                  null,
                              );

                              // Load existing user data if available
                              if (verificationResult.userData) {
                                setFormData((prev) => ({
                                  ...prev,
                                  name:
                                    verificationResult.userData.name ||
                                    prev.name,
                                  address:
                                    verificationResult.userData.address ||
                                    prev.address,
                                  age:
                                    verificationResult.userData.age?.toString() ||
                                    prev.age,
                                  gender:
                                    verificationResult.userData.gender ||
                                    prev.gender,
                                  phone:
                                    verificationResult.userData.phone ||
                                    prev.phone,
                                  email:
                                    verificationResult.userData.email ||
                                    prev.email,
                                  panNumber:
                                    verificationResult.userData.panNumber ||
                                    prev.panNumber,
                                }));
                              }
                              setError("");
                            }}
                            className="w-full btn-accent"
                          >
                            Create Additional Registration
                          </Button>
                          <p className="text-xs text-yellow-700 text-center">
                            For different product categories, geographic
                            locations, or business expansion
                          </p>
                        </div>
                      )}

                      {isAdditionalRegistration && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-blue-700 text-sm">
                            ℹ️ <strong>Additional Registration Mode:</strong>{" "}
                            Creating additional registration for{" "}
                            {verificationResult.name}. This allows you to
                            register for different product categories or
                            business expansion.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-green-800">
                      <p className="font-medium">
                        ✅ Available for Registration
                      </p>
                      <p className="text-sm mt-1">
                        This ID is not registered yet. You can proceed with
                        registration.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="form-section">
          <div>
            <Label htmlFor="name" className="text-gray-700 font-medium">
              Name<span className="text-red-500">*</span>
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
              Address<span className="text-red-500">*</span>
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
              Age<span className="text-red-500">*</span>
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
            <Label className="text-gray-700 font-medium">
              Gender<span className="text-red-500">*</span>
            </Label>
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
              Mobile Number<span className="text-red-500">*</span>
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
          {(() => {
            const aadharPreview = verificationResult?.userData?.documentPaths?.aadharCard || null;
            const panPreview = verificationResult?.userData?.documentPaths?.panCard || null;
            const proofPreview = verificationResult?.userData?.documentPaths?.proofOfProduction || null;
            const signaturePreview = verificationResult?.userData?.documentPaths?.signature || null;

            return (
              <>
                <DocumentUpload
                  label="Aadhar Card (Front)"
                  file={formData.documents.aadharCardFront}
                  onFileChange={(file) => handleFileUpload("aadharCardFront", file)}
                  onFileRemove={() => handleFileUpload("aadharCardFront", null)}
                  required={true}
                  disabled={isAdditionalRegistration && !!aadharPreview}
                  previewUrl={isAdditionalRegistration ? aadharPreview : undefined}
                />

                <DocumentUpload
                  label="Aadhar Card (Back)"
                  file={formData.documents.aadharCardBack}
                  onFileChange={(file) => handleFileUpload("aadharCardBack", file)}
                  onFileRemove={() => handleFileUpload("aadharCardBack", null)}
                  required={true}
                  disabled={isAdditionalRegistration && !!aadharPreview}
                  previewUrl={isAdditionalRegistration ? aadharPreview : undefined}
                />

                <DocumentUpload
                  label="PAN Card"
                  file={formData.documents.panCard}
                  onFileChange={(file) => handleFileUpload("panCard", file)}
                  onFileRemove={() => handleFileUpload("panCard", null)}
                  required={false}
                  disabled={isAdditionalRegistration && !!panPreview}
                  previewUrl={isAdditionalRegistration ? panPreview : undefined}
                />

                <DocumentUpload
                  label="Proof of Production"
                  file={formData.documents.proofOfProduction}
                  onFileChange={(file) => handleFileUpload("proofOfProduction", file)}
                  onFileRemove={() => handleFileUpload("proofOfProduction", null)}
                  required={false}
                  disabled={isAdditionalRegistration && !!proofPreview}
                  previewUrl={isAdditionalRegistration ? proofPreview : undefined}
                />

                <DocumentUpload
                  label="Signature"
                  file={formData.documents.signature}
                  onFileChange={(file) => handleFileUpload("signature", file)}
                  onFileRemove={() => handleFileUpload("signature", null)}
                  required={true}
                  disabled={isAdditionalRegistration && !!signaturePreview}
                  previewUrl={isAdditionalRegistration ? signaturePreview : undefined}
                />
              </>
            );
          })()}
        </div>

        <div className="flex flex-col items-center justify-center">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            Profile Photo<span className="text-red-500">*</span>
          </h3>
          <div className="w-full max-w-sm">
            {(() => {
              const photoPreview = verificationResult?.userData?.documentPaths?.photo || null;
              return (
                <DocumentUpload
                  label="Profile Photo"
                  file={formData.documents.photo}
                  onFileChange={(file) => handleFileUpload("photo", file)}
                  onFileRemove={() => handleFileUpload("photo", null)}
                  required={true}
                  showPreview={true}
                  disabled={isAdditionalRegistration && !!photoPreview}
                  previewUrl={isAdditionalRegistration ? photoPreview : undefined}
                />
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Product Categories
      </h2>
      {!validateCurrentStep() && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-700 text-sm">{getValidationMessage()}</p>
        </div>
      )}
      <div>
        <Label className="text-gray-700 font-medium">
          Select Product Categories<span className="text-red-500">*</span> (You
          can select multiple)
        </Label>
        <div className="mt-4 border border-gray-200 rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
          {(() => {
            const categoriesToShow =
              isAdditionalRegistration && verificationResult?.availableCategories
                ? verificationResult.availableCategories
                : categories;

            return categoriesToShow.map((category) => (
              <div key={category.id} className="flex items-center space-x-3">
                <Checkbox
                  id={`category-${category.id}`}
                  checked={formData.productCategoryIds.includes(category.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFormData((prev) => ({
                        ...prev,
                        productCategoryIds: [
                          ...prev.productCategoryIds,
                          category.id,
                        ],
                      }));
                    } else {
                      setFormData((prev) => ({
                        ...prev,
                        productCategoryIds: prev.productCategoryIds.filter(
                          (id) => id !== category.id,
                        ),
                      }));
                    }
                  }}
                  className="border-green-500"
                />
                <Label
                  htmlFor={`category-${category.id}`}
                  className="text-gray-700 cursor-pointer"
                >
                  {category.name}
                </Label>
                {category.description && (
                  <span className="text-sm text-gray-500">
                    ({category.description})
                  </span>
                )}
              </div>
            ));
          })()}
        </div>
        {formData.productCategoryIds.length > 0 && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm">
              Selected:{" "}
              {categories
                .filter((cat) => formData.productCategoryIds.includes(cat.id))
                .map((cat) => cat.name)
                .join(", ")}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-gray-700 font-medium">
          Select Products already produced
          <span className="text-red-500">*</span>
        </Label>
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-700 text-sm">
            <strong>Note:</strong> If you want to select more products, click
            the "Previous" button to go back and change your product category
            selections.
          </p>
        </div>
        <div className="mt-4 border border-gray-200 rounded-lg p-4 space-y-3">
          {products
            .filter((product) =>
              formData.productCategoryIds.includes(product.category_id),
            )
            .map((product) => (
              <div key={product.id} className="flex items-center space-x-3">
                <Checkbox
                  id={`existing-${product.id}`}
                  checked={formData.existingProducts.includes(product.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleExistingProductToggle(product.id);
                    } else {
                      handleExistingProductToggle(product.id);
                    }
                  }}
                  className="border-blue-500"
                />
                <div className="flex flex-col">
                  <Label
                    htmlFor={`existing-${product.id}`}
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
          {products.filter((product) =>
            formData.productCategoryIds.includes(product.category_id),
          ).length === 0 && (
            <p className="text-gray-500 text-sm">
              Please select a product category first
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const updateProductDetail = (
    productId: number,
    field: keyof ProductionDetails,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      existingProductDetails: {
        ...prev.existingProductDetails,
        [productId]: {
          ...prev.existingProductDetails[productId],
          [field]: value,
        },
      },
    }));
  };

  // Fetch all products when step 5 is reached
  const fetchAllProductsForStep5 = async () => {
    try {
      const data = await productsAPI.getProducts(); // Get all products regardless of category
      setAllProducts(data.products);
    } catch (error) {
      console.error("Failed to fetch all products for step 5:", error);
      setAllProducts([]);
    }
  };

  // Call API when step 5 is reached
  useEffect(() => {
    if (currentStep === 5) {
      fetchAllProductsForStep5();
    }
  }, [currentStep]);

  const renderStep5 = () => {
    const selectedExistingProducts = products.filter((product) =>
      formData.existingProducts.includes(product.id),
    );

    // Filter out products that are already in the current products state
    const remainingProducts = allProducts.filter(
      (product) =>
        !products.some((existingProduct) => existingProduct.id === product.id),
    );

    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Production Details for Each Product
        </h2>

        {/* Helpful hints for users */}
        {/* <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">
            What to fill in:
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>
              <strong>Area of production:</strong> The place where the products
              are produced
            </li>
            <li>
              <strong>Annual production:</strong> The quantity of the product
              produced
            </li>
            <li>
              <strong>Annual turnover:</strong> Yearly income from this product
            </li>
            <li>
              <strong>Years of production:</strong> Since how many years the
              product is been produced
            </li>
          </ul>
        </div> */}

        {!validateCurrentStep() && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-700 text-sm">{getValidationMessage()}</p>
          </div>
        )}

        {selectedExistingProducts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">
              No existing products selected. Please go back to Step 4 to select
              products.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {selectedExistingProducts.map((product, index) => {
              const details = formData.existingProductDetails[product.id] || {
                areaOfProduction: "",
                annualProduction: "",
                annualTurnover: "",
                yearsOfProduction: "",
                unit: "kg",
              };

              return (
                <div
                  key={product.id}
                  className="border border-gray-300 rounded-lg p-6 bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {index + 1}. {product.name}
                    </h3>
                    {product.category_name && (
                      <span className="text-sm text-gray-600 bg-gray-200 px-2 py-1 rounded">
                        Category: {product.category_name}
                      </span>
                    )}
                  </div>

                  <div className="form-grid">
                    <div className="form-section">
                      <div>
                        <Label className="text-gray-700 font-medium">
                          Area of Production
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          required
                          value={details.areaOfProduction}
                          onChange={(e) =>
                            updateProductDetail(
                              product.id,
                              "areaOfProduction",
                              e.target.value,
                            )
                          }
                          placeholder="Area of Production"
                          className="mt-2 input-desktop bg-white border-gray-300"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          The place where the products are produced
                        </p>
                      </div>

                      <div>
                        <Label className="text-gray-700 font-medium">
                          Annual Production
                          <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex gap-2 mt-2">
                          <Input
                            required
                            value={details.annualProduction}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "");
                              updateProductDetail(
                                product.id,
                                "annualProduction",
                                value,
                              );
                            }}
                            placeholder="Annual Production"
                            className="flex-1 input-desktop bg-white border-gray-300"
                          />
                          <Select
                            value={details.unit}
                            onValueChange={(value) =>
                              updateProductDetail(product.id, "unit", value)
                            }
                          >
                            <SelectTrigger className="w-32 input-desktop bg-white border-gray-300">
                              <SelectValue placeholder="Unit" />
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
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          The quantity of the product produced
                        </p>
                      </div>
                    </div>

                    <div className="form-section">
                      <div>
                        <Label className="text-gray-700 font-medium">
                          Annual Turnover
                          <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex gap-2 mt-2">
                          <Input
                            required
                            type="number"
                            value={details.annualTurnover}
                            onChange={(e) =>
                              updateProductDetail(
                                product.id,
                                "annualTurnover",
                                e.target.value,
                              )
                            }
                            placeholder="Enter amount"
                            className="input-desktop bg-white border-gray-300 flex-1"
                          />
                          <Select
                            value={details.turnoverUnit || "lakh"}
                            onValueChange={(value) =>
                              updateProductDetail(
                                product.id,
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
                        <p className="text-xs text-gray-500 mt-1">
                          Yearly income from this product
                        </p>
                      </div>

                      <div>
                        <Label className="text-gray-700 font-medium">
                          Years of Production
                          <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            required
                            type="number"
                            value={details.yearsOfProduction}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "");
                              updateProductDetail(
                                product.id,
                                "yearsOfProduction",
                                value,
                              );
                            }}
                            placeholder="1"
                            className="w-20 input-desktop bg-white border-gray-300"
                            min="1"
                            max="100"
                          />
                          <span className="text-gray-600 font-medium">
                            years
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Enter the number of years you have been producing this
                          item
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 mb-8">
          <Label className="text-gray-700 font-medium text-lg">
            Select additional products for future (Optional)
          </Label>
          <p className="text-sm text-gray-600 mt-2 mb-4">
            These are products not currently in your selected categories but
            available in the system:
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {remainingProducts
              .filter(
                (product) =>
                  // Show remaining products except those selected in step 4
                  !formData.existingProducts.includes(product.id),
              )
              .map((product) => (
                <div
                  key={product.id}
                  className="border border-gray-300 rounded-lg p-3 hover:border-purple-400 transition-colors"
                >
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id={`product-${product.id}`}
                        checked={formData.selectedProducts.includes(product.id)}
                        onCheckedChange={(checked) =>
                          handleProductToggle(product.id)
                        }
                        className="border-blue-500"
                      />
                      <Label
                        htmlFor={`product-${product.id}`}
                        className="text-gray-700 text-sm"
                      >
                        {product.name}
                      </Label>
                    </div>
                    {product.category_name && (
                      <span className="text-xs text-gray-500 ml-6">
                        Category: {product.category_name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            {remainingProducts.length === 0 && (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-500 text-sm">
                  No additional products available (all products from the system
                  are already in your selected categories)
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 justify-center">
          <Button
            className="btn-accent btn-desktop"
            onClick={handleConfirmSubmit}
            disabled={loading || !validateCurrentStep()}
          >
            {loading ? "Submitting..." : "Submit Registration"}
          </Button>
        </div>
      </div>
    );
  };

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
              <img src={GG} alt="Indian GI Logo" className="w-12 h-12" />
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
                { step: 1, title: "Personal Information" },
                { step: 2, title: "Document Upload" },
                { step: 3, title: "Product Categories" },
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
                    {stepValidation[step] && currentStep !== step
                      ? "���"
                      : step}
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
                  width: `${(Object.values(stepValidation).filter(Boolean).length / 5) * 100}%`,
                }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Step {currentStep} of 5
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="desktop-main">
          {/* Header */}
          <div className="desktop-header">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                {currentStep > 1 ? (
                  <button
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="text-[hsl(var(--geo-secondary))] hover:text-[hsl(var(--geo-secondary))]/80"
                  >
                    <ArrowLeft size={24} />
                  </button>
                ) : (
                  <div className="w-6" />
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    Register New User - Step {currentStep}
                  </h1>
                  <p className="text-gray-600">
                    {currentStep === 1 && "Enter personal information"}
                    {currentStep === 2 && "Upload required documents"}
                    {currentStep === 3 && "Select product categories"}
                    {currentStep === 4 && "Choose existing products"}
                    {currentStep === 5 &&
                      "Production details and additional product selection"}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate("/dashboard")}
                variant="outline"
                className="text-[hsl(var(--geo-secondary))] border-[hsl(var(--geo-secondary))] hover:bg-[hsl(var(--geo-secondary))]/10"
              >
                Dashboard
              </Button>
            </div>
          </div>

          {/* Form Content */}
          <div className="desktop-content">
            <div className="max-w-6xl mx-auto">
              <div className="card-container">
                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700">{error}</p>
                  </div>
                )}

                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
                {currentStep === 4 && renderStep4()}
                {currentStep === 5 && renderStep5()}

                {/* Navigation Buttons */}
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
                  </div>

                  <div className="flex gap-3">
                    {currentStep < 5 && (
                      <Button
                        onClick={handleNext}
                        disabled={
                          !validateCurrentStep() ||
                          (currentStep === 1 &&
                            verificationResult &&
                            verificationResult.isRegistered &&
                            !isAdditionalRegistration)
                        }
                        className={`btn-desktop ${
                          validateCurrentStep() &&
                          !(
                            currentStep === 1 &&
                            verificationResult &&
                            verificationResult.isRegistered &&
                            !isAdditionalRegistration
                          )
                            ? "btn-primary"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300"
                        }`}
                      >
                        Next Step
                      </Button>
                    )}
                  </div>
                </div>
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
                    {formData.aadharNumber && (
                      <div>
                        <span className="font-medium">Aadhar Number:</span>{" "}
                        {formData.aadharNumber}
                      </div>
                    )}
                    {formData.voterId && (
                      <div>
                        <span className="font-medium">Voter ID:</span>{" "}
                        {formData.voterId}
                      </div>
                    )}
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
                    {formData.productCategoryIds.length > 0 && (
                      <div>
                        <span className="font-medium">Categories:</span>{" "}
                        {categories
                          .filter((cat) =>
                            formData.productCategoryIds.includes(cat.id),
                          )
                          .map((cat) => cat.name)
                          .join(", ")}
                      </div>
                    )}
                    {formData.existingProducts.length > 0 && (
                      <div>
                        <span className="font-medium">Existing Products:</span>{" "}
                        {products
                          .filter((p) =>
                            formData.existingProducts.includes(p.id),
                          )
                          .map((p) => p.name)
                          .join(", ")}
                      </div>
                    )}
                    {formData.selectedProducts.length > 0 && (
                      <div>
                        <span className="font-medium">Selected Products:</span>{" "}
                        {products
                          .filter((p) =>
                            formData.selectedProducts.includes(p.id),
                          )
                          .map((p) => p.name)
                          .join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {Object.keys(formData.existingProductDetails).length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-gray-900">
                    Production Details
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(formData.existingProductDetails).map(
                      ([productId, details]) => {
                        const product = products.find(
                          (p) => p.id === parseInt(productId),
                        );
                        return (
                          <div
                            key={productId}
                            className="bg-gray-50 p-3 rounded-lg border"
                          >
                            <h4 className="font-medium text-gray-900 mb-2">
                              {product?.name || `Product ${productId}`}
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {details.annualProduction && (
                                <div>
                                  <span className="font-medium">
                                    Annual Production:
                                  </span>{" "}
                                  {details.annualProduction} {details.unit}
                                </div>
                              )}
                              {details.areaOfProduction && (
                                <div>
                                  <span className="font-medium">Area:</span>{" "}
                                  {details.areaOfProduction}
                                </div>
                              )}
                              {details.yearsOfProduction && (
                                <div>
                                  <span className="font-medium">Years:</span>{" "}
                                  {details.yearsOfProduction}
                                </div>
                              )}
                              {details.annualTurnover && (
                                <div>
                                  <span className="font-medium">Turnover:</span>{" "}
                                  ₹{details.annualTurnover}{" "}
                                  {details.turnoverUnit || "lakh"}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      },
                    )}
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
                    <div className="text-green-600">�� Proof of Production</div>
                  )}
                  {formData.documents.signature && (
                    <div className="text-green-600">✓ Signature</div>
                  )}
                  {formData.documents.photo && (
                    <div className="text-green-600">✓ Profile Photo</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                disabled={loading}
              >
                Edit Details
              </Button>
              <Button
                onClick={() => {
                  setShowConfirmation(false);
                  handleSubmit();
                }}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? "Submitting..." : "Confirm & Submit"}
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
                {/* <li>1. Fill out product information and click 'Done'</li> */}
                <li>
                  1. Click 'Save' if you want to save the application and want
                  to add some more details
                </li>
                <li>
                  2. Click on 'Submit' button if you want to submit the
                  appliation.{" "}
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
