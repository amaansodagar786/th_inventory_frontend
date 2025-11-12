import React, { useState, useEffect, useRef, useMemo } from "react";
import { Formik, Form, Field, FieldArray, ErrorMessage } from "formik";
import * as Yup from "yup";
import html2pdf from "html2pdf.js";
import { toast, ToastContainer } from "react-toastify";
import { FaPlus, FaFileExport, FaFileExcel, FaSearch, FaFileCode, FaUpload, FaSpinner, FaTrash, FaSave, FaEdit } from "react-icons/fa";
import Navbar from "../../Components/Sidebar/Navbar";
import SalesPrint from "./SalesPrint";
import "react-toastify/dist/ReactToastify.css";
import "./Sales.scss";
import axios from "axios";
import * as XLSX from 'xlsx';
import Select from 'react-select';

const TAX_SLABS = [
  { label: '0.1%', value: 0.1 },
  { label: '5%', value: 5 },
  { label: '12%', value: 12 },
  { label: '18%', value: 18 },
  { label: '28%', value: 28 },
];

const TERMS_CONDITIONS = `
All orders are subject to acceptance by the seller.
Prices are subject to change without notice.
`;

const SUPPLY_TYPES = [
  { label: "Outward", value: "O" },
  { label: "Inward", value: "I" }
];

const SUB_SUPPLY_TYPES = [
  { label: "Supply", value: 1 },
  { label: "Export", value: 3 },
  { label: "Job Work", value: 4 }
];

const TRANS_TYPES = [
  { label: "Regular", value: 1 },
  { label: "Bill To - Ship To", value: 2 },
  { label: "Bill From - Dispatch From", value: 3 },
  { label: "Combination of 2 & 3", value: 4 }
];

const Sales = () => {
  const [invoices, setInvoices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [gstType, setGstType] = useState("intra");
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeUrl, setQRCodeUrl] = useState("");
  const [workOrders, setWorkOrders] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showLoader, setShowLoader] = useState(false);
  const loaderTimeoutRef = useRef(null);

  const [uploadingFiles, setUploadingFiles] = useState({});

  const fileInputRefs = useRef({});


  // Add these near your other state declarations
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Add debounce effect
  useEffect(() => {
    if (loaderTimeoutRef.current) {
      clearTimeout(loaderTimeoutRef.current);
    }

    if (searchTerm.trim()) {
      loaderTimeoutRef.current = setTimeout(() => {
        setShowLoader(true);
      }, 300);

      const searchTimeout = setTimeout(() => {
        if (loaderTimeoutRef.current) {
          clearTimeout(loaderTimeoutRef.current);
        }
        setDebouncedSearch(searchTerm.trim().toLowerCase());
        setCurrentPage(1); // Reset to first page when search changes
        setShowLoader(false);
      }, 300);

      return () => {
        clearTimeout(searchTimeout);
        if (loaderTimeoutRef.current) {
          clearTimeout(loaderTimeoutRef.current);
        }
        setShowLoader(false);
      };
    } else {
      setDebouncedSearch("");
      setCurrentPage(1); // Reset to first page when search is cleared
      setShowLoader(false);
    }
  }, [searchTerm]);

  const filteredInvoices = useMemo(() => {
    if (!debouncedSearch) return invoices;

    return invoices.filter(invoice => {
      // Check invoice fields
      if (invoice.invoiceNumber?.toLowerCase().includes(debouncedSearch)) return true;
      if (invoice.invoiceDate?.toLowerCase().includes(debouncedSearch)) return true;
      if (invoice.workOrderNumber?.toLowerCase().includes(debouncedSearch)) return true;

      // Check receiver fields
      if (invoice.receiver?.name?.toLowerCase().includes(debouncedSearch)) return true;
      if (invoice.receiver?.gstin?.toLowerCase().includes(debouncedSearch)) return true;
      if (invoice.receiver?.address?.toLowerCase().includes(debouncedSearch)) return true;
      if (invoice.receiver?.contact?.toLowerCase().includes(debouncedSearch)) return true;
      if (invoice.receiver?.email?.toLowerCase().includes(debouncedSearch)) return true;

      // Check items
      if (invoice.items?.some(item =>
        item.name?.toLowerCase().includes(debouncedSearch) ||
        item.description?.toLowerCase().includes(debouncedSearch) ||
        item.hsn?.toLowerCase().includes(debouncedSearch)
      )) return true;

      // Check transport details
      if (invoice.lrNumber?.toLowerCase().includes(debouncedSearch)) return true;

      // Check bank details
      if (invoice.bank?.name?.toLowerCase().includes(debouncedSearch)) return true;
      if (invoice.bank?.account?.toLowerCase().includes(debouncedSearch)) return true;
      if (invoice.bank?.branch?.toLowerCase().includes(debouncedSearch)) return true;
      if (invoice.bank?.ifsc?.toLowerCase().includes(debouncedSearch)) return true;

      return false;
    });
  }, [debouncedSearch, invoices]);

  // Paginated Invoices
  const paginatedInvoices = useMemo(() => {
    // If searching, show all filtered results without pagination
    if (debouncedSearch) return filteredInvoices;

    // Otherwise, apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(0, startIndex + itemsPerPage);
  }, [filteredInvoices, currentPage, itemsPerPage, debouncedSearch]);

  const loadMoreInvoices = () => {
    setCurrentPage(prev => prev + 1);
  };

  // Check if there are more invoices to load
  const hasMoreInvoices = useMemo(() => {
    return debouncedSearch ? false : currentPage * itemsPerPage < filteredInvoices.length;
  }, [currentPage, itemsPerPage, filteredInvoices.length, debouncedSearch]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchSalesData(),
          axios.get(`${import.meta.env.VITE_API_URL}/customer/get-customers`).then(res =>
            setCustomers(res.data || [])
          ),
          axios.get(`${import.meta.env.VITE_API_URL}/workorder/get-workorders`).then(res => {
            const sortedWorkOrders = (res.data.data || []).sort((a, b) =>
              new Date(b.createdAt || b.workOrderDate || Date.now()) - new Date(a.createdAt || a.workOrderDate || Date.now())
            );
            setWorkOrders(sortedWorkOrders);
          })
        ]);
      } catch (error) {
        toast.error("Failed to fetch data");
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchSalesData = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/sales/get-sales`);
      const sortedInvoices = (response.data.data || []).sort((a, b) => {
        const dateDiff = new Date(b.invoiceDate) - new Date(a.invoiceDate);
        if (dateDiff !== 0) return dateDiff;
        return b.invoiceNumber.localeCompare(a.invoiceNumber);
      });
      setInvoices(sortedInvoices);
    } catch (error) {
      console.error("Error fetching sales:", error);
      toast.error("Failed to load invoices from database");
    }
  };

  const initialValues = {
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    workOrderNumber: "",
    poNumber: "",
    poDate: "",
    vehicleNumber: "",
    receiver: {
      customerId: "",
      companyName: "",
      name: "",
      gstin: "",
      address: "",
      city: "",
      pincode: "",
      contact: "",
      email: ""
    },
    consignee: {
      name: "",
      gstin: "",
      address: "",
      city: "",
      pincode: "",
      contact: "",
      email: ""
    },
    items: [],
    lrNumber: "",
    lrDate: "",
    transporter: "",
    transportMobile: "",
    bank: {
      name: "",
      account: "",
      branch: "",
      ifsc: ""
    },
    // otherCharges: 0, // Commented out as requested
    extraNote: "",
    taxSlab: "",
    includeTerms: false,
    selectedCustomer: null,
    packetForwardingPercent: 0,
    freightPercent: 0,
    inspectionPercent: 0,
    tcsPercent: 0, // Added TCS charge

    ewayBill: {
      supplyType: "O",
      subSupplyType: 1,
      transType: 1,
      transDistance: 0,
    }
  };

  const validationSchema = Yup.object().shape({
    invoiceDate: Yup.string().required("Invoice Date is required"),
    workOrderNumber: Yup.string().required("Work Order is required"),
    lrNumber: Yup.string().required("LR Number is required"),
    lrDate: Yup.string().required("LR Date is required"),
    vehicleNumber: Yup.string().required("Vehicle Number is required"),
    transporter: Yup.string().required("Transporter Name is required"),
    transportMobile: Yup.string().required("Transporter Mobile is required").matches(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number"),

    receiver: Yup.object({
      companyName: Yup.string().required("Company name required"),
      name: Yup.string().required("Receiver name required"),
      gstin: Yup.string().required("GSTIN required"),
      address: Yup.string().required("Address required"),
      city: Yup.string(),
      pincode: Yup.string(),
      contact: Yup.string().required("Contact required"),
      email: Yup.string().email("Invalid email").required("Email required")
    }),
    consignee: Yup.object({
      name: Yup.string().required("Consignee name required"),
      gstin: Yup.string().required("GSTIN required"),
      address: Yup.string().required("Address required"),
      city: Yup.string(),
      pincode: Yup.string(),
      contact: Yup.string().required("Contact required"),
      email: Yup.string().email("Invalid email").required("Email required")
    }),
    taxSlab: Yup.number()
      .required("Tax slab is required")
      .oneOf(TAX_SLABS.map(slab => slab.value), "Please select a valid tax slab"),
    items: Yup.array().of(
      Yup.object({
        name: Yup.string().required("Item name required"),
        quantity: Yup.number()
          .required("Quantity required")
          .moreThan(0, "Quantity must be greater than 0")
          .typeError("Quantity must be a number")
          .test(
            'is-decimal',
            'Quantity can have up to 2 decimal places',
            value => value === undefined || /^\d+(\.\d{1,2})?$/.test(value)
          ),
        unitPrice: Yup.number().required("Unit price required").moreThan(0),
        units: Yup.string().required("Unit is required")
      })
    )
  });

  const handleWorkOrderSelect = async (e, setFieldValue) => {
    const selectedWONumber = e.target.value;
    if (!selectedWONumber) return;

    try {
      // 1. Fetch all existing sales for this work order
      const salesResponse = await axios.get(`${import.meta.env.VITE_API_URL}/sales/get-sales-by-wo`, {
        params: { workOrderNumber: selectedWONumber }
      });

      // 2. Find the selected work order
      const selectedWO = workOrders.find(wo => wo.workOrderNumber === selectedWONumber);
      if (!selectedWO) {
        toast.error("Selected work order not found");
        return;
      }

      // 3. Calculate remaining quantities
      const itemsWithRemainingQty = selectedWO.items.map(woItem => {
        const soldQty = salesResponse.data.data.reduce((total, sale) => {
          const saleItem = sale.items.find(i =>
            i.name && woItem.name &&
            i.name.trim().toLowerCase() === woItem.name.trim().toLowerCase()
          );
          return total + (Number(saleItem?.quantity) || 0);
        }, 0);

        const remainingQty = Math.max(0, woItem.quantity - soldQty);

        return {
          ...woItem,
          bomId: woItem.bomId,
          quantity: remainingQty,
          _originalQty: woItem.quantity,
          _soldQty: soldQty,
          _remainingQty: remainingQty
        };
      }).filter(item => item._remainingQty > 0);

      if (itemsWithRemainingQty.length === 0) {
        toast.warn("All items in this work order have been fully sold");
        return;
      }

      // 4. Update only the fields that exist in the work order
      setFieldValue("workOrderNumber", selectedWO.workOrderNumber);
      setFieldValue("poNumber", selectedWO.poNumber || "");
      setFieldValue("poDate", selectedWO.poDate || "");
      setFieldValue("items", itemsWithRemainingQty);

      if (selectedWO.receiver) {
        // Set receiver details including companyName
        setFieldValue("receiver.customerId", selectedWO.receiver.customerId || "");
        setFieldValue("receiver.companyName", selectedWO.receiver.companyName || "");
        setFieldValue("receiver.name", selectedWO.receiver.name || "");
        setFieldValue("receiver.gstin", selectedWO.receiver.gstin || "");
        setFieldValue("receiver.address", selectedWO.receiver.address || "");
        setFieldValue("receiver.city", selectedWO.receiver.city || "");
        setFieldValue("receiver.pincode", selectedWO.receiver.pincode || "");
        setFieldValue("receiver.contact", selectedWO.receiver.contact || "");
        setFieldValue("receiver.email", selectedWO.receiver.email || "");

        // Also set consignee details to be same as receiver by default
        setFieldValue("consignee.name", selectedWO.receiver.name || "");
        setFieldValue("consignee.gstin", selectedWO.receiver.gstin || "");
        setFieldValue("consignee.address", selectedWO.receiver.address || "");
        setFieldValue("consignee.city", selectedWO.receiver.city || "");
        setFieldValue("consignee.pincode", selectedWO.receiver.pincode || "");
        setFieldValue("consignee.contact", selectedWO.receiver.contact || "");
        setFieldValue("consignee.email", selectedWO.receiver.email || "");

        // Update GST type based on receiver's GSTIN
        const isIntraState = selectedWO.receiver.gstin && selectedWO.receiver.gstin.startsWith("24");
        setGstType(isIntraState ? "intra" : "inter");
      }
    } catch (error) {
      console.error("Work order selection error:", error);
      toast.error("Failed to load work order details");
    }
  };

  const calculateTotals = (items, receiverGST = "", percentages = {}, taxSlab = 18) => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const isIntraState = typeof receiverGST === 'string' && receiverGST.startsWith("24");

    // Calculate GST based on selected tax slab
    const taxRate = taxSlab;
    const cgst = isIntraState ? +(subtotal * (taxRate / 2 / 100)).toFixed(2) : 0;
    const sgst = isIntraState ? +(subtotal * (taxRate / 2 / 100)).toFixed(2) : 0;
    const igst = !isIntraState ? +(subtotal * (taxRate / 100)).toFixed(2) : 0;

    // Calculate total before TCS (subtotal + GST)
    const totalBeforeTCS = +(subtotal + cgst + sgst + igst).toFixed(2);

    // Calculate TCS on the total amount including GST
    const tcs = percentages.tcsPercent ? +(totalBeforeTCS * percentages.tcsPercent / 100).toFixed(2) : 0;

    // Final total including TCS
    const total = +(totalBeforeTCS + tcs).toFixed(2);

    return {
      subtotal,
      tcs,
      taxableAmount: subtotal,
      cgst,
      sgst,
      igst,
      total,
      tcsPercent: percentages.tcsPercent,
      isIntraState,
      taxSlab: taxRate
    };
  };

  const generateEInvoiceJSON = (invoice) => {
    // Helper: format date DD/MM/YYYY
    const formatDate = (dateString) => {
      if (!dateString) return "";
      const [year, month, day] = dateString.split("-");
      return `${day}/${month}/${year}`;
    };

    // 1. Subtotal (items only)
    const subtotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    // 2. GST calculation (on subtotal only)
    const isIntraState = invoice.receiver.gstin && invoice.receiver.gstin.startsWith("24");
    const taxRate = invoice.taxSlab;

    const cgst = isIntraState ? +(subtotal * (taxRate / 2 / 100)).toFixed(2) : 0;
    const sgst = isIntraState ? +(subtotal * (taxRate / 2 / 100)).toFixed(2) : 0;
    const igst = !isIntraState ? +(subtotal * (taxRate / 100)).toFixed(2) : 0;

    // 3. TCS (on subtotal + GST)
    const baseWithGST = subtotal + cgst + sgst + igst;
    const tcs = invoice.tcsPercent ? +(baseWithGST * invoice.tcsPercent / 100).toFixed(2) : 0;

    // 4. Other charges = TCS only
    const othChrg = +tcs.toFixed(2);

    // 5. Final total
    const total = +(subtotal + cgst + sgst + igst + othChrg).toFixed(2);

    // 7. Item list (AssAmt = TotAmt - Discount)
    const itemList = invoice.items.map((item, index) => {
      const itemTotal = item.quantity * item.unitPrice;
      const itemAssAmt = itemTotal; // ✅ must equal TotAmt - Discount

      const itemCgst = isIntraState ? +(itemAssAmt * (taxRate / 2 / 100)).toFixed(2) : 0;
      const itemSgst = isIntraState ? +(itemAssAmt * (taxRate / 2 / 100)).toFixed(2) : 0;
      const itemIgst = !isIntraState ? +(itemAssAmt * (taxRate / 100)).toFixed(2) : 0;

      return {
        "SlNo": (index + 1).toString(),
        "PrdDesc": item.description || item.name,
        "IsServc": "N",
        "HsnCd": item.hsn || "",
        "Qty": item.quantity,
        "Unit": item.units || "NOS",
        "UnitPrice": item.unitPrice,
        "TotAmt": itemTotal,
        "Discount": 0,
        "PreTaxVal": 0,
        "AssAmt": itemAssAmt,   // ✅ matches TotAmt
        "GstRt": taxRate,
        "IgstAmt": itemIgst,
        "CgstAmt": itemCgst,
        "SgstAmt": itemSgst,
        "OthChrg": 0,
        "TotItemVal": itemAssAmt + itemIgst + itemCgst + itemSgst
      };
    });

    // 7. Invoice totals
    const valDtls = {
      "AssVal": +subtotal.toFixed(2),  // ✅ only subtotal
      "IgstVal": igst,
      "CgstVal": cgst,
      "SgstVal": sgst,
      "Discount": 0,
      "OthChrg": othChrg,              // ✅ TCS only
      "TotInvVal": total
    };

    // 8. Return JSON
    return [
      {
        "Version": "1.1",
        "TranDtls": {
          "TaxSch": "GST",
          "SupTyp": "B2B",
          "IgstOnIntra": "N"
        },
        "DocDtls": {
          "Typ": "INV",
          "No": invoice.invoiceNumber,
          "Dt": formatDate(invoice.invoiceDate)
        },
        "SellerDtls": {
          "Gstin": "24AAAFF2996A1ZS",
          "LglNm": "FERRO TUBE AND FORGE INDUSTRIES",
          "TrdNm": "FERRO TUBE AND FORGE INDUSTRIES",
          "Addr1": "123 MAIN STREET",
          "Loc": "VADODARA",
          "Pin": 391760,
          "Stcd": "24"
        },
        "BuyerDtls": {
          "Gstin": invoice.receiver.gstin,
          "LglNm": invoice.receiver.companyName || invoice.receiver.name,
          "TrdNm": invoice.receiver.name,
          "Pos": invoice.receiver.gstin.substring(0, 2),
          "Addr1": invoice.receiver.address,
          "Loc": invoice.receiver.city || "VADODARA",
          "Pin": parseInt(invoice.receiver.pincode) || 391760,
          "Stcd": invoice.receiver.gstin.substring(0, 2),
          "Ph": invoice.receiver.contact,
          "Em": invoice.receiver.email
        },
        "ValDtls": valDtls,
        "ItemList": itemList
      }
    ];
  };









  const handleSubmit = async (values, { resetForm }) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Final quantity validation
    const invalidItems = values.items.filter(item =>
      item._remainingQty !== undefined && item.quantity > item._remainingQty
    );

    if (invalidItems.length > 0) {
      invalidItems.forEach(item => {
        toast.error(`Quantity for ${item.name} exceeds remaining work order quantity (Max: ${item._remainingQty})`);
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // Commented out other charges as requested
      // const numericOtherCharges = Number(values.otherCharges || 0);
      const totals = calculateTotals(
        values.items,
        values.receiver.gstin || "",
        {
          tcsPercent: values.tcsPercent
        },
        values.taxSlab
      );

      // FIX: Only include TCS in other charges since other charges are removed
      const totalOtherCharges = totals.tcs || 0; // ✅ Only TCS remains

      const mainHsnItem = values.items.reduce((maxItem, currentItem) =>
        (currentItem.quantity * currentItem.unitPrice) > (maxItem.quantity * maxItem.unitPrice) ? currentItem : maxItem
      );

      const isIntraState = values.receiver.gstin.startsWith("24");

      const ewayBillData = {
        // Static sender info
        fromGstin: "24AAAFF2996A1ZS",
        fromTrdName: "FERRO TUBE AND FORGE INDUSTRIES",
        fromAddr1: "123 Main Street",
        fromAddr2: "",
        fromPlace: "Vadodara",
        fromPincode: "391760",
        fromStateCode: 24,
        actualFromStateCode: 24,

        // User provided
        supplyType: values.ewayBill.supplyType,
        subSupplyType: values.ewayBill.subSupplyType,
        transType: values.ewayBill.transType,
        vehicleType: "R",
        transMode: 1,
        transDistance: values.ewayBill.transDistance,

        // From receiver
        toGstin: values.receiver.gstin,
        toTrdName: values.receiver.name,
        toAddr1: values.receiver.address,
        toAddr2: "",
        toPlace: values.receiver.city,
        toPincode: values.receiver.pincode,
        toStateCode: parseInt(values.receiver.gstin.substring(0, 2)),
        actualToStateCode: parseInt(values.receiver.gstin.substring(0, 2)),

        // From invoice
        docType: "INV",
        docNo: values.invoiceNumber,
        docDate: values.invoiceDate,

        // From transport
        transporterName: values.transporter,
        transDocNo: values.lrNumber,
        transDocDate: values.lrDate,
        vehicleNo: values.vehicleNumber,

        // From items
        itemList: values.items.map((item, index) => ({
          itemNo: index + 1,
          productName: item.name,
          productDesc: item.description,
          hsnCode: item.hsn,
          quantity: item.quantity,
          qtyUnit: item.units,
          taxableAmount: item.quantity * item.unitPrice,
          sgstRate: isIntraState ? values.taxSlab / 2 : 0, // Use actual tax rates
          cgstRate: isIntraState ? values.taxSlab / 2 : 0,
          igstRate: isIntraState ? 0 : values.taxSlab, // ✅ Use the actual tax slab value
          cessRate: 0,
          cessNonAdvol: 0
        })),

        // From totals
        totalValue: totals.subtotal,
        cgstValue: totals.cgst,
        sgstValue: totals.sgst,
        igstValue: totals.igst,
        totInvValue: totals.total,
        OthValue: totalOtherCharges, // ✅ Now this will be a number (not null)
        TotNonAdvolVal: 0,
        mainHsnCode: mainHsnItem.hsn
      };

      const newInvoice = {
        ...values,
        ...totals,
        terms: values.includeTerms ? TERMS_CONDITIONS : "",
        extraNote: values.extraNote,
        ewayBill: ewayBillData,
        tcs: totals.tcs // Only TCS remains
      };

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/sales/create-sale`, newInvoice);
      setInvoices(prev => [response.data.data, ...prev]);
      toast.success("Invoice saved successfully!");
      setShowForm(false);
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedInvoice) {
      toast.warn("Select an invoice to export");
      return;
    }

    if (isExporting) return;
    setIsExporting(true);

    try {
      const element = document.getElementById("sales-pdf");

      console.log("Starting PDF export...");
      console.log("Selected invoice image URL:", selectedInvoice.imageUrl);

      // Wait for all images inside element
      const images = element.getElementsByTagName("img");
      const imageLoadPromises = Array.from(images).map((img) => {
        return new Promise((resolve) => {
          if (img.complete) {
            resolve();
          } else {
            img.onload = resolve;
            img.onerror = resolve;
          }
        });
      });

      await Promise.race([
        Promise.all(imageLoadPromises),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);

      // Generate PDF with margins (header/footer spacing)
      await html2pdf()
        .from(element)
        .set({
          margin: [35, 10, 5, 10],
          // top=40mm, right=10mm, bottom=25mm, left=10mm
          // -> leaves blank space at top & bottom on EVERY PAGE

          filename: `${selectedInvoice.invoiceNumber}_${selectedInvoice.receiver.name.replace(
            /\s+/g,
            "_"
          )}.pdf`,

          image: { type: "jpeg", quality: 0.98 },

          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
          },

          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .save();
    } catch (error) {
      toast.error("Failed to export PDF");
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };




  const handleExportExcel = () => {
    // Use filteredInvoices instead of invoices when search is applied
    const dataToExport = filteredInvoices.length > 0 ? filteredInvoices : invoices;

    if (dataToExport.length === 0) {
      toast.warn("No invoices to export");
      return;
    }

    // Create detailed data for export
    const data = dataToExport.map((invoice) => {
      // Format items as a string for easier reading in Excel
      const itemsString = invoice.items?.map(item =>
        `${item.name || 'N/A'} (Qty: ${item.quantity || 0} ${item.units || ''})`
      ).join('; ') || 'No items';

      // Calculate totals
      const totals = calculateTotals(
        invoice.items || [],
        invoice.receiver?.gstin || "",
        {
          tcsPercent: invoice.tcsPercent || 0
        },
        invoice.taxSlab || 18
      );

      return {
        'Invoice No': invoice.invoiceNumber || 'N/A',
        'Invoice Date': invoice.invoiceDate || 'N/A',
        'Work Order No': invoice.workOrderNumber || 'N/A',
        'PO Number': invoice.poNumber || 'N/A',
        'PO Date': invoice.poDate || 'N/A',
        'Company Name': invoice.receiver?.companyName || 'N/A',
        'Receiver Name': invoice.receiver?.name || 'N/A',
        'Receiver GSTIN': invoice.receiver?.gstin || 'N/A',
        'Receiver Address': invoice.receiver?.address || 'N/A',
        'Receiver City': invoice.receiver?.city || 'N/A',
        'Receiver Pincode': invoice.receiver?.pincode || 'N/A',
        'Receiver Contact': invoice.receiver?.contact || 'N/A',
        'Receiver Email': invoice.receiver?.email || 'N/A',
        'Consignee Name': invoice.consignee?.name || 'N/A',
        'Consignee GSTIN': invoice.consignee?.gstin || 'N/A',
        'Consignee Address': invoice.consignee?.address || 'N/A',
        'Consignee City': invoice.consignee?.city || 'N/A',
        'Consignee Pincode': invoice.consignee?.pincode || 'N/A',
        'Consignee Contact': invoice.consignee?.contact || 'N/A',
        'Consignee Email': invoice.consignee?.email || 'N/A',
        'LR Number': invoice.lrNumber || 'N/A',
        'LR Date': invoice.lrDate || 'N/A',
        'Vehicle Number': invoice.vehicleNumber || 'N/A',
        'Transporter': invoice.transporter || 'N/A',
        'Transporter Mobile': invoice.transportMobile || 'N/A',
        'Subtotal': `₹${totals.subtotal.toFixed(2)}`,
        'CGST': invoice.receiver?.gstin?.startsWith('24') ? `₹${totals.cgst.toFixed(2)}` : 'N/A',
        'SGST': invoice.receiver?.gstin?.startsWith('24') ? `₹${totals.sgst.toFixed(2)}` : 'N/A',
        'IGST': !invoice.receiver?.gstin?.startsWith('24') ? `₹${totals.igst.toFixed(2)}` : 'N/A',
        'TCS': invoice.tcsPercent ? `₹${totals.tcs.toFixed(2)}` : 'N/A',
        'Total': `₹${totals.total.toFixed(2)}`,
        'Tax Slab': `${invoice.taxSlab || 0}%`,
        'TCS Percent': `${invoice.tcsPercent || 0}%`,
        'Items Count': invoice.items?.length || 0,
        'Items Details': itemsString,
        'GST Type': invoice.receiver?.gstin?.startsWith('24') ? 'Intra-State' : 'Inter-State',
        'Extra Notes': invoice.extraNote || 'N/A',
        'Status': 'Active'
      };
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths for better readability
    const columnWidths = [
      { wch: 15 }, // Invoice No
      { wch: 12 }, // Invoice Date
      { wch: 15 }, // Work Order No
      { wch: 15 }, // PO Number
      { wch: 12 }, // PO Date
      { wch: 25 }, // Company Name
      { wch: 20 }, // Receiver Name
      { wch: 20 }, // Receiver GSTIN
      { wch: 30 }, // Receiver Address
      { wch: 15 }, // Receiver City
      { wch: 12 }, // Receiver Pincode
      { wch: 15 }, // Receiver Contact
      { wch: 25 }, // Receiver Email
      { wch: 20 }, // Consignee Name
      { wch: 20 }, // Consignee GSTIN
      { wch: 30 }, // Consignee Address
      { wch: 15 }, // Consignee City
      { wch: 12 }, // Consignee Pincode
      { wch: 15 }, // Consignee Contact
      { wch: 25 }, // Consignee Email
      { wch: 15 }, // LR Number
      { wch: 12 }, // LR Date
      { wch: 15 }, // Vehicle Number
      { wch: 20 }, // Transporter
      { wch: 15 }, // Transporter Mobile
      { wch: 15 }, // Subtotal
      { wch: 15 }, // CGST
      { wch: 15 }, // SGST
      { wch: 15 }, // IGST
      { wch: 15 }, // TCS
      { wch: 15 }, // Total
      { wch: 10 }, // Tax Slab
      { wch: 10 }, // TCS Percent
      { wch: 10 }, // Items Count
      { wch: 50 }, // Items Details
      { wch: 15 }, // GST Type
      { wch: 30 }, // Extra Notes
      { wch: 10 }  // Status
    ];

    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");

    // Use appropriate filename based on whether filtered or all
    const fileName = debouncedSearch ? "filtered_invoices.xlsx" : "all_invoices.xlsx";
    XLSX.writeFile(workbook, fileName);

    toast.success(`Exported ${dataToExport.length} invoices with detailed information`);
  };


  const handleFileUpload = async (invoice, event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingFiles(prev => ({ ...prev, [invoice.invoiceNumber]: true }));

    try {
      // 1. Get presigned URL from backend
      const presignedResponse = await axios.post(
        `${import.meta.env.VITE_API_URL}/s3/sales-presigned-url`,
        {
          invoiceNumber: invoice.invoiceNumber,
          fileType: file.type
        }
      );

      const { uploadUrl, fileUrl } = presignedResponse.data;

      // 2. Upload file to S3 with proper headers
      await axios.put(uploadUrl, file, {
        headers: {
          "Content-Type": file.type
        }
      });

      // 3. Save image URL to database
      await axios.put(
        `${import.meta.env.VITE_API_URL}/sales/update-sale-image/${invoice.invoiceNumber}`,
        { imageUrl: fileUrl }
      );

      // 4. Update local state
      setInvoices(prev => prev.map(inv =>
        inv.invoiceNumber === invoice.invoiceNumber
          ? { ...inv, imageUrl: fileUrl }
          : inv
      ));

      if (selectedInvoice?.invoiceNumber === invoice.invoiceNumber) {
        setSelectedInvoice(prev => ({ ...prev, imageUrl: fileUrl }));
      }

      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingFiles(prev => ({ ...prev, [invoice.invoiceNumber]: false }));
      // Reset file input
      if (fileInputRefs.current[invoice.invoiceNumber]) {
        fileInputRefs.current[invoice.invoiceNumber].value = '';
      }
    }
  };

  // Add these functions to your Sales component
  // FIXED: handleUpdateInvoice function
  const handleUpdateInvoice = async (updatedInvoice) => {
    try {
      // Remove timestamp fields but keep invoiceNumber for the update
      const { createdAt, updatedAt, ...updateData } = updatedInvoice;

      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/sales/update-sale/${updatedInvoice.invoiceNumber}`,
        updateData
      );

      if (response.data.success) {
        // FIX: Update the invoices state with the returned data
        setInvoices(prev =>
          prev.map(inv =>
            inv.invoiceNumber === updatedInvoice.invoiceNumber ? response.data.data : inv
          )
        );

        // FIX: Also update the selectedInvoice if it's the one being edited
        if (selectedInvoice && selectedInvoice.invoiceNumber === updatedInvoice.invoiceNumber) {
          setSelectedInvoice(response.data.data);
        }

        toast.success("Invoice updated successfully!");
        return true;
      } else {
        toast.error("Failed to update invoice");
        return false;
      }
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast.error(error.response?.data?.message || "Error updating invoice");
      return false;
    }
  };

  const handleDeleteInvoice = async (invoiceNumber) => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/sales/delete-sale/${invoiceNumber}`
      );

      setInvoices(prev =>
        prev.filter(inv => inv.invoiceNumber !== invoiceNumber)
      );
      setSelectedInvoice(null);
      toast.success("Invoice deleted successfully!");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error(error.response?.data?.message || "Error deleting invoice");
    }
  };



  const InvoiceModal = ({ invoice, onClose, onExport, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedInvoice, setEditedInvoice] = useState({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'auto';
      };
    }, []);

    useEffect(() => {
      if (invoice) {
        setEditedInvoice({ ...invoice });
        setErrors({});
      }
    }, [invoice]);

    // Validation function - only validate editable fields
    const validateForm = (values) => {
      const newErrors = {};

      // Validate transport details
      if (!values.lrNumber) newErrors.lrNumber = "LR Number is required";
      if (!values.lrDate) newErrors.lrDate = "LR Date is required";
      if (!values.vehicleNumber) newErrors.vehicleNumber = "Vehicle Number is required";
      if (!values.transporter) newErrors.transporter = "Transporter is required";
      if (!values.transportMobile) {
        newErrors.transportMobile = "Transporter Mobile is required";
      } else if (!/^[6-9]\d{9}$/.test(values.transportMobile)) {
        newErrors.transportMobile = "Please enter a valid 10-digit mobile number";
      }
      // Validate tax slab
      if (!values.taxSlab) newErrors.taxSlab = "Tax slab is required";

      return newErrors;
    };

    const handleInputChange = (e) => {
      const { name, value } = e.target;

      // Convert numeric fields to numbers
      let processedValue = value;
      if (name === "taxSlab" || name === "tcsPercent") {
        processedValue = value === "" ? "" : Number(value);
      }

      // Update the invoice data
      const updatedInvoice = { ...editedInvoice, [name]: processedValue };
      setEditedInvoice(updatedInvoice);

      // Recalculate totals if tax-related fields change
      if (name === "taxSlab" || name === "tcsPercent") {
        const newTotals = recalculateTotals(updatedInvoice);
        setEditedInvoice(prev => ({
          ...prev,
          ...newTotals
        }));
      }

      // Validate the field in real-time
      const fieldErrors = validateForm(updatedInvoice);
      setErrors(prev => ({ ...prev, [name]: fieldErrors[name] }));
    };

    const handleCheckboxChange = (e) => {
      const { name, checked } = e.target;
      setEditedInvoice(prev => ({
        ...prev,
        [name]: checked,
        terms: checked ? TERMS_CONDITIONS : ""
      }));
    };

    // Add this function inside your InvoiceModal component
    // FIXED: recalculateTotals function in InvoiceModal
    // FIXED: recalculateTotals function in InvoiceModal
    const recalculateTotals = (invoiceData) => {
      const items = invoiceData.items || [];
      const receiverGST = invoiceData.receiver?.gstin || "";
      const taxSlab = invoiceData.taxSlab || 18;
      const tcsPercent = invoiceData.tcsPercent || 0;

      const subtotal = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);

      // FIX: Properly check if GSTIN starts with "24" for intra-state
      const isIntraState = receiverGST && receiverGST.startsWith("24");

      // Calculate GST
      const taxRate = taxSlab;
      const cgst = isIntraState ? +(subtotal * (taxRate / 2 / 100)).toFixed(2) : 0;
      const sgst = isIntraState ? +(subtotal * (taxRate / 2 / 100)).toFixed(2) : 0;
      const igst = !isIntraState ? +(subtotal * (taxRate / 100)).toFixed(2) : 0;

      // Calculate total before TCS
      const totalBeforeTCS = +(subtotal + cgst + sgst + igst).toFixed(2);

      // Calculate TCS
      const tcs = tcsPercent ? +(totalBeforeTCS * tcsPercent / 100).toFixed(2) : 0;

      // Final total
      const total = +(totalBeforeTCS + tcs).toFixed(2);

      return {
        subtotal,
        cgst,
        sgst,
        igst,
        tcs,
        total,
        isIntraState, // Make sure to return this flag
        taxSlab: taxRate // Also return taxSlab for consistency
      };
    };

    const handleSave = async () => {
      const formErrors = validateForm(editedInvoice);
      if (Object.keys(formErrors).length > 0) {
        setErrors(formErrors);
        toast.error("Please fix the errors before saving");
        return;
      }

      try {
        const success = await onUpdate(editedInvoice);
        if (success) {
          setIsEditing(false);
          setErrors({});
        }
      } catch (error) {
        console.error("Error updating invoice:", error);
      }
    };

    const handleExportJSON = () => {
      if (!invoice) return;

      const eInvoiceData = generateEInvoiceJSON(invoice);

      // Create and trigger download
      const blob = new Blob([JSON.stringify(eInvoiceData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eInvoice_${invoice.invoiceNumber}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    const formatDate = (dateString) => {
      if (!dateString) return "";
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    };

    if (!invoice) return null;

    const totals = {
      subtotal: invoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
      cgst: invoice.cgst || 0,
      sgst: invoice.sgst || 0,
      igst: invoice.igst || 0,
      total: invoice.total || 0,
      tcs: invoice.tcsPercent ?
        ((invoice.subtotal + (invoice.cgst || 0) + (invoice.sgst || 0) + (invoice.igst || 0)) * invoice.tcsPercent / 100) : 0
    };

    const isIntraState = invoice.receiver.gstin?.startsWith("24");

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">
              {isEditing ? "Edit Invoice" : `Tax Invoice: ${invoice.invoiceNumber}`}
            </div>
            <button className="modal-close" onClick={onClose}>
              &times;
            </button>
          </div>

          <div className="modal-body">
            <div className="wo-details-grid">
              {/* Basic Invoice Details */}
              <div className="detail-row">
                <span className="detail-label">Invoice No:</span>
                <span className="detail-value">{invoice.invoiceNumber}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Invoice Date:</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <input
                      type="date"
                      value={editedInvoice.invoiceDate || ''}
                      onChange={(e) => handleInputChange(e)}
                      name="invoiceDate"
                      className={`edit-input ${errors.invoiceDate ? 'error' : ''}`}
                    />
                    {errors.invoiceDate && <div className="error-message">{errors.invoiceDate}</div>}
                  </div>
                ) : (
                  <span className="detail-value">{invoice.invoiceDate}</span>
                )}
              </div>
              {invoice.workOrderNumber && (
                <div className="detail-row">
                  <span className="detail-label">Work Order:</span>
                  <span className="detail-value">{invoice.workOrderNumber}</span>
                </div>
              )}

              {/* New PO Number and Date Fields */}
              {invoice.poNumber && (
                <div className="detail-row">
                  <span className="detail-label">PO Number:</span>
                  {isEditing ? (
                    <div className="edit-field-container">
                      <input
                        type="text"
                        value={editedInvoice.poNumber || ''}
                        onChange={(e) => handleInputChange(e)}
                        name="poNumber"
                        className="edit-input"
                      />
                    </div>
                  ) : (
                    <span className="detail-value">{invoice.poNumber}</span>
                  )}
                </div>
              )}

              {invoice.poDate && (
                <div className="detail-row">
                  <span className="detail-label">PO Date:</span>
                  {isEditing ? (
                    <div className="edit-field-container">
                      <input
                        type="date"
                        value={editedInvoice.poDate || ''}
                        onChange={(e) => handleInputChange(e)}
                        name="poDate"
                        className="edit-input"
                      />
                    </div>
                  ) : (
                    <span className="detail-value">{invoice.poDate}</span>
                  )}
                </div>
              )}

              {/* Receiver Details */}
              <div className="section-header">Receiver Details (Billed To)</div>
              <div className="detail-row">
                <span className="detail-label">Company Name:</span>
                <span className="detail-value">{invoice.receiver.companyName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{invoice.receiver.name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">GSTIN:</span>
                <span className="detail-value">{invoice.receiver.gstin}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Address:</span>
                <span className="detail-value">{invoice.receiver.address}</span>
              </div>
              <div className="address-details-row">
                <div className="detail-row">
                  <span className="detail-label">City:</span>
                  <span className="detail-value">{invoice.receiver.city || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Pincode:</span>
                  <span className="detail-value">{invoice.receiver.pincode || 'N/A'}</span>
                </div>
              </div>
              <div className="detail-row">
                <span className="detail-label">Contact:</span>
                <span className="detail-value">{invoice.receiver.contact}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{invoice.receiver.email}</span>
              </div>

              {/* Consignee Details */}
              <div className="section-header">Consignee Details (Shipped To)</div>
              <div className="detail-row">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{invoice.consignee.name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">GSTIN:</span>
                <span className="detail-value">{invoice.consignee.gstin}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Address:</span>
                <span className="detail-value">{invoice.consignee.address}</span>
              </div>
              <div className="address-details-row">
                <div className="detail-row">
                  <span className="detail-label">City:</span>
                  <span className="detail-value">{invoice.consignee.city || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Pincode:</span>
                  <span className="detail-value">{invoice.consignee.pincode || 'N/A'}</span>
                </div>
              </div>
              <div className="detail-row">
                <span className="detail-label">Contact:</span>
                <span className="detail-value">{invoice.consignee.contact}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{invoice.consignee.email}</span>
              </div>

              {/* Items Section */}
              <div className="section-header">Products</div>
              <div className="items-grid">
                {invoice.items.map((item, index) => (
                  <div key={index} className="item-card">
                    <div className="item-header">
                      <span className="item-name">{item.name}</span>
                      <span className="item-hsn">HSN: {item.hsn || 'N/A'}</span>
                    </div>
                    <div className="item-details">
                      <span>Qty: {item.quantity} {item.units}</span>
                      <span>Rate: ₹{item.unitPrice.toFixed(2)}</span>
                      <span>Total: ₹{(item.quantity * item.unitPrice).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Transport Details - EDITABLE FIELDS */}
              <div className="section-header">Transport Details</div>
              <div className="detail-row">
                <span className="detail-label">LR Number:</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <input
                      type="text"
                      value={editedInvoice.lrNumber || ''}
                      onChange={(e) => handleInputChange(e)}
                      name="lrNumber"
                      className={`edit-input ${errors.lrNumber ? 'error' : ''}`}
                    />
                    {errors.lrNumber && <div className="error-message">{errors.lrNumber}</div>}
                  </div>
                ) : (
                  <span className="detail-value">{invoice.lrNumber || 'N/A'}</span>
                )}
              </div>

              <div className="detail-row">
                <span className="detail-label">LR Date:</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <input
                      type="date"
                      value={editedInvoice.lrDate || ''}
                      onChange={(e) => handleInputChange(e)}
                      name="lrDate"
                      className={`edit-input ${errors.lrDate ? 'error' : ''}`}
                    />
                    {errors.lrDate && <div className="error-message">{errors.lrDate}</div>}
                  </div>
                ) : (
                  <span className="detail-value">{invoice.lrDate || 'N/A'}</span>
                )}
              </div>

              <div className="detail-row">
                <span className="detail-label">Vehicle Number:</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <input
                      type="text"
                      value={editedInvoice.vehicleNumber || ''}
                      onChange={(e) => handleInputChange(e)}
                      name="vehicleNumber"
                      className={`edit-input ${errors.vehicleNumber ? 'error' : ''}`}
                    />
                    {errors.vehicleNumber && <div className="error-message">{errors.vehicleNumber}</div>}
                  </div>
                ) : (
                  <span className="detail-value">{invoice.vehicleNumber || 'N/A'}</span>
                )}
              </div>

              <div className="detail-row">
                <span className="detail-label">Transporter:</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <input
                      type="text"
                      value={editedInvoice.transporter || ''}
                      onChange={(e) => handleInputChange(e)}
                      name="transporter"
                      className={`edit-input ${errors.transporter ? 'error' : ''}`}
                    />
                    {errors.transporter && <div className="error-message">{errors.transporter}</div>}
                  </div>
                ) : (
                  <span className="detail-value">{invoice.transporter || 'N/A'}</span>
                )}
              </div>

              <div className="detail-row">
                <span className="detail-label">Mobile:</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <input
                      type="text"
                      value={editedInvoice.transportMobile || ''}
                      onChange={(e) => handleInputChange(e)}
                      name="transportMobile"
                      className={`edit-input ${errors.transportMobile ? 'error' : ''}`}
                    />
                    {errors.transportMobile && <div className="error-message">{errors.transportMobile}</div>}
                  </div>
                ) : (
                  <span className="detail-value">{invoice.transportMobile || 'N/A'}</span>
                )}
              </div>

              {invoice.extraNote && (
                <>
                  <div className="section-header">Additional Notes</div>
                  <div className="detail-row">
                    {isEditing ? (
                      <div className="edit-field-container">
                        <textarea
                          value={editedInvoice.extraNote || ''}
                          onChange={(e) => handleInputChange(e)}
                          name="extraNote"
                          rows="3"
                          className="edit-textarea"
                        />
                      </div>
                    ) : (
                      <span className="detail-value">{invoice.extraNote}</span>
                    )}
                  </div>
                </>
              )}

              {invoice.terms && (
                <>
                  <div className="section-header">Terms & Conditions</div>
                  <div className="detail-row">
                    <pre className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{invoice.terms}</pre>
                  </div>
                </>
              )}

              {invoice.imageUrl && (
                <>
                  <div className="section-header">Uploaded Image</div>
                  <div className="detail-row">
                    <img
                      src={invoice.imageUrl}
                      alt="Invoice attachment"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '300px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </>
              )}

              {/* Tax Information - EDITABLE FIELD */}
              {/* Tax Information - EDITABLE FIELD */}
              <div className="section-header">Tax Information</div>
              <div className="detail-row">
                <span className="detail-label">Tax Slab:</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <select
                      value={editedInvoice.taxSlab || ''}
                      onChange={(e) => handleInputChange(e)}
                      name="taxSlab"
                      className={`edit-input ${errors.taxSlab ? 'error' : ''}`}
                    >
                      <option value="">Select Tax Slab</option>
                      {TAX_SLABS.map((slab) => (
                        <option key={slab.value} value={slab.value}>
                          {slab.label}
                        </option>
                      ))}
                    </select>
                    {errors.taxSlab && <div className="error-message">{errors.taxSlab}</div>}
                  </div>
                ) : (
                  <span className="detail-value">{invoice.taxSlab}%</span>
                )}
              </div>

              {/* TCS Percentage - EDITABLE FIELD */}
              <div className="detail-row">
                <span className="detail-label">TCS %:</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <input
                      type="number"
                      value={editedInvoice.tcsPercent || 0}
                      onChange={(e) => handleInputChange(e)}
                      name="tcsPercent"
                      min="0"
                      max="100"
                      step="0.01"
                      className={`edit-input ${errors.tcsPercent ? 'error' : ''}`}
                    />
                    {errors.tcsPercent && <div className="error-message">{errors.tcsPercent}</div>}
                  </div>
                ) : (
                  <span className="detail-value">{invoice.tcsPercent || 0}%</span>
                )}
              </div>

              {/* Terms & Conditions - EDITABLE FIELD */}
              <div className="detail-row">
                <span className="detail-label">Include Terms:</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <label>
                      <input
                        type="checkbox"
                        checked={editedInvoice.includeTerms || false}
                        onChange={handleCheckboxChange}
                        name="includeTerms"
                      />
                      Include Standard Terms & Conditions
                    </label>
                  </div>
                ) : (
                  <span className="detail-value">{invoice.includeTerms ? 'Yes' : 'No'}</span>
                )}
              </div>

              {/* Totals Section */}
              <div className="section-header">Invoice Summary</div>
              {/* Totals Section */}
              {/* FIXED: Totals Section in InvoiceModal */}
              <div className="totals-section">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>₹{(isEditing ? editedInvoice.subtotal : invoice.subtotal || 0).toFixed(2)}</span>
                </div>

                {/* In edit mode, use the calculated values from editedInvoice */}
                {isEditing ? (
                  <>
                    {editedInvoice.cgst > 0 && (
                      <div className="total-row">
                        <span>CGST ({editedInvoice.taxSlab / 2}%):</span>
                        <span>₹{(editedInvoice.cgst || 0).toFixed(2)}</span>
                      </div>
                    )}
                    {editedInvoice.sgst > 0 && (
                      <div className="total-row">
                        <span>SGST ({editedInvoice.taxSlab / 2}%):</span>
                        <span>₹{(editedInvoice.sgst || 0).toFixed(2)}</span>
                      </div>
                    )}
                    {editedInvoice.igst > 0 && (
                      <div className="total-row">
                        <span>IGST ({editedInvoice.taxSlab}%):</span>
                        <span>₹{(editedInvoice.igst || 0).toFixed(2)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  /* In view mode, use the values from the original invoice */
                  <>
                    {invoice.cgst > 0 && (
                      <div className="total-row">
                        <span>CGST ({invoice.taxSlab / 2}%):</span>
                        <span>₹{(invoice.cgst || 0).toFixed(2)}</span>
                      </div>
                    )}
                    {invoice.sgst > 0 && (
                      <div className="total-row">
                        <span>SGST ({invoice.taxSlab / 2}%):</span>
                        <span>₹{(invoice.sgst || 0).toFixed(2)}</span>
                      </div>
                    )}
                    {invoice.igst > 0 && (
                      <div className="total-row">
                        <span>IGST ({invoice.taxSlab}%):</span>
                        <span>₹{(invoice.igst || 0).toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}

                {(isEditing ? editedInvoice.tcs : invoice.tcs || 0) > 0 && (
                  <div className="total-row">
                    <span>TCS ({isEditing ? editedInvoice.tcsPercent : invoice.tcsPercent}%):</span>
                    <span>₹{(isEditing ? editedInvoice.tcs : invoice.tcs || 0).toFixed(2)}</span>
                  </div>
                )}

                <div className="total-row grand-total">
                  <span>Total:</span>
                  <span>₹{(isEditing ? editedInvoice.total : invoice.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              className="export-btn"
              onClick={onExport}
              disabled={isExporting || !invoice}
            >
              {isExporting ? (
                <span>Exporting...</span>
              ) : (
                <>
                  <FaFileExport /> Export PDF
                </>
              )}
            </button>
            <button
              className="export-btn"
              onClick={handleExportJSON}
            >
              <FaFileCode /> Export JSON
            </button>
            <button
              className={`update-btn ${isEditing ? 'save-btn' : ''}`}
              onClick={isEditing ? handleSave : () => setIsEditing(true)}
            >
              {isEditing ? "Save Changes" : "Update"}
            </button>
            <button
              className="delete-btn"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <FaTrash /> Delete
            </button>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="confirm-dialog-overlay">
            <div className="confirm-dialog">
              <h3>Confirm Deletion</h3>
              <p>Are you sure you want to delete invoice {invoice.invoiceNumber}? This action cannot be undone.</p>
              <div className="confirm-buttons">
                <button
                  className="confirm-cancel"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="confirm-delete"
                  onClick={() => {
                    onDelete(invoice.invoiceNumber);
                    setShowDeleteConfirm(false);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };



  return (
    <Navbar>
      <ToastContainer position="top-center" autoClose={3000} />
      <div className="main">
        <div className="page-header">
          <h2>Tax Invoices</h2>
          <div className="right-section">
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search Invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="action-buttons-group">
              <button className="export-all-btn" onClick={handleExportExcel}>
                <FaFileExcel /> Export All
              </button>
              <button className="add-btn" onClick={() => setShowForm(!showForm)}>
                <FaPlus /> {showForm ? "Close Form" : "Create Invoice"}
              </button>
            </div>
          </div>
        </div>

        {isLoading && <div className="loading">Loading data...</div>}

        {showForm && (
          <div className="form-container premium">
            <h2>Create Tax Invoice</h2>
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ values, errors, submitCount, setFieldValue }) => {

                const totals = calculateTotals(
                  values.items,
                  values.receiver.gstin || "", // ✅ Correct parameter for receiverGST
                  {
                    tcsPercent: values.tcsPercent // ✅ Only TCS remains
                  },
                  values.taxSlab
                );

                useEffect(() => {
                  if (submitCount > 0 && Object.keys(errors).length > 0) {
                    Object.entries(errors).slice(0, 3).forEach(([field, error]) => {
                      if (field === "items" && Array.isArray(error)) {
                        error.forEach((itemError, index) => {
                          if (itemError && typeof itemError === "object") {
                            Object.entries(itemError).forEach(([key, val]) => {
                              toast.error(`Item ${index + 1} - ${key}: ${val}`);
                            });
                          }
                        });
                      } else if (typeof error === 'string') {
                        toast.error(`${field}: ${error}`);
                      }
                    });
                  }
                }, [submitCount, errors]);

                return (
                  <Form>
                    <div className="form-group-row">
                      <div className="field-wrapper">
                        <label>Invoice Date</label>
                        <Field name="invoiceDate" type="date" />
                      </div>
                      <div className="field-wrapper">
                        <label>Work Order</label>
                        <Select
                          className="react-select-container"
                          classNamePrefix="react-select"
                          options={workOrders.map(wo => ({
                            value: wo.workOrderNumber,
                            label: `${wo.workOrderNumber} - ${wo.receiver?.name}`,
                            woData: wo // Keep full work order data
                          }))}
                          onChange={(selectedOption) => {
                            if (selectedOption) {
                              handleWorkOrderSelect(
                                { target: { value: selectedOption.value } },
                                setFieldValue
                              );
                            }
                          }}
                          placeholder="Select Work Order"
                          isSearchable={true}
                          noOptionsMessage={() => "No work orders found"}
                        />
                      </div>

                      <div className="field-wrapper">
                        <label>PO Number</label>
                        <Field name="poNumber" placeholder="PO Number" />
                      </div>

                      {/* New PO Date field */}
                      <div className="field-wrapper">
                        <label>PO Date</label>
                        <Field name="poDate" type="date" />
                      </div>
                    </div>

                    <h3>Receiver (Billed To)</h3>
                    <div className="form-group-row">
                      <div className="field-wrapper">
                        <label>Company Name</label>
                        <Field name="receiver.companyName" placeholder="Company Name" />
                      </div>
                      <div className="field-wrapper">
                        <label>Contact Person</label>
                        <Field name="receiver.name" placeholder="Contact Person Name" />
                      </div>
                      {/* <div className="field-wrapper">
                        <label>Name</label>
                        <Select
                          className="react-select-container"
                          classNamePrefix="react-select"
                          options={customers.map(customer => ({
                            value: customer.customerName,
                            label: customer.customerName,
                            customerData: customer // Keep full customer data
                          }))}
                          value={values.selectedCustomer}
                          onChange={(selectedOption) => {
                            if (selectedOption) {
                              const selectedCustomer = selectedOption.customerData;
                              // Set receiver details
                              setFieldValue("receiver.name", selectedCustomer.customerName);
                              setFieldValue("receiver.gstin", selectedCustomer.gstNumber);
                              setFieldValue("receiver.address", selectedCustomer.address);
                              setFieldValue("receiver.contact", selectedCustomer.contactNumber);
                              setFieldValue("receiver.email", selectedCustomer.email);
                              // Also set consignee details to be same as receiver
                              setFieldValue("consignee.name", selectedCustomer.customerName);
                              setFieldValue("consignee.gstin", selectedCustomer.gstNumber);
                              setFieldValue("consignee.address", selectedCustomer.address);
                              setFieldValue("consignee.contact", selectedCustomer.contactNumber);
                              setFieldValue("consignee.email", selectedCustomer.email);

                              // Update GST type based on receiver's GSTIN
                              const isIntraState = selectedCustomer.gstNumber && selectedCustomer.gstNumber.startsWith("24");
                              setGstType(isIntraState ? "intra" : "inter");
                            }
                          }}
                          placeholder="Select Customer"
                          isSearchable={true}
                          noOptionsMessage={() => "No customers found"}
                        />
                      </div> */}
                      <div className="field-wrapper" >
                        <label>GSTIN</label>
                        <Field name="receiver.gstin" readOnly />
                      </div>
                      <div className="field-wrapper">
                        <label>Contact</label>
                        <Field name="receiver.contact" readOnly />
                      </div>
                      <div className="field-wrapper">
                        <label>Email</label>
                        <Field name="receiver.email" type="email" readOnly />
                      </div>
                    </div>
                    <div className="form-group">
                      <Field name="receiver.address" as="textarea" placeholder="Receiver Address" readOnly />
                      <div className="address-details-row">
                        <Field name="receiver.city" placeholder="City" readOnly />
                        <Field name="receiver.pincode" placeholder="Pincode" readOnly />
                      </div>
                    </div>

                    <h3>Consignee (Shipped To)</h3>
                    <div className="form-group-row">
                      <div className="field-wrapper">
                        <label>Name</label>
                        <Field name="consignee.name" />
                      </div>
                      <div className="field-wrapper">
                        <label>GSTIN</label>
                        <Field name="consignee.gstin" />
                      </div>
                      <div className="field-wrapper">
                        <label>Contact</label>
                        <Field name="consignee.contact" />
                      </div>
                      <div className="field-wrapper">
                        <label>Email</label>
                        <Field name="consignee.email" type="email" />
                      </div>
                    </div>
                    <div className="form-group">
                      <Field name="consignee.address" as="textarea" placeholder="Consignee Address" />
                      <div className="address-details-row">
                        <Field name="consignee.city" placeholder="City" />
                        <Field name="consignee.pincode" placeholder="Pincode" />
                      </div>
                    </div>

                    <h3>Products Details</h3>
                    <FieldArray name="items">
                      {({ push, remove }) => (
                        <div className="form-items">
                          {values.items.map((item, index) => (
                            <div className="item-row" key={index}>
                              <Field name={`items.${index}.name`} placeholder="Item Name" readOnly />
                              <Field name={`items.${index}.description`} placeholder="Description" readOnly />
                              <Field name={`items.${index}.hsn`} placeholder="HSN Code" readOnly />
                              <div className="quantity-field sales-quantity">
                                <Field
                                  name={`items.${index}.quantity`}
                                  type="number"
                                  step="0.01" // Allow decimal values
                                  placeholder="Qty"
                                  max={item._remainingQty}
                                  onInput={(e) => {
                                    if (item._remainingQty !== undefined &&
                                      e.target.value > item._remainingQty) {
                                      e.target.value = item._remainingQty;
                                      toast.warn(`Maximum quantity is ${item._remainingQty}`);
                                    }
                                  }}
                                />
                                {item._remainingQty !== undefined && (
                                  <div className="quantity-hint">(max: {item._remainingQty})</div>
                                )}
                              </div>
                              <Field name={`items.${index}.unitPrice`} type="number" placeholder="Unit Price" />
                              <Field name={`items.${index}.units`} placeholder="Units" readOnly />
                              <button type="button" className="remove-btn" onClick={() => remove(index)}>
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </FieldArray>

                    <h3>Transport Details</h3>
                    <div className="form-group-row">
                      <div className="field-wrapper">
                        <label>LR Number <span className="required">*</span></label>
                        <Field name="lrNumber" />
                        <ErrorMessage name="lrNumber" component="div" className="error-message" />
                      </div>
                      <div className="field-wrapper">
                        <label>LR Date <span className="required">*</span></label>
                        <Field name="lrDate" type="date" />
                        <ErrorMessage name="lrDate" component="div" className="error-message" />
                      </div>
                      <div className="field-wrapper">
                        <label>Vehicle Number <span className="required">*</span></label>
                        <Field name="vehicleNumber" placeholder="Vehicle Number" />
                        <ErrorMessage name="vehicleNumber" component="div" className="error-message" />
                      </div>
                      <div className="field-wrapper">
                        <label>Transporter <span className="required">*</span></label>
                        <Field name="transporter" />
                        <ErrorMessage name="transporter" component="div" className="error-message" />
                      </div>
                      <div className="field-wrapper">
                        <label>Mobile <span className="required">*</span></label>
                        <Field name="transportMobile" />
                        <ErrorMessage name="transportMobile" component="div" className="error-message" />
                      </div>
                    </div>

                    {/* Commented out other charges as requested */}
                    {/* <div className="field-wrapper other-charge">
                      <label>Other Charges</label>
                      <Field name="otherCharges" type="number" />
                    </div> */}

                    {/* Add this section before the totals */}
                    <h3>Additional Information</h3>
                    <div className="form-group">
                      <Field name="extraNote" as="textarea" rows="3" placeholder="Any additional notes or instructions" />
                    </div>

                    <h3>Tax Information</h3>
                    <div className="form-group-row">
                      <div className="field-wrapper">
                        <label>Tax Slab <span className="required">*</span></label>
                        <Field
                          as="select"
                          name="taxSlab"
                          onChange={(e) => setFieldValue("taxSlab", Number(e.target.value))}
                        >
                          <option value="">Select Tax Slab</option>
                          {TAX_SLABS.map((slab) => (
                            <option key={slab.value} value={slab.value}>
                              {slab.label}
                            </option>
                          ))}
                        </Field>
                        <ErrorMessage name="taxSlab" component="div" className="error-message" />
                      </div>
                    </div>

                    <h3>Additional Charges</h3>
                    <div className="form-group-row">
                      {/* <div className="field-wrapper">
                        <label>Packet Forwarding %</label>
                        <Field
                          name="packetForwardingPercent"
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0-100%"
                          onInput={(e) => {
                            const value = parseInt(e.target.value);
                            if (isNaN(value)) return;
                            if (value > 100) {
                              e.target.value = 100;
                              setFieldValue("packetForwardingPercent", 100);
                            }
                          }}
                        />
                      </div>
                      <div className="field-wrapper">
                        <label>Freight %</label>
                        <Field
                          name="freightPercent"
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0-100%"
                          onInput={(e) => {
                            const value = parseInt(e.target.value);
                            if (isNaN(value)) return;
                            if (value > 100) {
                              e.target.value = 100;
                              setFieldValue("freightPercent", 100);
                            }
                          }}
                        />
                      </div>
                      <div className="field-wrapper">
                        <label>Inspection %</label>
                        <Field
                          name="inspectionPercent"
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0-100%"
                          onInput={(e) => {
                            const value = parseInt(e.target.value);
                            if (isNaN(value)) return;
                            if (value > 100) {
                              e.target.value = 100;
                              setFieldValue("inspectionPercent", 100);
                            }
                          }}
                        />
                      </div> */}
                      <div className="field-wrapper">
                        <label>TCS %</label> {/* Added TCS */}
                        <Field
                          name="tcsPercent"
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0-100%"
                          onInput={(e) => {
                            const value = parseInt(e.target.value);
                            if (isNaN(value)) return;
                            if (value > 100) {
                              e.target.value = 100;
                              setFieldValue("tcsPercent", 100);
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="terms-checkbox">
                      <label>
                        <Field type="checkbox" name="includeTerms" />
                        Include Standard Terms & Conditions
                      </label>
                    </div>

                    {/* Add this after the Consignee section and before Transport Details */}
                    {/* <h3>e-Way Bill Details</h3>  */}
                    {/* <div className="form-group-row">
                      <div className="field-wrapper">
                        <label>Supply Type</label>
                        <Field as="select" name="ewayBill.supplyType" type= "hidden">
                          {SUPPLY_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </Field>
                      </div>

                      <div className="field-wrapper">
                        <label>Sub Supply Type</label>
                        <Field as="select" name="ewayBill.subSupplyType">
                          {SUB_SUPPLY_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </Field>
                      </div>

                      <div className="field-wrapper">
                        <label>Transport Type</label>
                        <Field as="select" name="ewayBill.transType">
                          {TRANS_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </Field>
                      </div>
                    </div> */}

                    <div className="totals">
                      <p>Subtotal: ₹{totals.subtotal.toFixed(2)}</p>

                      {/* GST calculations */}
                      {gstType === "intra" ? (
                        <>
                          <p>CGST ({values.taxSlab / 2}%): ₹{totals.cgst.toFixed(2)}</p>
                          <p>SGST ({values.taxSlab / 2}%): ₹{totals.sgst.toFixed(2)}</p>
                        </>
                      ) : (
                        <p>IGST ({values.taxSlab}%): ₹{totals.igst.toFixed(2)}</p>
                      )}

                      {/* Only show TCS if it has a value */}
                      {values.tcsPercent > 0 && (
                        <p>TCS: {values.tcsPercent}% - ₹{totals.tcs.toFixed(2)}</p>
                      )}

                      <p>Total: ₹{totals.total.toFixed(2)}</p>
                    </div>

                    <div className="submit-btn-container">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={isSubmitting ? "submitting" : "submit-btn"}
                      >
                        {isSubmitting ? "Submitting..." : "Submit Invoice"}
                      </button>
                    </div>
                  </Form>
                );
              }}
            </Formik>
          </div>
        )}

        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Date</th>
                <th>Company Name</th>
                <th>Receiver</th>
                <th>Total</th>
                {/* <th>Upload</th>  */}
              </tr>
            </thead>
            <tbody>
              {showLoader ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="table-loader"></div>
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((invoice) => (
                  <tr
                    key={invoice.invoiceNumber}
                    onClick={() => setSelectedInvoice(invoice)}
                    className={selectedInvoice?.invoiceNumber === invoice.invoiceNumber ? "selected" : ""}
                  >
                    <td>{invoice.invoiceNumber}</td>
                    <td>{invoice.invoiceDate}</td>
                    <td>{invoice.receiver.companyName}</td>
                    <td>{invoice.receiver.name}</td>
                    <td>₹{invoice.total.toFixed(2)}</td>
                    {/* <td onClick={(e) => e.stopPropagation()}>
                      <div className="upload-cell">
                        {uploadingFiles[invoice.invoiceNumber] ? (
                          <div className="uploading-spinner">
                            <FaSpinner className="spinner" />
                          </div>
                        ) : invoice.imageUrl ? (
                          <div className="upload-status">
                            <span className="upload-check">✓</span>
                          </div>
                        ) : (
                          <>
                            <input
                              type="file"
                              accept="image/*"
                              ref={el => fileInputRefs.current[invoice.invoiceNumber] = el}
                              onChange={(e) => handleFileUpload(invoice, e)}
                              style={{ display: 'none' }}
                              id={`file-upload-${invoice.invoiceNumber}`}
                            />
                            <label
                              htmlFor={`file-upload-${invoice.invoiceNumber}`}
                              className="upload-button"
                            >
                              <FaUpload /> Upload
                            </label>
                          </>
                        )}
                      </div>
                    </td> */}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {hasMoreInvoices && (
            <div className="load-more-container">
              <button className="load-more-btn" onClick={loadMoreInvoices}>
                Load More
              </button>
            </div>
          )}
        </div>

        <div style={{ display: "none" }}>
          {selectedInvoice && <SalesPrint invoice={selectedInvoice} qrCodeUrl={qrCodeUrl || selectedInvoice.pdfUrl} taxSlab={selectedInvoice.taxSlab} />}        </div>

        {selectedInvoice && (
          <InvoiceModal
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
            onExport={handleExportPDF}
            onUpdate={handleUpdateInvoice}
            onDelete={handleDeleteInvoice}
          />
        )}
      </div>
    </Navbar>
  );
};

export default Sales;