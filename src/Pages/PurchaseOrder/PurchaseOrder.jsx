import React, { useState, useEffect, useMemo } from "react";
import { Formik, Form, Field, FieldArray } from "formik";
import * as Yup from "yup";
import { toast, ToastContainer } from "react-toastify";
import { FaPlus, FaFileExport, FaFileExcel, FaSearch, FaTrash, FaEdit, FaSave, FaSync } from "react-icons/fa";
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

    // Function to enrich PO data with latest vendor and item details
    const getEnrichedPO = async (poNumber) => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/po/get-enriched-po/${poNumber}`);
            return response.data.data;
        } catch (error) {
            console.error("Error getting enriched PO:", error);
            throw error;
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                console.log("Fetching data...");

                const [vendorsRes, itemsRes, poRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL}/vendors/get-vendors`),
                    axios.get(`${import.meta.env.VITE_API_URL}/items/get-items`),
                    axios.get(`${import.meta.env.VITE_API_URL}/po/get-pos`)
                ]);

                console.log("Vendors data:", vendorsRes.data);
                console.log("Items data:", itemsRes.data);
                console.log("POs data:", poRes.data);

                setVendors(vendorsRes.data);
                setItems(itemsRes.data);

                // Get basic PO data first
                const basicPOs = poRes.data.data || poRes.data;
                console.log("Basic POs:", basicPOs);

                // Enrich ALL POs for the table to show vendor names
                const enrichedOrders = [];
                for (const po of basicPOs) {
                    try {
                        const enrichedPO = await getEnrichedPO(po.poNumber);
                        enrichedOrders.push(enrichedPO);
                        console.log("Enriched PO:", enrichedPO);
                    } catch (error) {
                        console.error(`Failed to enrich PO ${po.poNumber}:`, error);
                        enrichedOrders.push(po); // Fallback to basic PO
                    }
                }

                const sortedOrders = enrichedOrders.sort((a, b) => {
                    const dateDiff = new Date(b.date) - new Date(a.date);
                    if (dateDiff !== 0) return dateDiff;
                    return b.poNumber.localeCompare(a.poNumber);
                });

                setOrders(sortedOrders);
                console.log("Final orders:", sortedOrders);

            } catch (error) {
                console.error("Failed to fetch data:", error);
                toast.error("Failed to fetch data");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);


    const handleRowClick = async (po) => {
        try {
            const enrichedPO = await getEnrichedPO(po.poNumber);
            setSelectedPO(enrichedPO);
        } catch (error) {
            // Fallback: show the basic PO data if enrichment fails
            setSelectedPO(po);
            toast.error("Could not load updated details");
        }
    };


    const initialValues = {
        ownerGST: "24AAAFF2996A1Z6",
        ownerPAN: "AAAFF2996A",
        vendorId: "",
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
        items: [{ itemId: "", name: "", description: "", hsn: "", qty: "", rate: "", unit: "" }],
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

    const handleVendorSelect = (selectedOption, setFieldValue) => {
        if (selectedOption) {
            setFieldValue("vendorId", selectedOption.vendorData.vendorId);
            setFieldValue("vendorName", selectedOption.vendorData.vendorName);
            setFieldValue("vendorGST", selectedOption.vendorData.gstNumber);
            setFieldValue("vendorAddress", selectedOption.vendorData.address);
            setFieldValue("vendorContact", selectedOption.vendorData.contactNumber);
            setFieldValue("vendorEmail", selectedOption.vendorData.email);
            setFieldValue("shipName", selectedOption.vendorData.contactPerson || "");
            setFieldValue("shipCompany", selectedOption.vendorData.vendorName);
            setFieldValue("shipPhone", selectedOption.vendorData.contactNumber);

            if (selectedOption.vendorData.gstNumber && selectedOption.vendorData.gstNumber.length >= 2) {
                const stateCode = selectedOption.vendorData.gstNumber.slice(0, 2);
                setGstType(stateCode === "24" ? "intra" : "inter");
            }
        }
    };

    const handleItemSelect = (selectedOption, index, setFieldValue) => {
        if (selectedOption) {
            setFieldValue(`items.${index}.itemId`, selectedOption.itemData.itemId);
            setFieldValue(`items.${index}.name`, selectedOption.itemData.itemName);
            setFieldValue(`items.${index}.description`, selectedOption.itemData.description);
            setFieldValue(`items.${index}.hsn`, selectedOption.itemData.hsnCode);
            setFieldValue(`items.${index}.unit`, selectedOption.itemData.unit);
            if (selectedOption.itemData.rate) {
                setFieldValue(`items.${index}.rate`, selectedOption.itemData.rate);
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

                // Enrich the new PO before adding to state
                const enrichedPO = await getEnrichedPO(res.data.data.poNumber);
                setOrders((prev) => [enrichedPO, ...prev]);

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

    const handleUpdatePO = async (updatedPO) => {
        try {
            const { poNumber, _id, createdAt, updatedAt, ...poData } = updatedPO;
            const response = await axios.put(
                `${import.meta.env.VITE_API_URL}/po/update-po/${updatedPO.poNumber}`,
                poData
            );

            // Enrich the updated PO before updating state
            const enrichedPO = await getEnrichedPO(updatedPO.poNumber);

            setOrders(prev =>
                prev.map(po =>
                    po.poNumber === updatedPO.poNumber ? enrichedPO : po
                )
            );
            setSelectedPO(enrichedPO);
            toast.success("Purchase Order updated successfully!");
        } catch (error) {
            console.error("Error updating purchase order:", error);
            toast.error(error.response?.data?.message || "Error updating purchase order");
        }
    };

    const handleDeletePO = async (poNumber) => {
        try {
            await axios.delete(
                `${import.meta.env.VITE_API_URL}/po/delete-po/${poNumber}`
            );

            setOrders(prev =>
                prev.filter(po => po.poNumber !== poNumber)
            );
            setSelectedPO(null);
            toast.success("Purchase Order deleted successfully!");
        } catch (error) {
            console.error("Error deleting purchase order:", error);
            toast.error(error.response?.data?.message || "Error deleting purchase order");
        }
    };

    const POModal = ({ po, onClose, onExport, onUpdate, onDelete }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editedPO, setEditedPO] = useState({});
        const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
        const [isRefreshing, setIsRefreshing] = useState(false);

        useEffect(() => {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = 'auto';
            };
        }, []);

        useEffect(() => {
            if (po) {
                setEditedPO({ ...po });
            }
        }, [po]);

        const handleRefreshData = async () => {
            setIsRefreshing(true);
            try {
                const refreshedPO = await getEnrichedPO(po.poNumber);
                setEditedPO(refreshedPO);
                toast.success("Data refreshed with latest vendor and item details");
            } catch (error) {
                toast.error("Failed to refresh data");
            } finally {
                setIsRefreshing(false);
            }
        };

        const handleInputChange = (e) => {
            const { name, value } = e.target;
            setEditedPO(prev => ({ ...prev, [name]: value }));
        };

        const handleItemChange = (index, field, value) => {
            setEditedPO(prev => {
                const updatedItems = [...prev.items];
                updatedItems[index] = {
                    ...updatedItems[index],
                    [field]: field === 'qty' || field === 'rate' ? Number(value) : value
                };

                const totals = calculateTotals(updatedItems);
                return {
                    ...prev,
                    items: updatedItems,
                    ...totals
                };
            });
        };

        const handleSave = async () => {
            try {
                await onUpdate(editedPO);
                setIsEditing(false);
            } catch (error) {
                console.error("Error updating purchase order:", error);
            }
        };

        const calculateTotals = (items) => {
            const subtotal = items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
            let cgst = 0, sgst = 0, igst = 0;
            const gstType = po.vendorGST?.slice(0, 2) === "24" ? "intra" : "inter";

            if (gstType === "intra") {
                cgst = +(subtotal * 0.09).toFixed(2);
                sgst = +(subtotal * 0.09).toFixed(2);
            } else {
                igst = +(subtotal * 0.18).toFixed(2);
            }

            const total = +(subtotal + cgst + sgst + igst).toFixed(2);
            return { subtotal, cgst, sgst, igst, total, gstType };
        };

        if (!po) return null;

        const totals = calculateTotals(editedPO.items || po.items);

        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <div className="modal-title">
                            {isEditing ? "Edit Purchase Order" : `PO: ${po.poNumber}`}
                        </div>
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

                            <div className="section-header">Shipping Details</div>
                            <div className="detail-row">
                                <span className="detail-label">Shipping Name:</span>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editedPO.shipName || ''}
                                        onChange={(e) => handleInputChange(e)}
                                        name="shipName"
                                        className="edit-input"
                                    />
                                ) : (
                                    <span className="detail-value">{po.shipName}</span>
                                )}
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Company:</span>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editedPO.shipCompany || ''}
                                        onChange={(e) => handleInputChange(e)}
                                        name="shipCompany"
                                        className="edit-input"
                                    />
                                ) : (
                                    <span className="detail-value">{po.shipCompany}</span>
                                )}
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Phone:</span>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editedPO.shipPhone || ''}
                                        onChange={(e) => handleInputChange(e)}
                                        name="shipPhone"
                                        className="edit-input"
                                    />
                                ) : (
                                    <span className="detail-value">{po.shipPhone}</span>
                                )}
                            </div>

                            <div className="section-header">Address Details</div>
                            <div className="detail-row">
                                <span className="detail-label">Consignee Address:</span>
                                {isEditing ? (
                                    <textarea
                                        value={editedPO.consigneeAddress || ''}
                                        onChange={(e) => handleInputChange(e)}
                                        name="consigneeAddress"
                                        className="edit-textarea"
                                        rows="3"
                                    />
                                ) : (
                                    <span className="detail-value">{po.consigneeAddress || 'N/A'}</span>
                                )}
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Delivery Address:</span>
                                {isEditing ? (
                                    <textarea
                                        value={editedPO.deliveryAddress || ''}
                                        onChange={(e) => handleInputChange(e)}
                                        name="deliveryAddress"
                                        className="edit-textarea"
                                        rows="3"
                                    />
                                ) : (
                                    <span className="detail-value">{po.deliveryAddress || 'N/A'}</span>
                                )}
                            </div>

                            <div className="section-header">Items Ordered</div>
                            <div className="items-grid">
                                {(editedPO.items || po.items).map((item, index) => (
                                    <div key={index} className="item-card">
                                        <div className="item-header">
                                            <span className="item-name">{item.name}</span>
                                            <span className="item-hsn">HSN: {item.hsn || 'N/A'}</span>
                                        </div>
                                        <div className="item-details">
                                            <span>Description: {item.description || 'N/A'}</span>
                                            <span>
                                                Qty: {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={item.qty}
                                                        onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                                                        min="1"
                                                        className="edit-input-small"
                                                    />
                                                ) : (
                                                    item.qty
                                                )} {item.unit}
                                            </span>
                                            <span>
                                                Rate: {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={item.rate}
                                                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                                        min="0"
                                                        step="0.01"
                                                        className="edit-input-small"
                                                    />
                                                ) : (
                                                    `₹${item.rate}`
                                                )}
                                            </span>
                                            <span>Total: ₹{(item.qty * item.rate).toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="section-header">Additional Notes</div>
                            <div className="detail-row">
                                {isEditing ? (
                                    <textarea
                                        value={editedPO.extraNote || ''}
                                        onChange={(e) => handleInputChange(e)}
                                        name="extraNote"
                                        className="edit-textarea"
                                        rows="3"
                                    />
                                ) : (
                                    <span className="detail-value">{po.extraNote || 'N/A'}</span>
                                )}
                            </div>

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
                        <button
                            className="refresh-btn"
                            onClick={handleRefreshData}
                            disabled={isRefreshing}
                        >
                            <FaSync /> {isRefreshing ? "Refreshing..." : "Refresh Data"}
                        </button>
                        <button
                            className={`update-btn ${isEditing ? 'save-btn' : ''}`}
                            onClick={isEditing ? handleSave : () => setIsEditing(true)}
                        >
                            {isEditing ? <FaSave /> : <FaEdit />}
                            {isEditing ? "Save Changes" : "Update"}
                        </button>
                        <button
                            className="delete-btn"
                            onClick={() => setShowDeleteConfirm(true)}
                        >
                            <FaTrash /> Delete
                        </button>
                    </div>

                    {showDeleteConfirm && (
                        <div className="confirm-dialog-overlay">
                            <div className="confirm-dialog">
                                <h3>Confirm Deletion</h3>
                                <p>Are you sure you want to delete PO {po.poNumber}? This action cannot be undone.</p>
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
                                            onDelete(po.poNumber);
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
                                                <div className="field-wrapper">
                                                    <Field name="date" readOnly type="hidden" />
                                                </div>
                                            </div>

                                            <h3>Vendor Details</h3>
                                            <div className="form-group-row">
                                                <div className="field-wrapper">
                                                    <label>Vendor Name</label>
                                                    <Select
                                                        className="react-select-container"
                                                        classNamePrefix="react-select"
                                                        options={vendors.map(vendor => ({
                                                            value: vendor.vendorName,
                                                            label: vendor.vendorName,
                                                            vendorData: vendor
                                                        }))}
                                                        onChange={(selectedOption) => {
                                                            handleVendorSelect(selectedOption, setFieldValue);
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
                                                                        handleItemSelect(selectedOption, index, setFieldValue);
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
                                                            onClick={() => push({ itemId: "", name: "", description: "", hsn: "", qty: 1, rate: 0, unit: "" })}
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
                                    onClick={() => handleRowClick(po)}
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
                        onUpdate={handleUpdatePO}
                        onDelete={handleDeletePO}
                    />
                )}
            </div>
        </Navbar>
    );
};

export default PurchaseOrder;