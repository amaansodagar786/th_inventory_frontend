import React, { useState, useEffect, useRef, useMemo } from "react";
import { Formik, Form, Field, FieldArray, ErrorMessage } from "formik";
import * as Yup from "yup";
import html2pdf from "html2pdf.js";
import { toast, ToastContainer } from "react-toastify";
import { FaPlus, FaFileExport, FaFileExcel, FaSearch, FaFileCode } from "react-icons/fa";
import Navbar from "../../Components/Sidebar/Navbar";
import SalesPrint from "./SalesPrint";
import "react-toastify/dist/ReactToastify.css";
import "./Sales.scss";
import axios from "axios";
import * as XLSX from 'xlsx';
import Select from 'react-select';


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
    otherCharges: 0,
    extraNote: "", // Add this
    includeTerms: false,
    selectedCustomer: null,
    packetForwardingPercent: 0,
    freightPercent: 0,
    inspectionPercent: 0,

    ewayBill: {
      supplyType: "O",
      subSupplyType: 1,
      transType: 1,
      transDistance: 0,
      // Other fields will be auto-populated
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
        const matchingCustomer = customers.find(c =>
          c.customerName === selectedWO.receiver.name
        );

        // Set the selected customer for the dropdown
        setFieldValue("selectedCustomer", matchingCustomer ? {
          value: matchingCustomer.customerName,
          label: matchingCustomer.customerName,
          customerData: matchingCustomer
        } : null);

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


      }
    } catch (error) {
      console.error("Work order selection error:", error);
      toast.error("Failed to load work order details");
    }
  };

  const calculateTotals = (items, otherCharges = 0, receiverGST = "", percentages = {}) => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    // Calculate additional charges
    const additionalCharges = {
      packetForwarding: percentages.packetForwardingPercent ? (subtotal * percentages.packetForwardingPercent) / 100 : 0,
      freight: percentages.freightPercent ? (subtotal * percentages.freightPercent) / 100 : 0,
      inspection: percentages.inspectionPercent ? (subtotal * percentages.inspectionPercent) / 100 : 0
    };

    const taxableAmount = subtotal +
      additionalCharges.packetForwarding +
      additionalCharges.freight +
      additionalCharges.inspection;

    // Fix: Properly check if receiver is from Gujarat (state code 24)
    const isIntraState = receiverGST && receiverGST.startsWith("24");

    const cgst = isIntraState ? +(taxableAmount * 0.09).toFixed(2) : 0;
    const sgst = isIntraState ? +(taxableAmount * 0.09).toFixed(2) : 0;
    const igst = !isIntraState ? +(taxableAmount * 0.18).toFixed(2) : 0;

    const total = +(taxableAmount + cgst + sgst + igst + Number(otherCharges || 0)).toFixed(2);

    return {
      subtotal,
      additionalCharges,
      packetForwarding: additionalCharges.packetForwarding,
      freight: additionalCharges.freight,
      inspection: additionalCharges.inspection,
      taxableAmount,
      cgst,
      sgst,
      igst,
      total,
      packetForwardingPercent: percentages.packetForwardingPercent,
      freightPercent: percentages.freightPercent,
      inspectionPercent: percentages.inspectionPercent,
      isIntraState // Add this to use in the form display
    };
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
      const numericOtherCharges = Number(values.otherCharges || 0);
      const totals = calculateTotals(
        values.items,
        values.otherCharges,
        values.receiver.gstin,
        {
          packetForwardingPercent: values.packetForwardingPercent,
          freightPercent: values.freightPercent,
          inspectionPercent: values.inspectionPercent
        }
      );

      const totalOtherCharges = numericOtherCharges +
        totals.packetForwarding +
        totals.freight +
        totals.inspection;

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
          sgstRate: isIntraState ? 9 : 0,
          cgstRate: isIntraState ? 9 : 0,
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
        ...values, otherCharges: numericOtherCharges, ...totals,
        terms: values.includeTerms ? TERMS_CONDITIONS : "",
        ewayBill: ewayBillData,
        packetForwarding: totals.additionalCharges.packetForwarding,
        freight: totals.additionalCharges.freight,
        inspection: totals.additionalCharges.inspection
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
      let pdfUrl = selectedInvoice.pdfUrl;

      // If PDF already exists, use its URL for QR
      if (pdfUrl) {
        setQRCodeUrl(pdfUrl);
        setTimeout(() => {
          _exportPDFWithQR(pdfUrl);
          setIsExporting(false);
        }, 500);
        return;
      }

      // 1. First generate PDF without QR
      setQRCodeUrl("");
      setTimeout(async () => {
        try {
          const element = document.getElementById("sales-pdf");
          const pdfBlob = await html2pdf().from(element)
            .set({
              margin: 0,
              filename: `${selectedInvoice.invoiceNumber}_${selectedInvoice.receiver.name.replace(/\s+/g, '_')}.pdf`,
              image: { type: "jpeg", quality: 0.98 },
              html2canvas: { scale: 2 },
              jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            })
            .outputPdf("blob");

          // 2. Get S3 presigned URL
          const res = await axios.post(`${import.meta.env.VITE_API_URL}/s3/po-presigned-url`, {
            poNumber: `${selectedInvoice.invoiceNumber}_${selectedInvoice.receiver.name.replace(/\s+/g, '_')}`,
          });

          // 3. Upload to S3
          await fetch(res.data.uploadUrl, {
            method: "PUT",
            body: pdfBlob,
            headers: { "Content-Type": "application/pdf" },
          });

          // 4. Update sales record with PDF URL
          await axios.put(`${import.meta.env.VITE_API_URL}/sales/update-sale/${selectedInvoice.invoiceNumber}`, {
            pdfUrl: res.data.fileUrl,
          });

          // 5. Get updated invoice
          const invoiceRes = await axios.get(`${import.meta.env.VITE_API_URL}/sales/get-sale/${selectedInvoice.invoiceNumber}`);
          pdfUrl = invoiceRes.data.data.pdfUrl;
          setQRCodeUrl(pdfUrl);
          setSelectedInvoice(invoiceRes.data.data);

          // Final export with QR
          setTimeout(() => {
            _exportPDFWithQR(pdfUrl);
            setIsExporting(false);
          }, 500);
        } catch (error) {
          console.error("Export error:", error);
          toast.error("Failed to export PDF");
          setIsExporting(false);
        }
      }, 400);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export PDF");
      setIsExporting(false);
    }
  };

  function _exportPDFWithQR(pdfUrl) {
    const element = document.getElementById("sales-pdf");
    html2pdf().from(element)
      .set({
        margin: 0,
        filename: `${selectedInvoice.invoiceNumber}_${selectedInvoice.receiver.name.replace(/\s+/g, '_')}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .save();
  }

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
  //       fromAddr2: invoice.ewayBill.fromAddr2,
  //       fromPlace: invoice.ewayBill.fromPlace,
  //       fromPincode: parseInt(invoice.ewayBill.fromPincode),
  //       fromStateCode: invoice.ewayBill.fromStateCode,
  //       actualFromStateCode: invoice.ewayBill.actualFromStateCode,
  //       toGstin: invoice.ewayBill.toGstin,
  //       toTrdName: invoice.ewayBill.toTrdName,
  //       toAddr1: invoice.ewayBill.toAddr1,
  //       toAddr2: invoice.ewayBill.toAddr2,
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
  //       OthValue: invoice.otherCharges || 0,
  //       totInvValue: invoice.total,
  //       transMode: invoice.ewayBill.transMode,
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

  // function formatDate(dateString) {
  //   if (!dateString) return "";
  //   const [year, month, day] = dateString.split('-');
  //   return `${day}/${month}/${year}`;
  // }

  // Add this component near the top of your Sales.js file


  const InvoiceModal = ({ invoice, onClose, onExport }) => {
    useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'auto';
      };
    }, []);

    const handleExportJSON = () => {
      if (!invoice) return;

      const ewayData = {
        version: "1.0.0621",
        billLists: [{
          userGstin: "24AAAFF2996A1ZS",
          supplyType: invoice.ewayBill.supplyType,
          subSupplyType: invoice.ewayBill.subSupplyType,
          subSupplyDesc: "",
          docType: "INV",
          docNo: invoice.invoiceNumber,
          docDate: formatDate(invoice.invoiceDate),
          transType: invoice.ewayBill.transType,
          fromGstin: invoice.ewayBill.fromGstin,
          fromTrdName: invoice.ewayBill.fromTrdName,
          fromAddr1: invoice.ewayBill.fromAddr1,
          fromAddr2: invoice.ewayBill.fromAddr2 || "",
          fromPlace: invoice.ewayBill.fromPlace,
          fromPincode: parseInt(invoice.ewayBill.fromPincode),
          fromStateCode: invoice.ewayBill.fromStateCode,
          actualFromStateCode: invoice.ewayBill.actualFromStateCode,
          toGstin: invoice.ewayBill.toGstin,
          toTrdName: invoice.ewayBill.toTrdName,
          toAddr1: invoice.ewayBill.toAddr1,
          toAddr2: invoice.ewayBill.toAddr2 || "",
          toPlace: invoice.ewayBill.toPlace,
          toPincode: parseInt(invoice.ewayBill.toPincode),
          toStateCode: invoice.ewayBill.toStateCode,
          actualToStateCode: invoice.ewayBill.actualToStateCode,
          totalValue: invoice.subtotal,
          cgstValue: invoice.cgst || 0,
          sgstValue: invoice.sgst || 0,
          igstValue: invoice.igst || 0,
          cessValue: 0,
          TotNonAdvolVal: 0,
          OthValue: invoice.otherCharges +
            (invoice.packetForwarding || 0) +
            (invoice.freight || 0) +
            (invoice.inspection || 0),
          totInvValue: invoice.total,
          transMode: invoice.ewayBill.transMode || 1,
          transDistance: invoice.ewayBill.transDistance,
          transporterName: invoice.transporter || "",
          transporterId: "",
          transDocNo: invoice.lrNumber || "",
          transDocDate: invoice.lrDate ? formatDate(invoice.lrDate) : "",
          vehicleNo: invoice.vehicleNumber || "",
          vehicleType: "R",
          mainHsnCode: invoice.ewayBill.mainHsnCode,
          itemList: invoice.ewayBill.itemList.map(item => ({
            itemNo: item.itemNo,
            productName: item.productName,
            productDesc: item.productDesc || "",
            hsnCode: item.hsnCode,
            quantity: item.quantity,
            qtyUnit: item.qtyUnit,
            taxableAmount: item.taxableAmount,
            sgstRate: item.sgstRate,
            cgstRate: item.cgstRate,
            igstRate: item.igstRate,
            cessRate: 0,
            cessNonAdvol: 0
          }))
        }]
      };

      // Create and trigger download
      const blob = new Blob([JSON.stringify(ewayData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eWayBill_${invoice.invoiceNumber}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    // Helper function to format date as DD/MM/YYYY
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
        (invoice.subtotal * invoice.inspectionPercent) / 100 : 0
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

              {/* Bank Details */}
              {/* <div className="section-header">Bank Details</div>
              <div className="detail-row">
                <span className="detail-label">Bank Name:</span>
                <span className="detail-value">{invoice.bank?.name || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Account No:</span>
                <span className="detail-value">{invoice.bank?.account || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Branch:</span>
                <span className="detail-value">{invoice.bank?.branch || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">IFSC:</span>
                <span className="detail-value">{invoice.bank?.ifsc || 'N/A'}</span>
              </div> */}


              {/* {invoice.ewayBill && (
                <>
                  <div className="section-header">e-Way Bill Details</div>
                  <div className="detail-row">
                    <span className="detail-label">Supply Type:</span>
                    <span className="detail-value">
                      {invoice.ewayBill.supplyType === "O" ? "Outward" : "Inward"}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Sub Supply Type:</span>
                    <span className="detail-value">
                      {invoice.ewayBill.subSupplyType === 1 ? "Supply" :
                        invoice.ewayBill.subSupplyType === 3 ? "Export" : "Job Work"}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Transport Type:</span>
                    <span className="detail-value">
                      {invoice.ewayBill.transType === 1 ? "Regular" :
                        invoice.ewayBill.transType === 2 ? "Bill To - Ship To" :
                          invoice.ewayBill.transType === 3 ? "Bill From - Dispatch From" : "Combination"}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Distance (km):</span>
                    <span className="detail-value">{invoice.ewayBill.transDistance}</span>
                  </div>
                </>
              )} */}

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

                {/* GST calculations */}
                {isIntraState ? (
                  <>
                    <div className="total-row">
                      <span>CGST (9%):</span>
                      <span>₹{totals.cgst.toFixed(2)}</span>
                    </div>
                    <div className="total-row">
                      <span>SGST (9%):</span>
                      <span>₹{totals.sgst.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="total-row">
                    <span>IGST (18%):</span>
                    <span>₹{totals.igst.toFixed(2)}</span>
                  </div>
                )}
                {invoice.otherCharges > 0 && (
                  <div className="total-row">
                    <span>Other Charges:</span>
                    <span>₹{invoice.otherCharges.toFixed(2)}</span>
                  </div>
                )}
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
              {/* <button
                className="export-btn"
                onClick={handleExportPDF}
                disabled={isExporting || !selectedInvoice}
              >
                {isExporting ? (
                  <span>Exporting...</span>
                ) : (
                  <>
                    <FaFileExport /> Export
                  </>
                )}
              </button> */}
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
                  values.otherCharges,
                  values.receiver.gstin,
                  {
                    packetForwardingPercent: values.packetForwardingPercent,
                    freightPercent: values.freightPercent,
                    inspectionPercent: values.inspectionPercent
                  }
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
                      {/* <div className="field-wrapper">
                        <label>Invoice Number</label>
                        <Field name="invoiceNumber" readOnly placeholder="Generated After Submission" />
                      </div> */}
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
                            }
                          }}
                          placeholder="Select Customer"
                          isSearchable={true}
                          noOptionsMessage={() => "No customers found"}
                        />
                      </div>
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

                    {/* <h3>Bank Details</h3>
                    <div className="form-group-row">
                      <div className="field-wrapper">
                        <label>Bank Name</label>
                        <Field name="bank.name" />
                      </div>
                      <div className="field-wrapper">
                        <label>Account No</label>
                        <Field name="bank.account" />
                      </div>
                      <div className="field-wrapper">
                        <label>Branch</label>
                        <Field name="bank.branch" />
                      </div>
                      <div className="field-wrapper">
                        <label>IFSC</label>
                        <Field name="bank.ifsc" />
                      </div>
                    </div> */}

                    <div className="field-wrapper other-charge">
                      <label>Other Charges</label>
                      <Field name="otherCharges" type="number" />
                    </div>

                    {/* Add this section before the totals */}
                    <h3>Additional Information</h3>
                    <div className="form-group">
                      <Field name="extraNote" as="textarea" rows="3" placeholder="Any additional notes or instructions" />
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

                      {/* <div className="field-wrapper">
                        <label>Distance (km)</label>
                        <Field
                          name="ewayBill.transDistance"
                          type="number"
                          min="1"
                          required
                        />
                      </div> */}

                    </div>

                    <div className="totals">
                      <p>Subtotal: ₹{totals.subtotal.toFixed(2)}</p>

                      {/* Only show charges that have values */}
                      {values.packetForwardingPercent > 0 && (
                        <p>Packet Forwarding: {values.packetForwardingPercent}% - ₹{totals.additionalCharges.packetForwarding.toFixed(2)}</p>
                      )}
                      {values.freightPercent > 0 && (
                        <p>Freight: {values.freightPercent}% - ₹{totals.additionalCharges.freight.toFixed(2)}</p>
                      )}
                      {values.inspectionPercent > 0 && (
                        <p>Inspection: {values.inspectionPercent}% - ₹{totals.additionalCharges.inspection.toFixed(2)}</p>
                      )}

                      {/* GST calculations */}
                      {gstType === "intra" ? (
                        <>
                          <p>CGST (9%): ₹{totals.cgst.toFixed(2)}</p>
                          <p>SGST (9%): ₹{totals.sgst.toFixed(2)}</p>
                        </>
                      ) : (
                        <p>IGST (18%): ₹{totals.igst.toFixed(2)}</p>
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
                <th>Receiver</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {showLoader ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
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
                    <td>{invoice.receiver.name}</td>
                    <td>₹{invoice.total.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: "none" }}>
          {selectedInvoice && <SalesPrint invoice={selectedInvoice} qrCodeUrl={qrCodeUrl || selectedInvoice.pdfUrl} />}
        </div>

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