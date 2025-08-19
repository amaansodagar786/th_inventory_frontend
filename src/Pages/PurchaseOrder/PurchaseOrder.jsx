import React, { useState, useEffect, useMemo } from "react";
import { Formik, Form, Field, FieldArray } from "formik";
import * as Yup from "yup";
import { toast, ToastContainer } from "react-toastify";
import { FaPlus, FaFileExport, FaFileExcel, FaSearch, FaTrash } from "react-icons/fa";
import Navbar from "../../Components/Sidebar/Navbar";
import html2pdf from "html2pdf.js";
import PurchaseOrderPrint from "./PurchaseOrderPrint";
import "react-toastify/dist/ReactToastify.css";
import "./PurchaseOrder.scss";
import axios from "axios";
import * as XLSX from 'xlsx';
import Select from 'react-select';

// Terms and conditions text
const TERMS_CONDITIONS = `
All orders are subject to acceptance by the seller.
Prices are subject to change without notice.
`;

const PurchaseOrder = () => {
    const [showForm, setShowForm] = useState(false);
    const [orders, setOrders] = useState([]);
    const [selectedPO, setSelectedPO] = useState(null);
    const [gstType, setGstType] = useState("intra");
    const [vendors, setVendors] = useState([]);
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");


    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm.trim().toLowerCase());
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const vendorsRes = await axios.get(`${import.meta.env.VITE_API_URL}/vendors/get-vendors`);
                const sortedVendors = vendorsRes.data.sort((a, b) =>
                    new Date(b.createdAt || b.date || Date.now()) - new Date(a.createdAt || a.date || Date.now())
                );
                setVendors(sortedVendors);

                const itemsRes = await axios.get(`${import.meta.env.VITE_API_URL}/items/get-items`);
                const sortedItems = itemsRes.data.sort((a, b) =>
                    new Date(b.createdAt || b.date || Date.now()) - new Date(a.createdAt || a.date || Date.now())
                );
                setItems(sortedItems);

                const poRes = await axios.get(`${import.meta.env.VITE_API_URL}/po/get-pos`);
                const sortedOrders = poRes.data.data.sort((a, b) => {
                    const dateDiff = new Date(b.date) - new Date(a.date);
                    if (dateDiff !== 0) return dateDiff;
                    return b.poNumber.localeCompare(a.poNumber);
                });
                setOrders(sortedOrders);
            } catch (error) {
                toast.error("Failed to fetch data");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const initialValues = {
        ownerGST: "24AAAFF2996A1Z6",
        ownerPAN: "AAAFF2996A",
        vendorName: "",
        vendorGST: "",
        vendorAddress: "",
        vendorContact: "",
        vendorEmail: "",
        shipName: "",
        shipCompany: "",
        shipPhone: "",
        consigneeAddress: "",
        deliveryAddress: "",
        extraNote: "",
        includeTerms: false,
        poNumber: "",
        date: new Date().toISOString().slice(0, 10),
        items: [{ name: "", description: "", hsn: "", qty: "", rate: "", unit: "" }],
    };

    const validationSchema = Yup.object({
        vendorName: Yup.string().required("Vendor Name is required"),
        vendorGST: Yup.string().required("Vendor GST is required"),
        vendorAddress: Yup.string().required("Vendor Address is required"),
        vendorContact: Yup.string().required("Vendor Contact is required"),
        vendorEmail: Yup.string().email("Invalid email").required("Vendor Email is required"),
        shipName: Yup.string().required("Shipping Name is required"),
        shipCompany: Yup.string().required("Shipping Company is required"),
        shipPhone: Yup.string().required("Shipping Phone is required"),
        items: Yup.array().of(
            Yup.object({
                name: Yup.string().required("Item Name is required"),
                qty: Yup.number().required("Quantity is required").moreThan(0, "Quantity must be more than 0"),
                rate: Yup.number().required("Rate is required").moreThan(0, "Rate must be more than 0"),
            })
        ),
    });

    const filteredOrders = useMemo(() => {
        if (!debouncedSearch) return orders;
        return orders.filter(order => {
            if (order.poNumber?.toLowerCase().includes(debouncedSearch)) return true;
            if (order.date?.toLowerCase().includes(debouncedSearch)) return true;
            if (order.vendorName?.toLowerCase().includes(debouncedSearch)) return true;
            if (order.vendorGST?.toLowerCase().includes(debouncedSearch)) return true;
            if (order.vendorAddress?.toLowerCase().includes(debouncedSearch)) return true;
            if (order.vendorContact?.toLowerCase().includes(debouncedSearch)) return true;
            if (order.vendorEmail?.toLowerCase().includes(debouncedSearch)) return true;
            if (order.shipName?.toLowerCase().includes(debouncedSearch)) return true;
            if (order.shipCompany?.toLowerCase().includes(debouncedSearch)) return true;
            if (order.shipPhone?.toLowerCase().includes(debouncedSearch)) return true;
            if (order.items?.some(item =>
                item.name?.toLowerCase().includes(debouncedSearch) ||
                item.description?.toLowerCase().includes(debouncedSearch) ||
                item.hsn?.toLowerCase().includes(debouncedSearch)
            )) return true;
            return false;
        });
    }, [debouncedSearch, orders]);



    const calculateTotals = (items) => {
        const subtotal = items.reduce((sum, item) => sum + item.qty * item.rate, 0);
        let cgst = 0, sgst = 0, igst = 0;
        if (gstType === "intra") {
            cgst = +(subtotal * 0.09).toFixed(2);
            sgst = +(subtotal * 0.09).toFixed(2);
        } else {
            igst = +(subtotal * 0.18).toFixed(2);
        }
        const total = +(subtotal + cgst + sgst + igst).toFixed(2);
        return { subtotal, cgst, sgst, igst, total };
    };

    const handleVendorSelect = (e, setFieldValue) => {
        const selectedVendorName = e.target.value;
        const selectedVendor = vendors.find(v => v.vendorName === selectedVendorName);
        if (selectedVendor) {
            setFieldValue("vendorName", selectedVendor.vendorName);
            setFieldValue("vendorGST", selectedVendor.gstNumber);
            setFieldValue("vendorAddress", selectedVendor.address);
            setFieldValue("vendorContact", selectedVendor.contactNumber);
            setFieldValue("vendorEmail", selectedVendor.email);
            setFieldValue("shipName", selectedVendor.contactPerson || "");
            setFieldValue("shipCompany", selectedVendor.vendorName);
            setFieldValue("shipPhone", selectedVendor.contactNumber);

            if (selectedVendor.gstNumber && selectedVendor.gstNumber.length >= 2) {
                const stateCode = selectedVendor.gstNumber.slice(0, 2);
                setGstType(stateCode === "24" ? "intra" : "inter");
            }
        }
    };

    const handleItemSelect = (e, index, setFieldValue) => {
        const selectedItemName = e.target.value;
        const selectedItem = items.find(i => i.itemName === selectedItemName);
        if (selectedItem) {
            setFieldValue(`items.${index}.name`, selectedItem.itemName);
            setFieldValue(`items.${index}.description`, selectedItem.description);
            setFieldValue(`items.${index}.hsn`, selectedItem.hsnCode);
            setFieldValue(`items.${index}.unit`, selectedItem.unit);
            // setFieldValue(`items.${index}.qty`, 1); 
            if (selectedItem.rate) {
                setFieldValue(`items.${index}.rate`, selectedItem.rate);
            }
        }
    };

    const handleSubmit = async (values, { resetForm, setSubmitting, validateForm }) => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        const errors = await validateForm(values);
        if (Object.keys(errors).length > 0) {
            Object.entries(errors).forEach(([field, error]) => {
                if (typeof error === "string") {
                    toast.error(`${field}: ${error}`);
                }
                if (field === "items" && Array.isArray(error)) {
                    error.forEach((itemError, index) => {
                        if (itemError && typeof itemError === "object") {
                            Object.entries(itemError).forEach(([key, val]) => {
                                toast.error(`Item ${index + 1} - ${key}: ${val}`);
                            });
                        }
                    });
                }
            });
            setIsSubmitting(false);
            setSubmitting(false);
            return;
        }

        try {
            const totals = calculateTotals(values.items);
            const newOrder = {
                ...values,
                ...totals,
                gstType,
                terms: values.includeTerms ? TERMS_CONDITIONS : ""
            };
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/po/create-po`, newOrder);

            if (res.data.success) {
                toast.success("Purchase Order saved successfully!");
                setOrders((prev) => [res.data.data, ...prev]);
                setShowForm(false);
                resetForm();
            } else {
                toast.error("Failed to save Purchase Order.");
            }
        } catch (error) {
            toast.error("Error while submitting PO");
        } finally {
            setIsSubmitting(false);
            setSubmitting(false);
        }
    };

    const handleExportPDF = () => {
        if (!selectedPO) return toast.warn("Please select a PO first");
        const element = document.getElementById("po-pdf");
        html2pdf().from(element)
            .set({
                margin: 0,
                filename: `${selectedPO.poNumber}.pdf`,
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            })
            .save();
    };

    const handleExportExcel = () => {
        if (orders.length === 0) {
            toast.warn("No purchase orders to export");
            return;
        }
        const data = orders.map(order => ({
            'PO No': order.poNumber,
            'Date': order.date,
            'Vendor': order.vendorName,
            'Total': order.total?.toFixed(2),
            'GST Type': order.gstType || (order.vendorGST?.startsWith('24') ? 'intra' : 'inter'),
        }));
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "PurchaseOrders");
        XLSX.writeFile(workbook, "PurchaseOrders.xlsx");
        toast.success("Exported all purchase orders to Excel");
    };

    const POModal = ({ po, onClose, onExport }) => {
        useEffect(() => {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = 'auto';
            };
        }, []);

        if (!po) return null;

        const totals = {
            subtotal: po.items.reduce((sum, item) => sum + (item.qty * item.rate), 0),
            cgst: po.cgst || 0,
            sgst: po.sgst || 0,
            igst: po.igst || 0,
            total: po.total || 0
        };

        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <div className="modal-title">PO: {po.poNumber}</div>
                        <button className="modal-close" onClick={onClose}>
                            &times;
                        </button>
                    </div>

                    <div className="modal-body">
                        <div className="po-details-grid">
                            <div className="detail-row">
                                <span className="detail-label">PO Number:</span>
                                <span className="detail-value">{po.poNumber}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Date:</span>
                                <span className="detail-value">{po.date}</span>
                            </div>

                            <div className="section-header">Vendor Details</div>
                            <div className="detail-row">
                                <span className="detail-label">Name:</span>
                                <span className="detail-value">{po.vendorName}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">GSTIN:</span>
                                <span className="detail-value">{po.vendorGST}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Address:</span>
                                <span className="detail-value">{po.vendorAddress}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Contact:</span>
                                <span className="detail-value">{po.vendorContact}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Email:</span>
                                <span className="detail-value">{po.vendorEmail}</span>
                            </div>

                            <div className="section-header">Shipping Details</div>
                            <div className="detail-row">
                                <span className="detail-label">Name:</span>
                                <span className="detail-value">{po.shipName}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Company:</span>
                                <span className="detail-value">{po.shipCompany}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Phone:</span>
                                <span className="detail-value">{po.shipPhone}</span>
                            </div>

                            {/* New Fields */}
                            {po.consigneeAddress && (
                                <div className="detail-row">
                                    <span className="detail-label">Consignee Address:</span>
                                    <span className="detail-value">{po.consigneeAddress}</span>
                                </div>
                            )}
                            {po.deliveryAddress && (
                                <div className="detail-row">
                                    <span className="detail-label">Delivery Address:</span>
                                    <span className="detail-value">{po.deliveryAddress}</span>
                                </div>
                            )}

                            <div className="section-header">Items Ordered</div>
                            <div className="items-grid">
                                {po.items.map((item, index) => (
                                    <div key={index} className="item-card">
                                        <div className="item-header">
                                            <span className="item-name">{item.name}</span>
                                            <span className="item-hsn">HSN: {item.hsn || 'N/A'}</span>
                                        </div>
                                        <div className="item-details">
                                            <span>Qty: {item.qty} {item.unit}</span>
                                            <span>Rate: ₹{item.rate}</span>
                                            <span>Total: ₹{(item.qty * item.rate).toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {po.extraNote && (
                                <>
                                    <div className="section-header">Additional Notes</div>
                                    <div className="detail-row">
                                        <span className="detail-value">{po.extraNote}</span>
                                    </div>
                                </>
                            )}

                            {po.terms && (
                                <>
                                    <div className="section-header">Terms & Conditions</div>
                                    <div className="detail-row">
                                        <pre className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{po.terms}</pre>
                                    </div>
                                </>
                            )}


                            <div className="section-header">Order Summary</div>
                            <div className="totals-section">
                                <div className="total-row">
                                    <span>Subtotal:</span>
                                    <span>₹{totals.subtotal.toFixed(2)}</span>
                                </div>
                                {totals.cgst > 0 && (
                                    <div className="total-row">
                                        <span>CGST (9%):</span>
                                        <span>₹{totals.cgst.toFixed(2)}</span>
                                    </div>
                                )}
                                {totals.sgst > 0 && (
                                    <div className="total-row">
                                        <span>SGST (9%):</span>
                                        <span>₹{totals.sgst.toFixed(2)}</span>
                                    </div>
                                )}
                                {totals.igst > 0 && (
                                    <div className="total-row">
                                        <span>IGST (18%):</span>
                                        <span>₹{totals.igst.toFixed(2)}</span>
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
                    <h2>Purchase Orders</h2>
                    <div className="right-section">
                        <div className="search-container">
                            <FaSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search POs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="page-actions">
                            <button className="export-all-btn" onClick={handleExportExcel}>
                                <FaFileExcel /> Export All
                            </button>
                            <button className="add-btn" onClick={() => setShowForm(!showForm)}>
                                <FaPlus /> {showForm ? "Close PO" : "Create PO"}
                            </button>
                        </div>
                    </div>
                </div>

                {isLoading && <div className="loading">Loading data...</div>}

                {showForm && (
                    <div className="form-container premium">

                        <Formik
                            initialValues={initialValues}
                            validationSchema={validationSchema}
                            validateOnBlur={false}
                            validateOnChange={false}
                            onSubmit={handleSubmit}
                        >
                            {({ errors, values, setFieldValue, validateForm, submitCount }) => {
                                useEffect(() => {
                                    if (submitCount > 0 && Object.keys(errors).length > 0) {
                                        Object.entries(errors).forEach(([field, error]) => {
                                            if (typeof error === "string") {
                                                toast.error(`${field}: ${error}`);
                                            } else if (field === "items" && Array.isArray(error)) {
                                                error.forEach((itemError, index) => {
                                                    if (itemError) {
                                                        Object.entries(itemError).forEach(([key, val]) => {
                                                            toast.error(`Item ${index + 1} - ${key}: ${val}`);
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                }, [submitCount, errors]);

                                return (
                                    <>

                                        <div className="po-form-header">
                                            <h2>Create Purchase Order</h2>
                                            <div className="date-container">
                                                <span className="date-label">Date:</span>
                                                <span className="po-date">{values.date}</span>
                                            </div>
                                        </div>
                                        <Form>
                                            <div className="form-group-row">
                                                {/* <div className="field-wrapper">
                                                <label>PO Number</label>
                                                <Field name="poNumber" readOnly placeholder="Generated after submission" />
                                            </div> */}
                                                <div className="field-wrapper">
                                                    {/* <label>Date</label>   */}
                                                    <Field name="date" readOnly type="hidden" />
                                                </div>
                                            </div>

                                            <h3>Vendor Details</h3>
                                            <div className="form-group-row">
                                                <div className="field-wrapper">
                                                    <label>Vendor Name</label>
                                                    {/* <Field
                                                    name="vendorName"
                                                    as="select"
                                                    onChange={(e) => handleVendorSelect(e, setFieldValue)}
                                                >
                                                    <option value="">Select Vendor</option>
                                                    {vendors.map((vendor) => (
                                                        <option key={vendor.vendorId} value={vendor.vendorName}>
                                                            {vendor.vendorName}
                                                        </option>
                                                    ))}
                                                </Field> */}
                                                    <Select
                                                        className="react-select-container"
                                                        classNamePrefix="react-select"
                                                        options={vendors.map(vendor => ({
                                                            value: vendor.vendorName,
                                                            label: vendor.vendorName,
                                                            vendorData: vendor
                                                        }))}
                                                        onChange={(selectedOption) => {
                                                            if (selectedOption) {
                                                                handleVendorSelect(
                                                                    { target: { value: selectedOption.value } },
                                                                    setFieldValue
                                                                );
                                                            }
                                                        }}
                                                        placeholder="Select Vendor"
                                                        isSearchable={true}
                                                        noOptionsMessage={() => "No vendors found"}
                                                    />
                                                </div>
                                                <div className="field-wrapper">
                                                    <label>GSTIN</label>
                                                    <Field name="vendorGST" readOnly />
                                                </div>
                                                <div className="field-wrapper">
                                                    <label>Address</label>
                                                    <Field name="vendorAddress" readOnly />
                                                </div>
                                                <div className="field-wrapper">
                                                    <label>Contact</label>
                                                    <Field name="vendorContact" readOnly />
                                                </div>
                                                <div className="field-wrapper">
                                                    <label>Email</label>
                                                    <Field name="vendorEmail" readOnly />
                                                </div>
                                            </div>

                                            <h3>Shipping Details</h3>
                                            <div className="form-group-row">
                                                <div className="field-wrapper">
                                                    <label>Shipping Name</label>
                                                    <Field name="shipName" />
                                                </div>
                                                <div className="field-wrapper">
                                                    <label>Company Name</label>
                                                    <Field name="shipCompany" />
                                                </div>
                                                <div className="field-wrapper">
                                                    <label>Phone</label>
                                                    <Field name="shipPhone" />
                                                </div>
                                            </div>

                                            {/* New Fields */}
                                            <h3>Address Details</h3>
                                            <div className="form-group-row">
                                                <div className="field-wrapper">
                                                    <label>Consignee Address</label>
                                                    <Field name="consigneeAddress" as="textarea" rows="3" />
                                                </div>
                                                <div className="field-wrapper">
                                                    <label>Delivery Address</label>
                                                    <Field name="deliveryAddress" as="textarea" rows="3" />
                                                </div>
                                            </div>

                                            <h3>Item Details</h3>
                                            <FieldArray name="items">
                                                {({ remove, push }) => (
                                                    <div className="form-items">
                                                        {values.items.map((item, index) => (
                                                            <div className="item-row" key={index}>
                                                                <Select
                                                                    className="react-select-container"
                                                                    classNamePrefix="react-select"
                                                                    options={items.map(item => ({
                                                                        value: item.itemName,
                                                                        label: item.itemName,
                                                                        itemData: item
                                                                    }))}
                                                                    onChange={(selectedOption) => {
                                                                        if (selectedOption) {
                                                                            handleItemSelect(
                                                                                { target: { value: selectedOption.value } },
                                                                                index,
                                                                                setFieldValue
                                                                            );
                                                                        }
                                                                    }}
                                                                    placeholder="Items"
                                                                    isSearchable={true}
                                                                    noOptionsMessage={() => "No items found"}
                                                                />
                                                                <Field name={`items.${index}.description`} readOnly />
                                                                <Field name={`items.${index}.hsn`} readOnly />
                                                                <Field name={`items.${index}.qty`} type="number" placeholder="Quantity" min="1" />
                                                                <Field name={`items.${index}.rate`} type="number" placeholder="Rate (₹)" min="0" step="0.01" />
                                                                <Field name={`items.${index}.unit`} readOnly />
                                                                {values.items.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        className="remove-btn"
                                                                        onClick={() => remove(index)}
                                                                    >
                                                                        <FaTrash />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                        <button
                                                            type="button"
                                                            className="add-btn"
                                                            onClick={() => push({ name: "", description: "", hsn: "", qty: 1, rate: 0, unit: "" })}
                                                        >
                                                            + Add Item
                                                        </button>
                                                    </div>
                                                )}
                                            </FieldArray>

                                            <div className="field-wrapper">
                                                <label>Extra Note (Optional)</label>
                                                <Field name="extraNote" as="textarea" rows="3" />
                                            </div>

                                            <div className="terms-checkbox">
                                                <label>
                                                    <Field type="checkbox" name="includeTerms" />
                                                    Terms and Conditions Apply
                                                </label>
                                            </div>

                                            <div className="totals">
                                                {(() => {
                                                    const totals = calculateTotals(values.items);
                                                    return (
                                                        <>
                                                            <p>Subtotal: ₹{totals.subtotal.toFixed(2)}</p>
                                                            {gstType === "intra" ? (
                                                                <>
                                                                    <p>CGST (9%): ₹{totals.cgst.toFixed(2)}</p>
                                                                    <p>SGST (9%): ₹{totals.sgst.toFixed(2)}</p>
                                                                </>
                                                            ) : (
                                                                <p>IGST (18%): ₹{totals.igst.toFixed(2)}</p>
                                                            )}
                                                            <p>Total: ₹{totals.total.toFixed(2)}</p>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className={isSubmitting ? "submitting" : ""}
                                            >
                                                {isSubmitting ? "Submitting..." : "Submit PO"}
                                            </button>
                                        </Form>

                                    </>
                                );
                            }}
                        </Formik>
                    </div>
                )}

                <div className="data-table">
                    <table>
                        <thead>
                            <tr>
                                <th>PO No</th>
                                <th>Date</th>
                                <th>Vendor</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map((po) => (
                                <tr
                                    key={po.poNumber}
                                    onClick={() => setSelectedPO(po)}
                                    className={selectedPO?.poNumber === po.poNumber ? "selected" : ""}
                                >
                                    <td>{po.poNumber}</td>
                                    <td>{po.date}</td>
                                    <td>{po.vendorName}</td>
                                    <td>₹{po.total?.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ display: "none" }}>
                    {selectedPO && <PurchaseOrderPrint po={selectedPO} />}
                </div>

                {selectedPO && (
                    <POModal
                        po={selectedPO}
                        onClose={() => setSelectedPO(null)}
                        onExport={handleExportPDF}
                    />
                )}
            </div>
        </Navbar>
    );
};

export default PurchaseOrder;