import React, { useState, useEffect, useRef, useMemo } from "react";
import { Formik, Form, Field, FieldArray, ErrorMessage } from "formik";
import * as Yup from "yup";
import html2pdf from "html2pdf.js";
import { toast, ToastContainer } from "react-toastify";
import { FaPlus, FaFileExport, FaFileExcel, FaSearch, FaFileCode, FaUpload, FaSpinner } from "react-icons/fa";
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
    transportMobile: Yup.string().required("Transporter Mobile is required"),

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
          .test(
            'max-qty',
            function (value) {
              const path = this.path;
              const itemIndex = path.split('.')[1];
              const currentItem = this.parent;
              if (currentItem._remainingQty !== undefined) {
                return value <= currentItem._remainingQty;
              }
              return true;
            }
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

  const calculateTotals = (items, otherCharges = 0, receiverGST = "", percentages = {}, taxSlab = 18) => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    // Calculate additional charges (Packet Forwarding, Freight, Inspection)
    const additionalCharges = {
      packetForwarding: percentages.packetForwardingPercent ? (subtotal * percentages.packetForwardingPercent) / 100 : 0,
      freight: percentages.freightPercent ? (subtotal * percentages.freightPercent) / 100 : 0,
      inspection: percentages.inspectionPercent ? (subtotal * percentages.inspectionPercent) / 100 : 0,
    };

    // Calculate taxable amount (subtotal + additional charges)
    const taxableAmount = subtotal +
      additionalCharges.packetForwarding +
      additionalCharges.freight +
      additionalCharges.inspection;

    const isIntraState = typeof receiverGST === 'string' && receiverGST.startsWith("24");

    // Calculate GST based on selected tax slab
    const taxRate = taxSlab;
    const cgst = isIntraState ? +(taxableAmount * (taxRate / 2 / 100)).toFixed(2) : 0;
    const sgst = isIntraState ? +(taxableAmount * (taxRate / 2 / 100)).toFixed(2) : 0;
    const igst = !isIntraState ? +(taxableAmount * (taxRate / 100)).toFixed(2) : 0;

    // Calculate total before TCS (taxable amount + GST)
    const totalBeforeTCS = +(taxableAmount + cgst + sgst + igst).toFixed(2);

    // Calculate TCS on the total amount including GST
    const tcs = percentages.tcsPercent ? +(totalBeforeTCS * percentages.tcsPercent / 100).toFixed(2) : 0;

    // Final total including TCS
    const total = +(totalBeforeTCS + tcs).toFixed(2);

    return {
      subtotal,
      additionalCharges,
      packetForwarding: additionalCharges.packetForwarding,
      freight: additionalCharges.freight,
      inspection: additionalCharges.inspection,
      tcs,
      taxableAmount,
      cgst,
      sgst,
      igst,
      total,
      packetForwardingPercent: percentages.packetForwardingPercent,
      freightPercent: percentages.freightPercent,
      inspectionPercent: percentages.inspectionPercent,
      tcsPercent: percentages.tcsPercent,
      isIntraState,
      taxSlab
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

    // 2. Extra charges
    const additionalCharges = {
      packetForwarding: invoice.packetForwardingPercent ? (subtotal * invoice.packetForwardingPercent) / 100 : 0,
      freight: invoice.freightPercent ? (subtotal * invoice.freightPercent) / 100 : 0,
      inspection: invoice.inspectionPercent ? (subtotal * invoice.inspectionPercent) / 100 : 0,
    };
    const totalCharges = additionalCharges.packetForwarding + additionalCharges.freight + additionalCharges.inspection;

    // 3. GST calculation (on subtotal only)
    const isIntraState = invoice.receiver.gstin && invoice.receiver.gstin.startsWith("24");
    const taxRate = invoice.taxSlab;

    const cgst = isIntraState ? +(subtotal * (taxRate / 2 / 100)).toFixed(2) : 0;
    const sgst = isIntraState ? +(subtotal * (taxRate / 2 / 100)).toFixed(2) : 0;
    const igst = !isIntraState ? +(subtotal * (taxRate / 100)).toFixed(2) : 0;

    // 4. TCS (on subtotal + GST)
    const baseWithGST = subtotal + cgst + sgst + igst;
    const tcs = invoice.tcsPercent ? +(baseWithGST * invoice.tcsPercent / 100).toFixed(2) : 0;

    // 5. Other charges = additional charges + TCS
    const othChrg = +(totalCharges + tcs).toFixed(2);

    // 6. Final total
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

    // 8. Invoice totals
    const valDtls = {
      "AssVal": +subtotal.toFixed(2),  // ✅ only subtotal
      "IgstVal": igst,
      "CgstVal": cgst,
      "SgstVal": sgst,
      "Discount": 0,
      "OthChrg": othChrg,              // ✅ charges + TCS
      "TotInvVal": total
    };

    // 9. Return JSON
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
        0,
        values.receiver.gstin || "", // Ensure this is a string
        {
          packetForwardingPercent: values.packetForwardingPercent,
          freightPercent: values.freightPercent,
          inspectionPercent: values.inspectionPercent,
          tcsPercent: values.tcsPercent
        },
        values.taxSlab
      );

      // Commented out other charges as requested
      // const totalOtherCharges = numericOtherCharges +
      //   totals.packetForwarding +
      //   totals.freight +
      //   totals.inspection;

      const totalOtherCharges = totals.packetForwarding +
        totals.freight +
        totals.inspection +
        totals.tcs; // Added TCS

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
          igstRate: isIntraState ? 0 : 18,
          cessRate: 0,
          cessNonAdvol: 0
        })),

        // From totals
        totalValue: totals.subtotal,
        cgstValue: totals.cgst,
        sgstValue: totals.sgst,
        igstValue: totals.igst,
        totInvValue: totals.total,
        OthValue: totalOtherCharges,
        TotNonAdvolVal: 0,
        mainHsnCode: mainHsnItem.hsn
      };

      const newInvoice = {
        ...values,
        // otherCharges: numericOtherCharges, // Commented out
        ...totals,
        terms: values.includeTerms ? TERMS_CONDITIONS : "",
        extraNote: values.extraNote,
        ewayBill: ewayBillData,
        packetForwarding: totals.additionalCharges.packetForwarding,
        freight: totals.additionalCharges.freight,
        inspection: totals.additionalCharges.inspection,
        tcs: totals.additionalCharges.tcs // Added TCS
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
          margin: [25, 10, 5, 10],
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
    if (invoices.length === 0) {
      toast.warn("No invoices to export");
      return;
    }

    const data = invoices.map(invoice => ({
      'Invoice No': invoice.invoiceNumber,
      'Date': invoice.invoiceDate,
      'Receiver': invoice.receiver.name,
      'Total': invoice.total?.toFixed(2),
      'PO Number': invoice.poNumber,
      'Consignee': invoice.consignee.name,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");
    XLSX.writeFile(workbook, "Invoices.xlsx");
    toast.success("Exported all invoices to Excel");
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

      // 2. Upload file to S3
      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type,
        },
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



  const InvoiceModal = ({ invoice, onClose, onExport }) => {
    useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'auto';
      };
    }, []);

    // const handleExportJSON = () => {
    //   if (!invoice) return;

    //   const ewayData = {
    //     version: "1.0.0621",
    //     billLists: [{
    //       userGstin: "24AAAFF2996A1ZS",
    //       supplyType: invoice.ewayBill.supplyType,
    //       subSupplyType: invoice.ewayBill.subSupplyType,
    //       subSupplyDesc: "",
    //       docType: "INV",
    //       docNo: invoice.invoiceNumber,
    //       docDate: formatDate(invoice.invoiceDate),
    //       transType: invoice.ewayBill.transType,
    //       fromGstin: invoice.ewayBill.fromGstin,
    //       fromTrdName: invoice.ewayBill.fromTrdName,
    //       fromAddr1: invoice.ewayBill.fromAddr1,
    //       fromAddr2: invoice.ewayBill.fromAddr2 || "",
    //       fromPlace: invoice.ewayBill.fromPlace,
    //       fromPincode: parseInt(invoice.ewayBill.fromPincode),
    //       fromStateCode: invoice.ewayBill.fromStateCode,
    //       actualFromStateCode: invoice.ewayBill.actualFromStateCode,
    //       toGstin: invoice.ewayBill.toGstin,
    //       toTrdName: invoice.ewayBill.toTrdName,
    //       toAddr1: invoice.ewayBill.toAddr1,
    //       toAddr2: invoice.ewayBill.toAddr2 || "",
    //       toPlace: invoice.ewayBill.toPlace,
    //       toPincode: parseInt(invoice.ewayBill.toPincode),
    //       toStateCode: invoice.ewayBill.toStateCode,
    //       actualToStateCode: invoice.ewayBill.actualToStateCode,
    //       totalValue: invoice.subtotal,
    //       cgstValue: invoice.cgst || 0,
    //       sgstValue: invoice.sgst || 0,
    //       igstValue: invoice.igst || 0,
    //       cessValue: 0,
    //       TotNonAdvolVal: 0,
    //       OthValue: (invoice.packetForwarding || 0) +
    //         (invoice.freight || 0) +
    //         (invoice.inspection || 0) +
    //         (invoice.tcs || 0), // Added TCS
    //       totInvValue: invoice.total,
    //       transMode: invoice.ewayBill.transMode || 1,
    //       transDistance: invoice.ewayBill.transDistance,
    //       transporterName: invoice.transporter || "",
    //       transporterId: "",
    //       transDocNo: invoice.lrNumber || "",
    //       transDocDate: invoice.lrDate ? formatDate(invoice.lrDate) : "",
    //       vehicleNo: invoice.vehicleNumber || "",
    //       vehicleType: "R",
    //       mainHsnCode: invoice.ewayBill.mainHsnCode,
    //       itemList: invoice.ewayBill.itemList.map(item => ({
    //         itemNo: item.itemNo,
    //         productName: item.productName,
    //         productDesc: item.productDesc || "",
    //         hsnCode: item.hsnCode,
    //         quantity: item.quantity,
    //         qtyUnit: item.qtyUnit,
    //         taxableAmount: item.taxableAmount,
    //         sgstRate: item.sgstRate,
    //         cgstRate: item.cgstRate,
    //         igstRate: item.igstRate,
    //         cessRate: 0,
    //         cessNonAdvol: 0
    //       }))
    //     }]
    //   };

    //   // Create and trigger download
    //   const blob = new Blob([JSON.stringify(ewayData, null, 2)], { type: 'application/json' });
    //   const url = URL.createObjectURL(blob);
    //   const a = document.createElement('a');
    //   a.href = url;
    //   a.download = `eWayBill_${invoice.invoiceNumber}.json`;
    //   document.body.appendChild(a);
    //   a.click();
    //   document.body.removeChild(a);
    //   URL.revokeObjectURL(url);
    // };



    // Helper function to format date as DD/MM/YYYY



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
      packetForwarding: invoice.packetForwardingPercent ?
        (invoice.subtotal * invoice.packetForwardingPercent) / 100 : 0,
      freight: invoice.freightPercent ?
        (invoice.subtotal * invoice.freightPercent) / 100 : 0,
      inspection: invoice.inspectionPercent ?
        (invoice.subtotal * invoice.inspectionPercent) / 100 : 0,
      tcs: invoice.tcsPercent ? // Added TCS
        (invoice.subtotal * invoice.tcsPercent) / 100 : 0
    };

    const isIntraState = invoice.receiver.gstin?.startsWith("24");

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">Tax Invoice: {invoice.invoiceNumber}</div>
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
                <span className="detail-label">Date:</span>
                <span className="detail-value">{invoice.invoiceDate}</span>
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
                  <span className="detail-value">{invoice.poNumber}</span>
                </div>
              )}
              {invoice.poDate && (
                <div className="detail-row">
                  <span className="detail-label">PO Date:</span>
                  <span className="detail-value">{invoice.poDate}</span>
                </div>
              )}

              {/* Receiver Details */}
              <div className="section-header">Receiver Details (Billed To)</div>
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
              <div className="section-header">Items</div>
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

              {/* Transport Details */}
              <div className="section-header">Transport Details</div>
              <div className="detail-row">
                <span className="detail-label">LR Number:</span>
                <span className="detail-value">{invoice.lrNumber || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">LR Date:</span>
                <span className="detail-value">{invoice.lrDate || 'N/A'}</span>
              </div>
              {/* New Vehicle Number Field */}
              {invoice.vehicleNumber && (
                <div className="detail-row">
                  <span className="detail-label">Vehicle Number:</span>
                  <span className="detail-value">{invoice.vehicleNumber}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Transporter:</span>
                <span className="detail-value">{invoice.transporter || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Mobile:</span>
                <span className="detail-value">{invoice.transportMobile || 'N/A'}</span>
              </div>

              {invoice.extraNote && (
                <>
                  <div className="section-header">Additional Notes</div>
                  <div className="detail-row">
                    <span className="detail-value">{invoice.extraNote}</span>
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

              {/* Totals Section */}
              <div className="section-header">Invoice Summary</div>
              <div className="totals-section">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>₹{totals.subtotal.toFixed(2)}</span>
                </div>

                {/* Additional Charges - Only show if > 0 */}
                {totals.packetForwarding > 0 && (
                  <div className="total-row">
                    <span>Packet Forwarding ({invoice.packetForwardingPercent}%):</span>
                    <span>₹{totals.packetForwarding.toFixed(2)}</span>
                  </div>
                )}
                {totals.freight > 0 && (
                  <div className="total-row">
                    <span>Freight ({invoice.freightPercent}%):</span>
                    <span>₹{totals.freight.toFixed(2)}</span>
                  </div>
                )}
                {totals.inspection > 0 && (
                  <div className="total-row">
                    <span>Inspection ({invoice.inspectionPercent}%):</span>
                    <span>₹{totals.inspection.toFixed(2)}</span>
                  </div>
                )}
                {totals.tcs > 0 && ( // Added TCS
                  <div className="total-row">
                    <span>TCS ({invoice.tcsPercent}%):</span>
                    <span>₹{totals.tcs.toFixed(2)}</span>
                  </div>
                )}

                {/* GST calculations */}
                {isIntraState ? (
                  <>
                    <div className="total-row">
                      <span>CGST ({invoice.taxSlab / 2}%):</span>
                      <span>₹{totals.cgst.toFixed(2)}</span>
                    </div>
                    <div className="total-row">
                      <span>SGST ({invoice.taxSlab / 2}%):</span>
                      <span>₹{totals.sgst.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="total-row">
                    <span>IGST ({invoice.taxSlab}%):</span>
                    <span>₹{totals.igst.toFixed(2)}</span>
                  </div>
                )}
                {/* Commented out other charges as requested */}
                {/* {invoice.otherCharges > 0 && (
                  <div className="total-row">
                    <span>Other Charges:</span>
                    <span>₹{invoice.otherCharges.toFixed(2)}</span>
                  </div>
                )} */}
                <div className="total-row grand-total">
                  <span>Total:</span>
                  <span>₹{totals.total.toFixed(2)}</span>
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
          </div>
        </div>
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
            <div className="page-actions">
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
                  0,
                  // values.otherCharges, // Commented out
                  values.receiver.gstin,
                  {
                    packetForwardingPercent: values.packetForwardingPercent,
                    freightPercent: values.freightPercent,
                    inspectionPercent: values.inspectionPercent,
                    tcsPercent: values.tcsPercent // Added TCS
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

                    <h3>Item Details</h3>
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
                                  placeholder="Qty"
                                  max={item._remainingQty} // Add max attribute
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
                      <div className="field-wrapper">
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
                      </div>
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
                    <h3>e-Way Bill Details</h3>
                    <div className="form-group-row">
                      <div className="field-wrapper">
                        <label>Supply Type</label>
                        <Field as="select" name="ewayBill.supplyType">
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
                    </div>

                    <div className="totals">
                      <p>Subtotal: ₹{totals.subtotal.toFixed(2)}</p>

                      {/* Only show charges that have values */}
                      {values.packetForwardingPercent > 0 && (
                        <p>Packet Forwarding: {values.packetForwardingPercent}% - ₹{totals.packetForwarding.toFixed(2)}</p>
                      )}
                      {values.freightPercent > 0 && (
                        <p>Freight: {values.freightPercent}% - ₹{totals.freight.toFixed(2)}</p>
                      )}
                      {values.inspectionPercent > 0 && (
                        <p>Inspection: {values.inspectionPercent}% - ₹{totals.inspection.toFixed(2)}</p>
                      )}
                      {values.tcsPercent > 0 && ( // Added TCS
                        <p>TCS: {values.tcsPercent}% - ₹{totals.tcs.toFixed(2)}</p>
                      )}

                      {/* GST calculations */}
                      {gstType === "intra" ? (
                        <>
                          <p>CGST ({values.taxSlab / 2}%): ₹{totals.cgst.toFixed(2)}</p>
                          <p>SGST ({values.taxSlab / 2}%): ₹{totals.sgst.toFixed(2)}</p>
                        </>
                      ) : (
                        <p>IGST ({values.taxSlab}%): ₹{totals.igst.toFixed(2)}</p>
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
                <th>Upload</th> {/* New column for uploads */}
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
                filteredInvoices.map((invoice) => (
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
                    <td onClick={(e) => e.stopPropagation()}>
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: "none" }}>
          {selectedInvoice && <SalesPrint invoice={selectedInvoice} qrCodeUrl={qrCodeUrl || selectedInvoice.pdfUrl} taxSlab={selectedInvoice.taxSlab} />}        </div>

        {selectedInvoice && (
          <InvoiceModal
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
            onExport={handleExportPDF}
          />
        )}
      </div>
    </Navbar>
  );
};

export default Sales;