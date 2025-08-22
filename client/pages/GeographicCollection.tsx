import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  MapPin,
  Check,
  Globe,
  Mountain,
  Thermometer,
} from "lucide-react";
import { DocumentUpload } from "@/components/DocumentUpload";
import { useNavigate } from "react-router-dom";
import { productsAPI, registrationsAPI, handleAPIError } from "@/lib/api";
import { VerificationRequest, VerificationResponse } from "@shared/api";
import { ProductionDetailsSection } from "@/components/ProductionDetailsSection";

// Unit options for production
const UNIT_OPTIONS = [
  { value: "pieces", label: "Pieces" },
  { value: "dozen", label: "Dozen" },
  { value: "meters", label: "Meters" },
  { value: "kg", label: "Kilograms" },
  { value: "tons", label: "Tons" },
  { value: "liters", label: "Liters" },
  { value: "sets", label: "Sets" },
  { value: "pairs", label: "Pairs" },
  { value: "yards", label: "Yards" },
  { value: "grams", label: "Grams" },
  { value: "units", label: "Units" },
  { value: "other", label: "Other" },
];

interface ProductionDetail {
  productId: number;
  productName: string;
  annualProduction: string;
  unit: string;
  areaOfProduction: string;
  yearsOfProduction: string;
  additionalNotes?: string;
}

interface RegistrationData {
  // Step 1: Personal Information
  name: string;
  address: string;
  age: string;
  gender: string;
  phone: string;
  email: string;
  aadharNumber: string;
  voterId: string;
  panNumber: string;

  // Step 2: Documents
  documents: {
    aadharCard: File | null;
    panCard: File | null;
    proofOfProduction: File | null;
    signature: File | null;
    photo: File | null;
  };

  // Step 3: Product Categories
  productCategories: string[];

  // Step 4: Existing Products
  existingProducts: string[];

  // Step 5: Production Details
  areaOfProduction: string;
  annualProduction: string;
  annualTurnover: string;
  turnoverUnit: string;
  yearsOfProduction: string;
  selectedProducts: string[];
  productionDetails: ProductionDetail[];
}

interface ValidationErrors {
  [key: string]: string;
}

export default function Registration() {
  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [productCategories, setProductCategories] = useState<any[]>([]);
  const [existingProductOptions, setExistingProductOptions] = useState<any[]>(
    [],
  );
  const [productOptions, setProductOptions] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isRegistered: boolean;
    name?: string;
    registrationDate?: string;
    userData?: any;
    existingRegistrations?: Array<{
      id: number;
      categoryIds: number[];
      categoryNames: string[];
      selectedProductIds: number[];
      existingProductIds: number[];
      registrationDate: string;
    }>;
    availableCategories?: any[];
    availableProducts?: any[];
  } | null>(null);
  const [isAdditionalRegistration, setIsAdditionalRegistration] =
    useState(false);
  const [baseRegistrationId, setBaseRegistrationId] = useState<number | null>(
    null,
  );
  const [filteredAvailableProducts, setFilteredAvailableProducts] = useState<
    any[]
  >([]);
  const [isLoadingStep4Products, setIsLoadingStep4Products] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState<RegistrationData>({
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
      panCard: null,
      proofOfProduction: null,
      signature: null,
      photo: null,
    },
    productCategories: [],
    existingProducts: [],
    areaOfProduction: "",
    annualProduction: "",
    annualTurnover: "",
    turnoverUnit: "lakh",
    yearsOfProduction: "",
    selectedProducts: [],
    productionDetails: [],
  });

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
      fetchInitialData();
    } else {
      navigate("/");
    }
  }, [navigate]);

  // Fetch all products (regardless of category) to show except existing ones
  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        if (isAdditionalRegistration && verificationResult?.availableProducts) {
          // For additional registration, use all available products
          setFilteredProducts(filteredAvailableProducts);
        } else {
          // Regular registration flow - fetch ALL products regardless of category
          const result = await productsAPI.getProducts(); // No categoryId = all products
          setFilteredProducts(result.products);
        }
      } catch (error) {
        console.error("Failed to fetch all products:", error);
        setFilteredProducts([]);
      }
    };

    fetchAllProducts();
  }, [isAdditionalRegistration, verificationResult, filteredAvailableProducts]);

  // Fetch products by selected categories for step 4 (existing products)
  useEffect(() => {
    const fetchProductsByCategories = async () => {
      try {
        if (
          formData.productCategories.length > 0 &&
          currentStep >= 4 &&
          productCategories.length > 0
        ) {
          setIsLoadingStep4Products(true);

          // Get category IDs from selected category names
          const selectedCategoryIds = productCategories
            .filter((cat) => formData.productCategories.includes(cat.name))
            .map((cat) => cat.id);

          if (selectedCategoryIds.length > 0) {
            if (isAdditionalRegistration) {
              // For additional registration, filter from available products
              const filteredByCategory = filteredAvailableProducts.filter(
                (product) => selectedCategoryIds.includes(product.category_id),
              );
              setExistingProductOptions(filteredByCategory);
            } else {
              // For regular registration, fetch products by categories
              const result =
                await productsAPI.getProductsByCategories(selectedCategoryIds);
              setExistingProductOptions(result.products);
            }
          } else {
            setExistingProductOptions([]);
          }

          setIsLoadingStep4Products(false);
        } else {
          setExistingProductOptions([]);
        }
      } catch (error) {
        console.error("Failed to fetch products by categories:", error);
        setExistingProductOptions([]);
        setIsLoadingStep4Products(false);
      }
    };

    fetchProductsByCategories();
  }, [
    formData.productCategories,
    currentStep,
    productCategories,
    isAdditionalRegistration,
    filteredAvailableProducts,
  ]);

  // Update production details when selected products change
  useEffect(() => {
    const updateProductionDetails = () => {
      const currentProductIds = formData.productionDetails.map(
        (pd) => pd.productId,
      );
      const selectedProductData = filteredProducts.filter((product) =>
        formData.selectedProducts.includes(product.name),
      );

      // Remove production details for unselected products
      const filteredDetails = formData.productionDetails.filter((pd) =>
        selectedProductData.some((product) => product.id === pd.productId),
      );

      // Add production details for newly selected products
      const newDetails = selectedProductData
        .filter((product) => !currentProductIds.includes(product.id))
        .map((product) => ({
          productId: product.id,
          productName: product.name,
          annualProduction: "",
          unit: "pieces",
          areaOfProduction: "",
          yearsOfProduction: "",
          annualTurnover: "",
          additionalNotes: "",
        }));

      const updatedDetails = [...filteredDetails, ...newDetails];

      if (
        updatedDetails.length !== formData.productionDetails.length ||
        updatedDetails.some(
          (detail, index) =>
            detail.productId !== formData.productionDetails[index]?.productId,
        )
      ) {
        setFormData((prev) => ({
          ...prev,
          productionDetails: updatedDetails,
        }));
      }
    };

    updateProductionDetails();
  }, [formData.selectedProducts, filteredProducts]);

  // Group products by category for better display
  // Show ALL products from ALL categories
  const groupedProducts = useMemo(() => {
    // Show all products without filtering
    const availableProducts = filteredProducts;

    return availableProducts.reduce(
      (acc, product) => {
        const categoryName = product.category_name || "Uncategorized";
        if (!acc[categoryName]) {
          acc[categoryName] = [];
        }
        acc[categoryName].push(product);
        return acc;
      },
      {} as Record<string, Array<(typeof filteredProducts)[0]>>,
    );
  }, [filteredProducts]);

  // Get selected products grouped by category
  const selectedProductsByCategory = useMemo(() => {
    const selectedProducts = filteredProducts.filter((product) =>
      formData.selectedProducts.includes(product.name),
    );

    return selectedProducts.reduce(
      (acc, product) => {
        const categoryName = product.category_name || "Uncategorized";
        if (!acc[categoryName]) {
          acc[categoryName] = [];
        }
        acc[categoryName].push(product);
        return acc;
      },
      {} as Record<string, any[]>,
    );
  }, [filteredProducts, formData.selectedProducts]);

  const fetchInitialData = async () => {
    try {
      const [categoriesRes, productsRes] = await Promise.all([
        productsAPI.getCategories(),
        productsAPI.getProducts(),
      ]);

      setProductCategories(categoriesRes.categories);
      setProductOptions(productsRes.products);
      // Don't load existing products initially - they'll be loaded based on selected categories
    } catch (error) {
      console.error("Failed to fetch initial data:", handleAPIError(error));
    }
  };

  const validateStep1 = (updateErrors: boolean = false): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.address) newErrors.address = "Address is required";
    if (!formData.age) newErrors.age = "Age is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.phone) newErrors.phone = "Mobile Number is required";

    // Require either Aadhar or Voter ID
    if (!formData.aadharNumber && !formData.voterId) {
      newErrors.identification = "Either Aadhar Number or Voter ID is required";
    } else {
      // Validate Aadhar number format if provided
      if (
        formData.aadharNumber &&
        (formData.aadharNumber.length !== 12 ||
          !/^\d{12}$/.test(formData.aadharNumber))
      ) {
        newErrors.aadharNumber = "Aadhar Number must be exactly 12 digits";
      }

      // Validate Voter ID format if provided
      if (formData.voterId && !/^[A-Z]{3}[0-9]{7}$/i.test(formData.voterId)) {
        newErrors.voterId =
          "Voter ID must be in format ABC1234567 (3 letters + 7 digits)";
      }
    }

    // Check verification results - prevent proceeding if already registered and not additional registration
    if (
      verificationResult &&
      verificationResult.isRegistered &&
      !isAdditionalRegistration
    ) {
      newErrors.verification =
        "Cannot proceed: This ID is already registered. Please create an additional registration or use a different ID.";
    }

    if (updateErrors) {
      setErrors(newErrors);
    }
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (updateErrors: boolean = false): boolean => {
    // Skip document validation for additional registration since files are reused
    if (isAdditionalRegistration) {
      return true;
    }

    const newErrors: ValidationErrors = {};

    if (!formData.documents.aadharCard)
      newErrors.aadharCard = "Aadhar Card is required";
    // PAN Card and Proof of Production are now optional
    if (!formData.documents.signature)
      newErrors.signature = "Signature is required";
    if (!formData.documents.photo) newErrors.photo = "Photo is required";

    if (updateErrors) {
      setErrors(newErrors);
    }
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (updateErrors: boolean = false): boolean => {
    const newErrors: ValidationErrors = {};

    if (formData.productCategories.length === 0)
      newErrors.productCategories = "At least one product category is required";

    if (updateErrors) {
      setErrors(newErrors);
    }
    return Object.keys(newErrors).length === 0;
  };

  const validateStep4 = (updateErrors: boolean = false): boolean => {
    // This step is optional
    return true;
  };

  const validateStep5 = (updateErrors: boolean = false): boolean => {
    const newErrors: ValidationErrors = {};

    if (formData.selectedProducts.length === 0) {
      newErrors.selectedProducts = "At least one product must be selected";
    }

    // Validate each production detail
    formData.productionDetails.forEach((detail, index) => {
      if (!detail.annualProduction) {
        newErrors[`production_${detail.productId}_annual`] =
          `Annual production is required for ${detail.productName}`;
      }
      if (!detail.areaOfProduction) {
        newErrors[`production_${detail.productId}_area`] =
          `Area of production is required for ${detail.productName}`;
      }
      if (!detail.yearsOfProduction) {
        newErrors[`production_${detail.productId}_years`] =
          `Years of production is required for ${detail.productName}`;
      }
      if (!detail.annualTurnover) {
        newErrors[`production_${detail.productId}_turnover`] =
          `Annual turnover is required for ${detail.productName}`;
      }
    });

    if (updateErrors) {
      setErrors(newErrors);
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleVerification = async () => {
    // Clear previous verification result
    setVerificationResult(null);

    if (!formData.aadharNumber && !formData.voterId) {
      setErrors({
        identification:
          "Please enter either Aadhar Number or Voter ID to verify",
      });
      return;
    }

    setIsVerifying(true);

    try {
      const verificationData: VerificationRequest = {
        aadharNumber: formData.aadharNumber || undefined,
        voterId: formData.voterId || undefined,
      };

      const result = await registrationsAPI.verify(verificationData);
      setVerificationResult(result);

      // If user is registered, check for additional registration opportunity
      if (result.isRegistered && result.userData) {
        // Pre-fill form with existing data
        setFormData((prev) => ({
          ...prev,
          name: result.userData!.name,
          address: result.userData!.address,
          age: result.userData!.age.toString(),
          gender: result.userData!.gender,
          phone: result.userData!.phone,
          email: result.userData!.email || "",
          aadharNumber: result.userData!.aadharNumber || "",
          voterId: result.userData!.voterId || "",
          panNumber: result.userData!.panNumber || "",
        }));

        // Check if additional registration is possible
        if (
          result.availableCategories &&
          result.availableCategories.length > 0
        ) {
          setIsAdditionalRegistration(true);
          setBaseRegistrationId(result.registrationId!);

          // Filter products for available categories only
          setFilteredAvailableProducts(result.availableProducts || []);
        }
      }

      // Clear any previous errors
      const newErrors = { ...errors };
      delete newErrors.identification;
      setErrors(newErrors);
    } catch (error) {
      console.error("Verification error:", error);
      setErrors({
        identification:
          error instanceof Error
            ? error.message
            : "Verification failed. Please try again.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const validateCurrentStep = (updateErrors: boolean = false): boolean => {
    switch (currentStep) {
      case 1:
        return validateStep1(updateErrors);
      case 2:
        return validateStep2(updateErrors);
      case 3:
        return validateStep3(updateErrors);
      case 4:
        return validateStep4(updateErrors);
      case 5:
        return validateStep5(updateErrors);
      default:
        return false;
    }
  };

  // Memoize validation result to prevent infinite re-renders
  const isCurrentStepValid = useMemo(() => {
    return validateCurrentStep(false); // Don't update errors during memoization
  }, [currentStep, formData]);

  const handleNext = () => {
    // Validate with error updates for the button click
    const isValid = validateCurrentStep(true);
    if (isValid) {
      if (currentStep < 5) {
        setCurrentStep(currentStep + 1);
        setErrors({});
      } else {
        handleSubmit();
      }
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (isAdditionalRegistration && baseRegistrationId) {
        // Handle additional registration - no file uploads needed
        await handleAdditionalRegistration();
      } else {
        // Handle regular registration
        await handleRegularRegistration();
      }
    } catch (error) {
      setErrors({ submit: handleAPIError(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdditionalRegistration = async () => {
    if (!baseRegistrationId) {
      throw new Error(
        "Base registration ID is required for additional registration",
      );
    }

    // Convert category names to IDs for additional registration
    const selectedCategoryIds = (verificationResult?.availableCategories || [])
      .filter((cat) => formData.productCategories.includes(cat.name))
      .map((cat) => cat.id);

    // Use filtered available products for additional registration
    const existingProductIds = filteredAvailableProducts
      .filter((prod) => formData.existingProducts.includes(prod.name))
      .map((prod) => prod.id);

    const selectedProductIds = filteredAvailableProducts
      .filter((prod) => formData.selectedProducts.includes(prod.name))
      .map((prod) => prod.id);

    const additionalRegistrationData = {
      baseRegistrationId,
      productCategoryIds: selectedCategoryIds,
      existingProducts: existingProductIds,
      selectedProducts: selectedProductIds,
      areaOfProduction: formData.areaOfProduction,
      annualProduction: formData.annualProduction,
      annualTurnover: formData.annualTurnover,
      turnoverUnit: formData.turnoverUnit,
      yearsOfProduction: formData.yearsOfProduction,
      productionDetails: formData.productionDetails,
    };

    const response = await registrationsAPI.createAdditional(
      additionalRegistrationData,
    );

    // Navigate to success page
    navigate("/success", {
      state: {
        submissionData: {
          ...additionalRegistrationData,
          id: response.registrationId,
          submittedAt: new Date().toISOString(),
          submittedBy: user.username,
          isAdditionalRegistration: true,
          reusedFiles: response.reusedFiles,
          baseRegistrationId: response.baseRegistrationId,
        },
      },
    });
  };

  const handleRegularRegistration = async () => {
    // Convert category names to IDs
    const selectedCategoryIds = productCategories
      .filter((cat) => formData.productCategories.includes(cat.name))
      .map((cat) => cat.id);

    // Prepare form data
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
      productCategoryIds: selectedCategoryIds,
      existingProducts: existingProductOptions
        .filter((prod) => formData.existingProducts.includes(prod.name))
        .map((prod) => prod.id),
      selectedProducts: filteredProducts
        .filter((prod) => formData.selectedProducts.includes(prod.name))
        .map((prod) => prod.id),
      areaOfProduction: formData.areaOfProduction,
      annualProduction: formData.annualProduction,
      annualTurnover: parseFloat(formData.annualTurnover) || undefined,
      turnoverUnit: formData.turnoverUnit,
      yearsOfProduction: formData.yearsOfProduction,
      productionDetails: formData.productionDetails,
      isAdditionalRegistration: false,
    };

    // Prepare documents
    const documents = {
      aadharCard: formData.documents.aadharCard,
      panCard: formData.documents.panCard,
      proofOfProduction: formData.documents.proofOfProduction,
      signature: formData.documents.signature,
      photo: formData.documents.photo,
    };

    const response = await registrationsAPI.create(registrationData, documents);

    // Navigate to success page
    navigate("/success", {
      state: {
        submissionData: {
          ...registrationData,
          id: response.registrationId,
          submittedAt: new Date().toISOString(),
          submittedBy: user.username,
          documentPaths: response.documentPaths,
        },
      },
    });
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const updateFormData = (field: keyof RegistrationData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleFileUpload = (
    field: keyof RegistrationData["documents"],
    file: File,
  ) => {
    setFormData((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [field]: file,
      },
    }));
    // Clear error when file is uploaded
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleProductToggle = (product: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedProducts: prev.selectedProducts.includes(product)
        ? prev.selectedProducts.filter((p) => p !== product)
        : [...prev.selectedProducts, product],
    }));
  };

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

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Step {currentStep} of 5
        </h2>
        <span className="text-sm text-gray-600">
          {Math.round((currentStep / 5) * 100)}% Complete
        </span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${(currentStep / 5) * 100}%` }}
        ></div>
      </div>
      <div className="flex justify-between mt-4">
        {[1, 2, 3, 4, 5].map((step) => (
          <div key={step} className="flex flex-col items-center">
            <div
              className={`step-indicator ${
                step === currentStep
                  ? "step-active"
                  : step < currentStep
                    ? "step-completed"
                    : "step-pending"
              }`}
            >
              {step < currentStep ? <Check size={16} /> : step}
            </div>
            <span className="text-xs mt-2 text-gray-600">
              {step === 1 && "Personal"}
              {step === 2 && "Documents"}
              {step === 3 && "Categories"}
              {step === 4 && "Existing"}
              {step === 5 && "Production"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Personal Information
        {isAdditionalRegistration && (
          <span className="text-blue-600"> (Additional Registration)</span>
        )}
      </h2>
      <div className="form-grid">
        <div className="form-section">
          <div>
            <Label htmlFor="name" className="text-gray-700 font-medium">
              Name*
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateFormData("name", e.target.value)}
              placeholder="Full Name*"
              className="mt-2 input-desktop bg-gray-50 border-gray-300"
            />
            {errors.name && <p className="error-message">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="address" className="text-gray-700 font-medium">
              Address*
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => updateFormData("address", e.target.value)}
              placeholder="Address*"
              className="mt-2 input-desktop bg-gray-50 border-gray-300"
            />
            {errors.address && (
              <p className="error-message">{errors.address}</p>
            )}
          </div>

          <div>
            <Label htmlFor="age" className="text-gray-700 font-medium">
              Age*
            </Label>
            <Input
              id="age"
              value={formData.age}
              onChange={(e) => updateFormData("age", e.target.value)}
              placeholder="Age*"
              className="mt-2 input-desktop bg-gray-50 border-gray-300"
            />
            {errors.age && <p className="error-message">{errors.age}</p>}
          </div>

          <div>
            <Label className="text-gray-700 font-medium">Gender*</Label>
            <div className="mt-2 flex items-center justify-around border border-gray-300 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="male"
                  name="gender"
                  value="male"
                  checked={formData.gender === "male"}
                  onChange={(e) => updateFormData("gender", e.target.value)}
                  className="border-green-500"
                />
                <Label htmlFor="male" className="text-gray-700">
                  Male
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="female"
                  name="gender"
                  value="female"
                  checked={formData.gender === "female"}
                  onChange={(e) => updateFormData("gender", e.target.value)}
                  className="border-green-500"
                />
                <Label htmlFor="female" className="text-gray-700">
                  Female
                </Label>
              </div>
            </div>
            {errors.gender && <p className="error-message">{errors.gender}</p>}
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
                  updateFormData("phone", value);
                }
              }}
              placeholder="Mobile Number*"
              className="mt-2 input-desktop bg-gray-50 border-gray-300"
              maxLength={15}
              pattern="[0-9]*"
            />
            {errors.phone && <p className="error-message">{errors.phone}</p>}
          </div>

          <div>
            <Label htmlFor="email" className="text-gray-700 font-medium">
              Email
            </Label>
            <Input
              id="email"
              value={formData.email}
              onChange={(e) => updateFormData("email", e.target.value)}
              placeholder="Email"
              className="mt-2 input-desktop bg-gray-50 border-gray-300"
            />
            {errors.email && <p className="error-message">{errors.email}</p>}
          </div>

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
                        updateFormData("aadharNumber", value);
                        // Clear verification result when input changes
                        setVerificationResult(null);
                      }
                    }}
                    placeholder="12-digit Aadhar Number"
                    className="mt-2 input-desktop bg-gray-50 border-gray-300"
                    maxLength={12}
                  />
                  {errors.aadharNumber && (
                    <p className="error-message">{errors.aadharNumber}</p>
                  )}
                </div>

                <div className="text-center text-gray-500 font-medium">OR</div>

                <div>
                  <Label
                    htmlFor="voterId"
                    className="text-gray-700 font-medium"
                  >
                    Voter ID
                  </Label>
                  <Input
                    id="voterId"
                    value={formData.voterId}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      if (value.length <= 10) {
                        updateFormData("voterId", value);
                        // Clear verification result when input changes
                        setVerificationResult(null);
                      }
                    }}
                    placeholder="Voter ID (e.g., ABC1234567)"
                    className="mt-2 input-desktop bg-gray-50 border-gray-300"
                    maxLength={10}
                  />
                  {errors.voterId && (
                    <p className="error-message">{errors.voterId}</p>
                  )}
                </div>

                {errors.identification && (
                  <p className="error-message">{errors.identification}</p>
                )}

                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleVerification}
                    disabled={
                      isVerifying ||
                      (!formData.aadharNumber && !formData.voterId)
                    }
                    className="w-full btn-secondary"
                  >
                    {isVerifying ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Check Registration Status
                      </>
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
                                // Load existing user data if available
                                if (verificationResult.userData) {
                                  updateFormData(
                                    "name",
                                    verificationResult.userData.name ||
                                      formData.name,
                                  );
                                  updateFormData(
                                    "address",
                                    verificationResult.userData.address ||
                                      formData.address,
                                  );
                                  updateFormData(
                                    "age",
                                    verificationResult.userData.age?.toString() ||
                                      formData.age,
                                  );
                                  updateFormData(
                                    "gender",
                                    verificationResult.userData.gender ||
                                      formData.gender,
                                  );
                                  updateFormData(
                                    "phone",
                                    verificationResult.userData.phone ||
                                      formData.phone,
                                  );
                                  updateFormData(
                                    "email",
                                    verificationResult.userData.email ||
                                      formData.email,
                                  );
                                  updateFormData(
                                    "panNumber",
                                    verificationResult.userData.panNumber ||
                                      formData.panNumber,
                                  );
                                }
                                setErrors((prev) => ({
                                  ...prev,
                                  verification: "",
                                }));
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
                          <div className="mt-4 space-y-3">
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-blue-700 text-sm">
                                ℹ️{" "}
                                <strong>Additional Registration Mode:</strong>{" "}
                                Creating additional registration for{" "}
                                {verificationResult.name}. Your existing
                                documents will be reused automatically.
                              </p>
                            </div>

                            {verificationResult.existingRegistrations &&
                              verificationResult.existingRegistrations.length >
                                0 && (
                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                  <p className="text-gray-700 text-sm font-medium mb-2">
                                    📋 Previous Registrations:
                                  </p>
                                  {verificationResult.existingRegistrations.map(
                                    (reg, index) => (
                                      <div
                                        key={reg.id}
                                        className="text-xs text-gray-600 mb-1"
                                      >
                                        • {reg.categoryNames.join(", ")} -{" "}
                                        {new Date(
                                          reg.registrationDate,
                                        ).toLocaleDateString()}
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}

                            {verificationResult.availableCategories &&
                              verificationResult.availableCategories.length >
                                0 && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                  <p className="text-green-700 text-sm font-medium mb-2">
                                    ✨ Available Categories:
                                  </p>
                                  <p className="text-xs text-green-600">
                                    {verificationResult.availableCategories
                                      .map((cat) => cat.name)
                                      .join(", ")}
                                  </p>
                                </div>
                              )}
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

          <div>
            <Label htmlFor="pan" className="text-gray-700 font-medium">
              PAN Number
            </Label>
            <Input
              id="pan"
              value={formData.panNumber}
              onChange={(e) => updateFormData("panNumber", e.target.value)}
              placeholder="PAN Number (e.g., ABCDE1234F)"
              className="mt-2 input-desktop bg-gray-50 border-gray-300"
              maxLength={10}
            />
            {errors.panNumber && (
              <p className="error-message">{errors.panNumber}</p>
            )}
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

      {isAdditionalRegistration && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <Check className="w-5 h-5 text-blue-600 mr-2" />
            <div>
              <p className="text-blue-800 font-medium">
                Documents Already Available
              </p>
              <p className="text-blue-600 text-sm mt-1">
                Your existing documents from registration #{baseRegistrationId}{" "}
                will be automatically reused. No need to upload again!
              </p>
            </div>
          </div>
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
              file={
                formData.documents[key as keyof RegistrationData["documents"]]
              }
              onFileChange={(file) =>
                handleFileUpload(
                  key as keyof RegistrationData["documents"],
                  file,
                )
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
              disabled={isAdditionalRegistration}
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
              disabled={isAdditionalRegistration}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => {
    const categoriesToShow = isAdditionalRegistration
      ? verificationResult?.availableCategories || []
      : productCategories;

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Product Categories
        </h2>

        {isAdditionalRegistration && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>Additional Registration:</strong> Only categories you
              haven't registered for are shown below.
            </p>
          </div>
        )}

        <div>
          <Label className="text-gray-700 font-medium">
            Select Product Categories* (You can select multiple)
          </Label>
          <div className="mt-4 border border-gray-200 rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
            {categoriesToShow.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {isAdditionalRegistration
                  ? "No additional categories available. You have already registered for all product categories."
                  : "No categories available."}
              </div>
            ) : (
              categoriesToShow.map((category) => (
                <div key={category.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={`category-${category.id}`}
                    checked={formData.productCategories.includes(category.name)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData((prev) => ({
                          ...prev,
                          productCategories: [
                            ...prev.productCategories,
                            category.name,
                          ],
                        }));
                      } else {
                        setFormData((prev) => ({
                          ...prev,
                          productCategories: prev.productCategories.filter(
                            (cat) => cat !== category.name,
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
              ))
            )}
          </div>
          {formData.productCategories.length > 0 && (
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm">
                Selected: {formData.productCategories.join(", ")}
              </p>
            </div>
          )}
          {errors.productCategories && (
            <p className="error-message">{errors.productCategories}</p>
          )}
        </div>
      </div>
    );
  };

  const renderStep4 = () => {
    // For additional registration, show only existing products that are available
    // (haven't been selected in previous registrations)
    const productsToShow = isAdditionalRegistration
      ? filteredAvailableProducts.filter((product) =>
          existingProductOptions.some((existing) => existing.id === product.id),
        )
      : existingProductOptions;

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Existing Products
        </h2>

        {formData.productCategories.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>Selected Categories:</strong>{" "}
              {formData.productCategories.join(", ")}
            </p>
            <p className="text-blue-600 text-xs mt-1">
              Only products from the selected categories are shown below.
            </p>
          </div>
        )}

        {isAdditionalRegistration && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>Additional Registration:</strong> Only products you
              haven't selected before are shown below.
            </p>
          </div>
        )}

        <div>
          <Label className="text-gray-700 font-medium">
            Select Products already produced*
          </Label>
          <div className="mt-4 border border-gray-200 rounded-lg p-4 space-y-3">
            {isLoadingStep4Products ? (
              <div className="text-center py-4 text-gray-500">
                Loading products from selected categories...
              </div>
            ) : productsToShow.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {isAdditionalRegistration
                  ? "No additional products available. You have already selected all available products."
                  : "No products available for the selected categories."}
              </div>
            ) : (
              productsToShow.map((product) => (
                <div key={product.id} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id={`existing-${product.id}`}
                    checked={formData.existingProducts.includes(product.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
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
                      htmlFor={`existing-${product.id}`}
                      className="text-gray-700 font-medium"
                    >
                      {product.name}
                    </Label>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      {product.category_name && (
                        <span>Category: {product.category_name}</span>
                      )}
                      <span>
                        ({product.registration_count || 0} registrations)
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderStep5 = () => (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Production Details
      </h2>

      {/* General Information */}
      <div className="form-grid mb-8">
        <div className="form-section">
          <div>
            <Label htmlFor="turnover" className="text-gray-700 font-medium">
              Annual Turnover
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="turnover"
                type="number"
                value={formData.annualTurnover}
                onChange={(e) =>
                  updateFormData("annualTurnover", e.target.value)
                }
                placeholder="Enter amount"
                className="input-desktop bg-gray-50 border-gray-300 flex-1"
              />
              <Select
                value={formData.turnoverUnit || "lakh"}
                onValueChange={(value) => updateFormData("turnoverUnit", value)}
              >
                <SelectTrigger className="input-desktop bg-gray-50 border-gray-300 w-40">
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
          </div>
        </div>
      </div>

      <div className="mb-8">
        <Label className="text-gray-700 font-medium text-lg">
          Select additional products from all categories*
        </Label>

        <div className="mt-2 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">
            <strong>Note:</strong> All products from all categories are shown
            below. You can select any additional products for future
            registration.
          </p>
        </div>

        {/* All products in flat list */}
        <div className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className={`border-2 rounded-lg p-3 transition-all cursor-pointer ${
                  formData.selectedProducts.includes(product.name)
                    ? "border-[hsl(var(--geo-primary))] bg-green-50"
                    : "border-gray-300 hover:border-green-400"
                }`}
                onClick={() => handleProductToggle(product.name)}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id={`product-${product.id}`}
                    checked={formData.selectedProducts.includes(product.name)}
                    onChange={() => handleProductToggle(product.name)}
                    className="border-green-500 text-[hsl(var(--geo-primary))]"
                  />
                  <Label
                    htmlFor={`product-${product.id}`}
                    className="text-gray-700 text-sm cursor-pointer flex-1"
                  >
                    {product.name}
                  </Label>
                </div>
                {product.description && (
                  <p className="text-xs text-gray-500 mt-2 ml-6">
                    {product.description}
                  </p>
                )}
                {product.category_name && (
                  <p className="text-xs text-blue-600 mt-1 ml-6 font-medium">
                    {product.category_name}
                  </p>
                )}
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
              <p className="text-gray-500">No products available</p>
            </div>
          )}
        </div>

        {errors.selectedProducts && (
          <p className="error-message mt-2">{errors.selectedProducts}</p>
        )}
      </div>

      {/* Production Details Section */}
      <ProductionDetailsSection
        productionDetails={formData.productionDetails}
        updateProductionDetail={updateProductionDetail}
        errors={errors}
      />
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-white">
      <div className="desktop-content max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 pt-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-[hsl(var(--geo-secondary))] hover:text-[hsl(var(--geo-secondary))]/80"
          >
            <ArrowLeft size={24} />
          </button>
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
                "Production details and select from all products (all categories)"}
            </p>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="card-container">
          {renderProgressBar()}

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <div>
              {currentStep > 1 && (
                <Button onClick={handleBack} className="btn-outline">
                  Previous
                </Button>
              )}
            </div>

            <Button
              onClick={handleNext}
              className={`btn-desktop ${
                isCurrentStepValid
                  ? "btn-primary"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
              disabled={!isCurrentStepValid || isSubmitting}
            >
              {currentStep === 5
                ? isSubmitting
                  ? "Submitting..."
                  : "Submit Registration"
                : "Next Step"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
