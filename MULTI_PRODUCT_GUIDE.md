# Multi-Product Registration Guide

This guide explains how the system handles data collection when multiple products are selected during registration.

## How Multi-Product Data Collection Works

### 1. Product Selection

- Users can select multiple product categories in Step 3
- They can then choose multiple existing products from those categories in Step 4
- Each selected product automatically gets its own production detail form in Step 5

### 2. Individual Product Data

When multiple products are selected, the system:

- Creates a separate production detail form for each product
- Validates each product's data independently
- Stores data with the product ID for proper organization

### 3. Required Data Per Product

For each selected product, users must provide:

- **Annual Production\*** (with unit selection)
- **Area of Production\***
- **Years of Production\***
- Annual Turnover (optional)
- Additional Notes (optional)

### 4. Bulk Operations (New Feature)

For multiple products, users can:

- Apply common data to all products at once
- Export all production data as JSON
- See completion statistics

## Technical Implementation

### Data Structure

```typescript
interface ProductionDetail {
  productId: number;
  productName: string;
  annualProduction: string;
  unit: string;
  areaOfProduction: string;
  yearsOfProduction: string;
  annualTurnover?: string;
  additionalNotes?: string;
}
```

### Key Components

1. **ProductionDetailsSection** - Main component for production forms
2. **BulkProductActions** - Handles bulk operations for multiple products
3. **Validation System** - Validates each product individually

### Automatic Features

- **Auto-form generation**: Forms are automatically created/removed when products are selected/deselected
- **Individual validation**: Each product's data is validated separately
- **Progress tracking**: Shows completion status for all products
- **Data persistence**: Each product's data is maintained independently

## User Experience

### When Single Product Selected

- Shows simple, focused form for that product
- No bulk operations needed

### When Multiple Products Selected

- Shows separate cards for each product with clear labeling
- Displays product counter badge
- Provides bulk actions for common data
- Shows completion statistics
- Offers data export functionality

### Visual Indicators

- Product numbering (Product 1, Product 2, etc.)
- Completion badges showing X/Y products completed
- Progress percentage
- Color-coded validation errors per product

## Benefits of This Approach

1. **Scalable**: Works for 1 product or 100+ products
2. **User-friendly**: Clear separation and labeling
3. **Efficient**: Bulk operations for common data
4. **Robust**: Individual validation prevents partial data loss
5. **Flexible**: Optional fields allow varying data completeness
6. **Traceable**: Each product maintains its own data integrity

## Example Scenarios

### Scenario 1: Textile Producer with 3 Products

```
Selected Products:
- Bodo Gongar Dunja
- Bodo Keradapini
- Bodo Aronai

Each gets individual forms for:
- Annual production (pieces/meters/etc.)
- Production area (Workshop A, Workshop B, etc.)
- Years of experience (may vary per product)
- Annual turnover (may vary per product)
```

### Scenario 2: Using Bulk Operations

```
Common data for all products:
- Area of Production: "Local Traditional Workshop"
- Unit: "pieces"
- Years of Production: "5"

Individual data per product:
- Annual Production: (varies by product capacity)
- Annual Turnover: (varies by product demand)
```

This system ensures comprehensive data collection while maintaining user experience and data integrity across multiple products.
