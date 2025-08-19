import React, { useState, useEffect, useRef, useMemo } from "react";
import { Formik, Form, Field, FieldArray } from "formik";
import * as Yup from "yup";
import html2pdf from "html2pdf.js";
import { toast, ToastContainer } from "react-toastify";
import { FaPlus, FaFileExport, FaFileExcel, FaSearch, FaTrash } from "react-icons/fa";
import Navbar from "../../Components/Sidebar/Navbar";
import GRNPrint from "./GRNPrint";
import "react-toastify/dist/ReactToastify.css";
import "./GRN.scss";
import axios from "axios";
import * as XLSX from 'xlsx';
import Select from 'react-select';

// const generateGRNNumber = (index) => `GRN2025${String(index + 1).padStart(4, "0")}`; 

const GRN = () => {
  const [grns, setGRNs] = useState(() => {
    const stored = localStorage.getItem("grns");
    return stored ? JSON.parse(stored) : [];
  });
  const [showForm, setShowForm] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [gstType, setGstType] = useState("intra");
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // const [isSearching, setIsSearching] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const loaderTimeoutRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  // Add debounce effect
  useEffect(() => {
    // Clear any pending timeout
    if (loaderTimeoutRef.current) {
      clearTimeout(loaderTimeoutRef.current);
    }

    if (searchTerm.trim()) {
      // Only show loader if search takes more than 300ms
      loaderTimeoutRef.current = setTimeout(() => {
        setShowLoader(true);
      }, 300);

      const searchTimeout = setTimeout(() => {
        // Clear the loader timeout if search completes
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

  // Fetch purchase orders on component mount
  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/po/get-pos`);
        // Sort POs by date (newest first) and then by PO number (descending)
        const sortedPOs = (response.data.data || []).sort((a, b) => {
          const dateDiff = new Date(b.date) - new Date(a.date);
          if (dateDiff !== 0) return dateDiff;
          return b.poNumber.localeCompare(a.poNumber); // Secondary sort by PO number
        });
        setPurchaseOrders(sortedPOs);
      } catch (error) {
        toast.error("Failed to fetch purchase orders");
        setPurchaseOrders([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPurchaseOrders();
  }, []);

  // Fetch GRNs with sorting
  useEffect(() => {
    const fetchGRNs = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/grn/get-grns`);
        // Sort by date (newest first) and then by GRN number (descending)
        const sortedGRNs = (response.data.data || []).sort((a, b) => {
          const dateDiff = new Date(b.grnDate) - new Date(a.grnDate);
          if (dateDiff !== 0) return dateDiff;
          return b.grnNumber.localeCompare(a.grnNumber);
        });
        setGRNs(sortedGRNs);
      } catch (error) {
        toast.error("Failed to load GRNs");
      } finally {
        setIsLoading(false);
      }
    };
    fetchGRNs();
  }, []);

  const initialValues = {
    // grnNumber: generateGRNNumber(grns.length), 
    grnNumber: "",
    grnDate: new Date().toISOString().slice(0, 10), // Today's date as default
    poNumber: "",
    poDate: "",
    lrNumber: "",
    transporter: "",
    vehicleNo: "",
    vendorName: "",
    vendorGST: "",
    vendorAddress: "",
    vendorContact: "",
    vendorEmail: "",
    items: [
      {
        name: "",
        description: "",
        hsn: "",
        qty: "",
        rate: "",
        unit: ""
      }
    ],
    comments: "",
    otherCharges: ""
  };

  const validationSchema = Yup.object({
    grnDate: Yup.string().required("GRN Date is required"),
    poNumber: Yup.string().required("PO Number is required"),
    vendorName: Yup.string().required("Vendor Name is required"),
    vendorGST: Yup.string().required("Vendor GST is required"),
    vendorAddress: Yup.string().required("Vendor Address is required"),
    vendorContact: Yup.string().required("Vendor Contact is required"),
    vendorEmail: Yup.string().email("Invalid Email").required("Vendor Email is required"),
    items: Yup.array().of(
      Yup.object({
        name: Yup.string().required("Item Name required"),
        qty: Yup.number()
          .required("Quantity is required")
          .moreThan(0, "Quantity must be greater than 0")
          .test(
            'max-qty',
            function (value) {
              const path = this.path;
              const itemIndex = path.split('.')[1];
              const currentItem = this.parent;

              // If we have _remainingQty, use it for validation
              if (currentItem._remainingQty !== undefined) {
                return value <= currentItem._remainingQty;
              }
              return true;
            }
          ),
        rate: Yup.number().required("Rate is required").moreThan(0, "Min 1")
      })
    )
  });



  const filteredGRNs = useMemo(() => {
    if (!debouncedSearch) return grns;

    return grns.filter(grn => {
      // Check GRN fields
      if (grn.grnNumber?.toLowerCase().includes(debouncedSearch)) return true;
      if (grn.poNumber?.toLowerCase().includes(debouncedSearch)) return true;
      if (grn.lrNumber?.toLowerCase().includes(debouncedSearch)) return true;

      // Check vendor fields
      if (grn.vendorName?.toLowerCase().includes(debouncedSearch)) return true;
      if (grn.vendorGST?.toLowerCase().includes(debouncedSearch)) return true;
      if (grn.vendorAddress?.toLowerCase().includes(debouncedSearch)) return true;
      if (grn.vendorContact?.toLowerCase().includes(debouncedSearch)) return true;
      if (grn.vendorEmail?.toLowerCase().includes(debouncedSearch)) return true;

      // Check items
      if (grn.items?.some(item =>
        item.name?.toLowerCase().includes(debouncedSearch) ||
        item.description?.toLowerCase().includes(debouncedSearch) ||
        item.hsn?.toLowerCase().includes(debouncedSearch)
      )) return true;

      return false;
    });
  }, [debouncedSearch, grns]);




  const handlePOSelect = async (e, setFieldValue) => {
    const selectedPONumber = e.target.value;
    if (!selectedPONumber) return;

    try {
      // 1. Fetch the most recent GRNs for this specific PO
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/grn/get-grns-by-po`, {
        params: {
          poNumber: selectedPONumber,
          _: Date.now() // Cache buster
        },
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      // 2. Find the selected PO
      const selectedPO = purchaseOrders.find(po => po.poNumber === selectedPONumber);
      if (!selectedPO) {
        toast.error("Selected PO not found");
        return;
      }

      // 3. Calculate remaining quantities with robust matching
      const itemsWithRemainingQty = selectedPO.items.map(poItem => {
        // Sum all received quantities across GRNs
        const receivedQty = data.data.reduce((total, grn) => {
          const grnItem = grn.items?.find(i =>
            i.name && poItem.name &&
            i.name.toString().trim().toLowerCase() ===
            poItem.name.toString().trim().toLowerCase()
          );
          return total + (Number(grnItem?.qty) || 0);
        }, 0);

        // Calculate remaining (never negative)
        const remainingQty = Math.max(0, poItem.qty - receivedQty);

        console.log(`Item: ${poItem.name} | Ordered: ${poItem.qty} | Received: ${receivedQty} | Remaining: ${remainingQty}`);

        return {
          ...poItem,
          qty: remainingQty, // Set directly as the form value
          _originalQty: poItem.qty,
          _receivedQty: receivedQty,
          _remainingQty: remainingQty
        };
      });

      // 4. Update all form fields at once
      setFieldValue("poNumber", selectedPO.poNumber);
      setFieldValue("poDate", selectedPO.date);
      setFieldValue("vendorName", selectedPO.vendorName);
      setFieldValue("vendorGST", selectedPO.vendorGST);
      setFieldValue("vendorAddress", selectedPO.vendorAddress);
      setFieldValue("vendorContact", selectedPO.vendorContact);
      setFieldValue("vendorEmail", selectedPO.vendorEmail);
      setGstType(selectedPO.gstType);
      setFieldValue("items", itemsWithRemainingQty);

    } catch (error) {
      console.error("PO selection error:", error);
      toast.error("Failed to load PO details. Please try again.");
    }
  };

  const calculateTotals = (items, otherCharges = 0, vendorGST = "") => {
    const subtotal = items.reduce((sum, item) => sum + item.qty * item.rate, 0);
    const isIntraState = vendorGST.startsWith("24");
    setGstType(isIntraState ? "intra" : "inter");
    const cgst = isIntraState ? +(subtotal * 0.09).toFixed(2) : 0;
    const sgst = isIntraState ? +(subtotal * 0.09).toFixed(2) : 0;
    const igst = !isIntraState ? +(subtotal * 0.18).toFixed(2) : 0;
    const total = +(subtotal + cgst + sgst + igst + Number(otherCharges || 0)).toFixed(2);
    return { subtotal, cgst, sgst, igst, total };
  };

  const handleSubmit = async (values, { resetForm }) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Final quantity validation
    const invalidItems = values.items.filter(item =>
      item._remainingQty !== undefined && item.qty > item._remainingQty
    );

    if (invalidItems.length > 0) {
      invalidItems.forEach(item => {
        toast.error(`Quantity for ${item.name} exceeds remaining PO quantity (Max: ${item._remainingQty})`);
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const numericOtherCharges = Number(values.otherCharges || 0);
      const totals = calculateTotals(values.items, numericOtherCharges, values.vendorGST);
      const newGRN = { ...values, otherCharges: numericOtherCharges, ...totals };

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/grn/create-grn`, newGRN);
      setGRNs(prev => [response.data.data, ...prev]);
      toast.success("GRN saved successfully!");
      setShowForm(false);
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save GRN");
    } finally {
      setIsSubmitting(false);
    }
  };




  const handleExportPDF = () => {
    if (!selectedGRN) return toast.warn("Select a GRN to export");
    const element = document.getElementById("grn-pdf");
    const options = {
      margin: 0,
      filename: `${selectedGRN.grnNumber}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };
    html2pdf().from(element).set(options).save();
  };


  const handleExportExcel = () => {
    if (grns.length === 0) {
      toast.warn("No GRNs to export");
      return;
    }

    // Prepare data for Excel
    const data = grns.map(grn => ({
      'GRN No': grn.grnNumber,
      'Date': grn.grnDate,
      'Vendor': grn.vendorName,
      'PO Number': grn.poNumber,
      'Total': grn.total?.toFixed(2),
      'GST Type': grn.vendorGST?.startsWith('24') ? 'intra' : 'inter',
      'Status': 'Received'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "GRNs");
    XLSX.writeFile(workbook, "GRNs.xlsx");
    toast.success("Exported all GRNs to Excel");
  };

  // Then create a new GRNModal component (add this near the top of your file)
  const GRNModal = ({ grn, onClose, onExport }) => {
    useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'auto';
      };
    }, []);

    if (!grn) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">GRN: {grn.grnNumber}</div>
            <button className="modal-close" onClick={onClose}>
              &times;
            </button>
          </div>

          <div className="modal-body">
            <div className="grn-details-grid">
              {/* Basic GRN Details */}
              <div className="detail-row">
                <span className="detail-label">Date:</span>
                <span className="detail-value">{grn.grnDate}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">PO Number:</span>
                <span className="detail-value">{grn.poNumber}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">PO Date:</span>
                <span className="detail-value">{grn.poDate}</span>
              </div>

              {/* Transport Details */}
              <div className="detail-row">
                <span className="detail-label">LR Number:</span>
                <span className="detail-value">{grn.lrNumber || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Transporter:</span>
                <span className="detail-value">{grn.transporter || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Vehicle No:</span>
                <span className="detail-value">{grn.vehicleNo || 'N/A'}</span>
              </div>

              {/* Vendor Details Section */}
              <div className="section-header">Vendor Details</div>
              <div className="detail-row">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{grn.vendorName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">GSTIN:</span>
                <span className="detail-value">{grn.vendorGST}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Address:</span>
                <span className="detail-value">{grn.vendorAddress}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Contact:</span>
                <span className="detail-value">{grn.vendorContact}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{grn.vendorEmail}</span>
              </div>

              {/* Items Section */}
              <div className="section-header">Items Received</div>
              <div className="items-grid">
                {grn.items.map((item, index) => (
                  <div key={index} className="item-card">
                    <div className="item-header">
                      <span className="item-name">{item.name}</span>
                      <span className="item-hsn">HSN: {item.hsn || 'N/A'}</span>
                    </div>
                    <div className="item-description">{item.description || 'No description'}</div>
                    <div className="item-details">
                      <span>Qty: {item.qty} {item.unit}</span>
                      <span>Rate: ₹{item.rate}</span>
                      <span>Total: ₹{(item.qty * item.rate).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Additional Information */}
              {grn.comments && (
                <div>
                  <div className="section-header">Special Instructions</div>
                  <div className="comments-section">
                    {grn.comments}
                  </div>
                </div>
              )}

              {/* Totals Section */}
              <div className="section-header">Summary</div>
              <div className="totals-section">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>₹{grn.subtotal?.toFixed(2)}</span>
                </div>
                {grn.cgst > 0 && (
                  <div className="total-row">
                    <span>CGST (9%):</span>
                    <span>₹{grn.cgst?.toFixed(2)}</span>
                  </div>
                )}
                {grn.sgst > 0 && (
                  <div className="total-row">
                    <span>SGST (9%):</span>
                    <span>₹{grn.sgst?.toFixed(2)}</span>
                  </div>
                )}
                {grn.igst > 0 && (
                  <div className="total-row">
                    <span>IGST (18%):</span>
                    <span>₹{grn.igst?.toFixed(2)}</span>
                  </div>
                )}
                {grn.otherCharges > 0 && (
                  <div className="total-row">
                    <span>Other Charges:</span>
                    <span>₹{grn.otherCharges?.toFixed(2)}</span>
                  </div>
                )}
                <div className="total-row grand-total">
                  <span>Total:</span>
                  <span>₹{grn.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="export-btn" onClick={onExport}>
              <FaFileExport /> Export as PDF
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
          <h2>Goods Received Notes</h2>
          <div className="right-section">
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search GRNs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="page-actions">
              {/* <button className="export-btn" onClick={handleExportPDF}>
                <FaFileExport /> Export
              </button> */}
              <button className="export-all-btn" onClick={handleExportExcel}>
                <FaFileExcel /> Export All
              </button>
              <button className="add-btn" onClick={() => setShowForm(!showForm)}>
                <FaPlus /> {showForm ? "Close GRN" : "Create GRN"}
              </button>
            </div>
          </div>
        </div>

        {isLoading && <div className="loading">Loading data...</div>}

        {showForm && (
          <div className="form-container premium">
            <h2>Create GRN</h2>
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              validateOnBlur={true}
              validateOnChange={false}

              onSubmit={async (values, formikHelpers) => {
                await handleSubmit(values, formikHelpers);
              }}
            >
              {({ errors, submitCount, values, setFieldValue }) => {
                useEffect(() => {
                  if (submitCount > 0 && Object.keys(errors).length > 0) {
                    Object.entries(errors).slice(0, 3).forEach(([field, error]) => {
                      // If error is for items (array)
                      if (field === "items" && Array.isArray(error)) {
                        error.forEach((itemError, index) => {
                          if (itemError && typeof itemError === "object") {
                            // Loop through each field error inside items
                            Object.entries(itemError).forEach(([key, val]) => {
                              toast.error(`Item ${index + 1} - ${key}: ${val}`);
                            });
                          }
                        });
                      } else {
                        // Normal error
                        toast.error(`${field}: ${error}`);
                      }
                    });
                  }
                }, [submitCount, errors]);


                return (
                  <Form>
                    <div className="form-group-row">
                      {/* <div className="grn-field-wrapper">
                        <label>GRN Number</label>
                        <Field name="grnNumber" readOnly placeholder="Generated after submission" />
                      </div> */}
                      <div className="grn-field-wrapper">
                        <label>GRN Date</label>
                        <Field name="grnDate" type="date" />
                      </div>
                      <div className="grn-field-wrapper">
                        <label>PO Number</label>
                        <Select
                          className="react-select-container"
                          classNamePrefix="react-select"
                          options={purchaseOrders.map(po => ({
                            value: po.poNumber,
                            label: `${po.poNumber} - ${po.vendorName}`,
                            poData: po // Keep full PO data for reference
                          }))}
                          onChange={(selectedOption) => {
                            if (selectedOption) {
                              handlePOSelect(
                                { target: { value: selectedOption.value } },
                                setFieldValue
                              );
                            }
                          }}
                          placeholder="Select PO"
                          isSearchable={true}
                          noOptionsMessage={() => "No POs found"}
                        />
                      </div>
                      <div className="grn-field-wrapper">
                        <label>PO Date</label>
                        <Field name="poDate" readOnly />
                      </div>
                      <div className="grn-field-wrapper">
                        <label>LR Number</label>
                        <Field name="lrNumber" />
                      </div>
                      <div className="grn-field-wrapper">
                        <label>Transporter</label>
                        <Field name="transporter" />
                      </div>
                      <div className="grn-field-wrapper">
                        <label>Vehicle No.</label>
                        <Field name="vehicleNo" />
                      </div>
                    </div>

                    <h3>Vendor Details</h3>
                    <div className="form-group-row">
                      <Field name="vendorName" placeholder="Vendor Name" />
                      <Field name="vendorGST" placeholder="Vendor GSTIN" readOnly />
                      <Field name="vendorContact" placeholder="Vendor Contact " readOnly />
                      <Field name="vendorEmail" type="email" placeholder="Vendor Email" readOnly />
                    </div>
                    <div className="form-group">
                      <Field name="vendorAddress" as="textarea" placeholder="Vendor Address" readOnly />
                    </div>

                    <FieldArray name="items">
                      {({ remove, push }) => (
                        <div className="form-items">
                          {values.items.map((_, index) => (
                            <div className="item-row" key={index}>
                              {/* Sr No - Fixed width */}
                              <Field
                                name={`items.${index}.srNo`}
                                value={index + 1}
                                readOnly
                                className="sr-no-field"
                              />

                              {/* Item Name - Wider */}
                              <Field
                                name={`items.${index}.name`}
                                placeholder="Item"
                                readOnly
                                className="item-name-field"
                              />

                              {/* Description - Medium width */}
                              <Field
                                name={`items.${index}.description`}
                                placeholder="Description"
                                readOnly
                                className="item-desc-field"
                              />

                              {/* Quantity - Narrow */}
                              <div className="quantity-field-container">
                                <Field name={`items.${index}.qty`}
                                placeholder="Quantity">
                                  {({ field, form }) => {
                                    const currentItem = form.values.items[index];
                                    const remainingQty = currentItem?._remainingQty;

                                    return (
                                      <input
                                        {...field}
                                        type="number"
                                        min="0"
                                        max={remainingQty}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          if (remainingQty !== undefined && value > remainingQty) {
                                            form.setFieldValue(field.name, remainingQty);
                                          } else {
                                            field.onChange(e);
                                          }
                                        }}
                                        className="quantity-input"
                                      />
                                    );
                                  }}
                                </Field>
                                {values.items[index]?._remainingQty !== undefined && (
                                  <div className="quantity-hint">(max: {values.items[index]._remainingQty})</div>
                                )}
                              </div>

                              {/* Rate - Narrow */}
                              <Field
                                name={`items.${index}.rate`}
                                type="number"
                                placeholder="Rate"
                                className="rate-field"
                              />

                              {/* Unit - Very Narrow */}
                              <Field
                                name={`items.${index}.unit`}
                                placeholder="Unit"
                                readOnly
                                className="unit-field"
                              />

                              {/* New Total Field - Calculated automatically */}
                              <Field
                                name={`items.${index}.total`}
                                value={(values.items[index].qty * values.items[index].rate || 0).toFixed(2)}
                                readOnly
                                className="total-field"
                              />

                              {values.items.length > 1 && (
                                <button
                                  type="button"
                                  className="remove-btn-grn"
                                  onClick={() => remove(index)}
                                >
                                  <FaTrash />
                                </button>
                              )}
                            </div>
                          ))}
                          {/* <button
                            type="button"
                            className="add-btn"
                            onClick={() => push({ name: "", description: "", hsn: "", qty: "", rate: "", unit: "" })}
                          >
                            + Add Item
                          </button> */}
                        </div>
                      )}
                    </FieldArray>

                    <Field name="comments" as="textarea" placeholder="Comments or Special Instructions" />
                    <Field name="otherCharges" type="number" placeholder="Other Charges (Optional)" />

                    <div className="totals">
                      <p>Subtotal: ₹{calculateTotals(values.items, values.otherCharges, values.vendorGST).subtotal}</p>
                      {gstType === "intra" ? (
                        <>
                          <p>CGST (9%): ₹{calculateTotals(values.items, values.otherCharges, values.vendorGST).cgst}</p>
                          <p>SGST (9%): ₹{calculateTotals(values.items, values.otherCharges, values.vendorGST).sgst}</p>
                        </>
                      ) : (
                        <p>IGST (18%): ₹{calculateTotals(values.items, values.otherCharges, values.vendorGST).igst}</p>
                      )}
                      <p>Total: ₹{calculateTotals(values.items, values.otherCharges, values.vendorGST).total}</p>
                    </div>

                    <div className="submit-btn-container">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={isSubmitting ? "submitting" : ""}
                      >
                        {isSubmitting ? "Submitting..." : "Submit GRN"}
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
                <th>GRN No</th>
                <th>Date</th>
                <th>Vendor</th>
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
                filteredGRNs.map((grn) => (
                  <tr
                    key={grn.grnNumber}
                    onClick={() => setSelectedGRN(grn)}
                    className={selectedGRN?.grnNumber === grn.grnNumber ? "selected" : ""}
                  >
                    <td>{grn.grnNumber}</td>
                    <td>{grn.grnDate}</td>
                    <td>{grn.vendorName}</td>
                    <td>₹{grn.total.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: "none" }}>
          {selectedGRN && <GRNPrint grn={selectedGRN} />}
        </div>

        {selectedGRN && (
          <GRNModal
            grn={selectedGRN}
            onClose={() => setSelectedGRN(null)}
            onExport={handleExportPDF}
          />
        )}
      </div>
    </Navbar>
  );
};

export default GRN;
