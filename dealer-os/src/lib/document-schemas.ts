// Schema descriptors for the 10 Malaysian second-hand dealership document types.
// Consumed by the dynamic Documents form/list UI.

export type FieldType = "text" | "number" | "date" | "textarea" | "select" | "boolean";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  required?: boolean;
  cols?: 1 | 2; // grid span
}

export interface DocSchema {
  key: string; // matches document_type enum
  label: string;
  labelZh: string;
  short: string; // 3-letter tag e.g. SPA
  accent: string; // hex tint used for the card/chip
  numberField?: string; // which field maps to documents.doc_number
  dateField?: string; // which field maps to documents.doc_date
  customerField?: string; // maps to documents.customer_name
  vehicleField?: string; // maps to documents.vehicle_ref
  fields: FieldDef[];
}

export const DOC_SCHEMAS: DocSchema[] = [
  {
    key: "spa",
    label: "Sales & Purchase Agreement",
    labelZh: "买卖合同 (SPA)",
    short: "SPA",
    accent: "#f5732a",
    numberField: "spa_no",
    dateField: "date",
    customerField: "buyer_name",
    vehicleField: "vehicle",
    fields: [
      { key: "spa_no", label: "SPA No.", type: "text", required: true },
      { key: "date", label: "Date", type: "date", required: true },
      { key: "buyer_name", label: "Buyer Name", type: "text", required: true },
      { key: "buyer_ic", label: "Buyer IC / Passport", type: "text" },
      { key: "dealer_name", label: "Dealer Name", type: "text" },
      { key: "vehicle", label: "Vehicle (Make Model Year)", type: "text", cols: 2 },
      { key: "vin", label: "VIN / Chassis No.", type: "text" },
      { key: "engine_no", label: "Engine No.", type: "text" },
      { key: "selling_price", label: "Selling Price (RM)", type: "number" },
      { key: "deposit", label: "Deposit (RM)", type: "number" },
      { key: "balance", label: "Balance (RM)", type: "number" },
      { key: "signatures", label: "Signatures / Witnesses", type: "textarea", cols: 2 },
    ],
  },
  {
    key: "invoice",
    label: "Invoice",
    labelZh: "发票",
    short: "INV",
    accent: "#1e88e5",
    numberField: "invoice_no",
    dateField: "invoice_date",
    customerField: "customer",
    vehicleField: "vehicle",
    fields: [
      { key: "invoice_no", label: "Invoice No.", type: "text", required: true },
      { key: "invoice_date", label: "Invoice Date", type: "date", required: true },
      { key: "customer", label: "Customer", type: "text", required: true },
      { key: "vehicle", label: "Vehicle", type: "text" },
      { key: "vehicle_price", label: "Vehicle Price (RM)", type: "number" },
      { key: "discount", label: "Discount (RM)", type: "number" },
      { key: "insurance", label: "Insurance (RM)", type: "number" },
      { key: "road_tax", label: "Road Tax (RM)", type: "number" },
      { key: "registration_fees", label: "Registration Fees (RM)", type: "number" },
      { key: "total_amount", label: "Total Amount (RM)", type: "number" },
      { key: "outstanding_balance", label: "Outstanding Balance (RM)", type: "number" },
    ],
  },
  {
    key: "receipt",
    label: "Receipt",
    labelZh: "收据",
    short: "RCP",
    accent: "#43a047",
    numberField: "receipt_no",
    dateField: "receipt_date",
    customerField: "customer",
    fields: [
      { key: "receipt_no", label: "Receipt No.", type: "text", required: true },
      { key: "receipt_date", label: "Receipt Date", type: "date", required: true },
      { key: "invoice_no", label: "Related Invoice No.", type: "text" },
      { key: "customer", label: "Customer", type: "text", required: true },
      { key: "amount_paid", label: "Amount Paid (RM)", type: "number", required: true },
      {
        key: "payment_method",
        label: "Payment Method",
        type: "select",
        options: ["Cash", "Bank Transfer", "Cheque", "Card", "E-Wallet", "Other"],
      },
      { key: "bank_ref", label: "Bank Transaction Reference", type: "text" },
      { key: "received_by", label: "Received By", type: "text" },
    ],
  },
  {
    key: "booking_receipt",
    label: "Booking Receipt",
    labelZh: "订金收据",
    short: "BOK",
    accent: "#fb8c00",
    numberField: "booking_no",
    dateField: "date",
    customerField: "customer",
    vehicleField: "vehicle",
    fields: [
      { key: "booking_no", label: "Booking No.", type: "text", required: true },
      { key: "date", label: "Date", type: "date", required: true },
      { key: "customer", label: "Customer", type: "text", required: true },
      { key: "vehicle", label: "Vehicle", type: "text" },
      { key: "booking_amount", label: "Booking Amount (RM)", type: "number", required: true },
      {
        key: "payment_method",
        label: "Payment Method",
        type: "select",
        options: ["Cash", "Bank Transfer", "Cheque", "Card", "E-Wallet", "Other"],
      },
      { key: "refundable", label: "Refundable?", type: "boolean" },
    ],
  },
  {
    key: "loan",
    label: "Loan / Hire Purchase",
    labelZh: "贷款 / 分期付款",
    short: "HP",
    accent: "#8e24aa",
    numberField: "loan_ref",
    dateField: "approval_date",
    customerField: "customer",
    fields: [
      { key: "loan_ref", label: "Loan Reference No.", type: "text", required: true },
      { key: "customer", label: "Customer", type: "text" },
      { key: "financing_bank", label: "Financing Bank", type: "text" },
      { key: "loan_amount", label: "Loan Amount (RM)", type: "number" },
      { key: "down_payment", label: "Down Payment (RM)", type: "number" },
      { key: "interest_rate", label: "Interest / Profit Rate (%)", type: "number" },
      { key: "tenure_months", label: "Tenure (months)", type: "number" },
      { key: "monthly_installment", label: "Monthly Installment (RM)", type: "number" },
      { key: "approval_date", label: "Approval Date", type: "date" },
      { key: "disbursement_date", label: "Disbursement Date", type: "date" },
      {
        key: "loan_status",
        label: "Loan Status",
        type: "select",
        options: ["Applied", "Approved", "Disbursed", "Rejected", "Cancelled", "Settled"],
      },
    ],
  },
  {
    key: "customer",
    label: "Customer Record",
    labelZh: "客户档案",
    short: "CUS",
    accent: "#00acc1",
    numberField: "customer_id",
    customerField: "name",
    fields: [
      { key: "customer_id", label: "Customer ID", type: "text" },
      { key: "name", label: "Name", type: "text", required: true },
      { key: "ic_passport", label: "IC / Passport", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "address", label: "Address", type: "textarea", cols: 2 },
    ],
  },
  {
    key: "vehicle",
    label: "Vehicle Record",
    labelZh: "车辆档案",
    short: "VEH",
    accent: "#3949ab",
    numberField: "vehicle_id",
    vehicleField: "display",
    fields: [
      { key: "vehicle_id", label: "Vehicle ID", type: "text" },
      { key: "make", label: "Make", type: "text" },
      { key: "model", label: "Model", type: "text" },
      { key: "year", label: "Year", type: "number" },
      { key: "vin", label: "VIN / Chassis No.", type: "text" },
      { key: "engine_no", label: "Engine No.", type: "text" },
      { key: "registration_no", label: "Registration No.", type: "text" },
      { key: "mileage", label: "Mileage (km)", type: "number" },
      { key: "purchase_cost", label: "Purchase Cost (RM)", type: "number" },
      { key: "selling_price", label: "Selling Price (RM)", type: "number" },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["In stock", "Reserved", "Sold"],
      },
      { key: "display", label: "Display Label (auto)", type: "text", cols: 2 },
    ],
  },
  {
    key: "jpj_transfer",
    label: "Ownership Transfer (JPJ)",
    labelZh: "JPJ 过户",
    short: "JPJ",
    accent: "#d81b60",
    numberField: "jpj_reference",
    dateField: "transfer_date",
    vehicleField: "registration_no",
    fields: [
      { key: "transfer_date", label: "Transfer Date", type: "date", required: true },
      { key: "previous_owner", label: "Previous Owner", type: "text" },
      { key: "new_owner", label: "New Owner", type: "text" },
      { key: "jpj_reference", label: "JPJ Reference", type: "text", required: true },
      { key: "registration_no", label: "Registration Number", type: "text" },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["Pending", "Submitted", "Completed", "Rejected"],
      },
    ],
  },
  {
    key: "insurance_road_tax",
    label: "Insurance & Road Tax",
    labelZh: "保险与路税",
    short: "INS",
    accent: "#00897b",
    numberField: "policy_number",
    dateField: "receipt_date",
    fields: [
      { key: "policy_number", label: "Policy Number", type: "text", required: true },
      { key: "insurance_company", label: "Insurance Company", type: "text" },
      { key: "coverage_start", label: "Coverage Start", type: "date" },
      { key: "coverage_end", label: "Coverage End", type: "date" },
      { key: "premium", label: "Premium (RM)", type: "number" },
      { key: "road_tax_expiry", label: "Road Tax Expiry", type: "date" },
      { key: "receipt_number", label: "Receipt Number", type: "text" },
      { key: "receipt_date", label: "Receipt Date", type: "date" },
    ],
  },
  {
    key: "payment_log",
    label: "Payment Transaction Log",
    labelZh: "付款流水",
    short: "PAY",
    accent: "#6d4c41",
    numberField: "transaction_id",
    dateField: "datetime",
    customerField: "customer",
    fields: [
      { key: "transaction_id", label: "Transaction ID", type: "text", required: true },
      { key: "datetime", label: "Date & Time", type: "date", required: true },
      { key: "customer", label: "Customer", type: "text" },
      { key: "invoice_no", label: "Invoice No.", type: "text" },
      { key: "amount", label: "Amount (RM)", type: "number" },
      {
        key: "payment_method",
        label: "Payment Method",
        type: "select",
        options: ["Cash", "Bank Transfer", "Cheque", "Card", "E-Wallet", "Other"],
      },
      { key: "bank_reference", label: "Bank Reference", type: "text" },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["Pending", "Cleared", "Failed", "Refunded"],
      },
    ],
  },
];

export const DOC_SCHEMA_BY_KEY: Record<string, DocSchema> = Object.fromEntries(
  DOC_SCHEMAS.map((s) => [s.key, s]),
);

export const DOC_ROLE_OPTIONS = [
  "SPA",
  "Invoice",
  "Receipt",
  "Booking",
  "Loan / HP",
  "JPJ Transfer",
  "Insurance",
  "Road Tax",
  "Payment Log",
  "Other",
];
