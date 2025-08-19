import React, { useState, useEffect, useRef, useMemo } from "react";
import { Formik, Form, Field, FieldArray } from "formik";
import * as Yup from "yup";
import html2pdf from "html2pdf.js";
import { toast, ToastContainer } from "react-toastify";
import { FaPlus, FaFileExport, FaFileExcel, FaSearch, FaTrash } from "react-icons/fa";
import Navbar from "../../Components/Sidebar/Navbar";
import WorkOrderPrint from "./WorkOrderPrint";
import "react-toastify/dist/ReactToastify.css";
import "./WorkOrder.scss";
import axios from "axios";
import * as XLSX from 'xlsx';
import { useInventory } from '../../Components/contexts/InventoryContext';
import Select from 'react-select';


// const generateWorkOrderNumber = (index) => `WO2025${String(index + 1).padStart(4, "0")}`;

const WorkOrder = () => {
    const { calculateStock } = useInventory();
    const [workOrders, setWorkOrders] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
    // const [gstType, setGstType] = useState("intra"); 
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [bomProducts, setBomProducts] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [showLoader, setShowLoader] = useState(false);
    const loaderTimeoutRef = useRef(null);


    const submissionStateRef = useRef({
        isSubmitting: false,
        hasValidationErrors: false
    });


    const UNIT_OPTIONS = [
        { value: "MTR", label: "Meter (Mtr.)" },
        { value: "NOS", label: "Numbers (No.)" },
        { value: "KGS", label: "Kilogram (Kg.)" },
        { value: "LTR", label: "Litre (L.)" }
    ];


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


    const filteredWorkOrders = useMemo(() => {
        if (!debouncedSearch) return workOrders;

        return workOrders.filter(order => {
            // Check work order fields
            if (order.workOrderNumber?.toLowerCase().includes(debouncedSearch)) return true;
            if (order.workOrderDate?.toLowerCase().includes(debouncedSearch)) return true;

            // Check receiver/consignee fields
            if (order.receiver?.name?.toLowerCase().includes(debouncedSearch)) return true;
            if (order.receiver?.gstin?.toLowerCase().includes(debouncedSearch)) return true;
            if (order.receiver?.address?.toLowerCase().includes(debouncedSearch)) return true;
            if (order.receiver?.contact?.toLowerCase().includes(debouncedSearch)) return true;
            if (order.receiver?.email?.toLowerCase().includes(debouncedSearch)) return true;

            // Check items
            if (order.items?.some(item =>
                item.name?.toLowerCase().includes(debouncedSearch) ||
                item.description?.toLowerCase().includes(debouncedSearch) ||
                item.hsn?.toLowerCase().includes(debouncedSearch)
            )) return true;

            // Check transport details
            if (order.lrNumber?.toLowerCase().includes(debouncedSearch)) return true;
            if (order.transporter?.toLowerCase().includes(debouncedSearch)) return true;

            // Check bank details
            if (order.bank?.name?.toLowerCase().includes(debouncedSearch)) return true;
            if (order.bank?.account?.toLowerCase().includes(debouncedSearch)) return true;
            if (order.bank?.branch?.toLowerCase().includes(debouncedSearch)) return true;
            if (order.bank?.ifsc?.toLowerCase().includes(debouncedSearch)) return true;

            return false;
        });
    }, [debouncedSearch, workOrders]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                await Promise.all([
                    fetchWorkOrderData(),
                    axios.get(`${import.meta.env.VITE_API_URL}/po/get-pos`).then(res =>
                        setPurchaseOrders(res.data.data || [])
                    ),
                    axios.get(`${import.meta.env.VITE_API_URL}/customer/get-customers`).then(res => {
                        // Sort customers by createdAt (newest first)
                        const sortedCustomers = (res.data || []).sort((a, b) =>
                            new Date(b.createdAt || b.date || Date.now()) - new Date(a.createdAt || a.date || Date.now())
                        );
                        setCustomers(sortedCustomers);
                    }),
                    axios.get(`${import.meta.env.VITE_API_URL}/bom/get-boms`).then(res =>
                        setBomProducts(res.data.data || [])
                    ),
                    axios.get(`${import.meta.env.VITE_API_URL}/items/get-items`).then(res =>
                        setInventoryItems(res.data || [])
                    )
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

    const fetchWorkOrderData = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/workorder/get-workorders`);
            // Sort by date (newest first) and then by work order number
            const sortedWorkOrders = (response.data.data || []).sort((a, b) => {
                const dateDiff = new Date(b.workOrderDate) - new Date(a.workOrderDate);
                if (dateDiff !== 0) return dateDiff;
                return b.workOrderNumber.localeCompare(a.workOrderNumber);
            });
            setWorkOrders(sortedWorkOrders);
        } catch (error) {
            console.error("Error fetching work orders:", error);
            toast.error("Failed to load work orders");
        }
    };



    const checkInventory = async (productName, quantityToMake) => {
        try {
            const productBOM = bomProducts.find(bom => bom.productName === productName);
            if (!productBOM) return { canProduce: false, message: "No BOM found" };

            // Fetch current inventory data
            const inventoryResponse = await axios.get(`${import.meta.env.VITE_API_URL}/inventory/get-inventory`);
            const inventoryItems = inventoryResponse.data.data || []; // Modified this line

            const requirements = productBOM.items.map(bomItem => {
                const totalNeeded = bomItem.requiredQty * quantityToMake;

                // Find the inventory item
                const inventoryItem = inventoryItems.find(item => item.itemName === bomItem.itemName);
                const availableQty = inventoryItem ? inventoryItem.currentStock : 0;

                return {
                    component: bomItem.itemName,
                    neededPerUnit: bomItem.requiredQty,
                    totalNeeded,
                    available: availableQty,
                    isAvailable: availableQty >= totalNeeded
                };
            });

            const missingItems = requirements.filter(item => !item.isAvailable);
            if (missingItems.length > 0) {
                return {
                    canProduce: false,
                    message: "Insufficient inventory: " +
                        missingItems.map(i => `${i.component} (Need ${i.totalNeeded}, Have ${i.available})`).join(", "),
                    details: requirements // Include details for reference
                };
            }

            return {
                canProduce: true,
                message: "All materials available",
                details: requirements
            };
        } catch (error) {
            console.error("Error checking inventory:", error);
            return { canProduce: false, message: "Error checking inventory availability" };
        }
    };

    const initialValues = {
        // workOrderNumber: generateWorkOrderNumber(workOrders.length),
        // workOrderNumber: "", 
        workOrderDate: new Date().toISOString().split("T")[0],
        poNumber: "",
        poDate: "",
        receiver: {
            name: "",
            gstin: "",
            address: "",
            city: "",
            pincode: "",
            contact: "",
            email: ""
        },
        // consignee: {
        //     name: "",
        //     gstin: "",
        //     address: "",
        //     contact: "",
        //     email: ""
        // },
        items: [
            {
                name: "",
                description: "",
                hsn: "",
                quantity: "",
                unitPrice: "",
                units: ""
            }
        ],
        // lrNumber: "",
        // lrDate: "",
        // transporter: "",
        // transportMobile: "",
        // bank: {
        //     name: "",
        //     account: "",
        //     branch: "",
        //     ifsc: ""
        // },
        otherCharges: 0
    };

    const validationSchema = Yup.object().shape({
        workOrderDate: Yup.string().required("Work Order Date is required"),
        // poNumber: Yup.string().required("PO Number is required"), 
        receiver: Yup.object({
            name: Yup.string().required("Receiver name required"),
            gstin: Yup.string().required("GSTIN required"),
            address: Yup.string().required("Address required"),
            contact: Yup.string().required("Contact required"),
            city: Yup.string(),
            pincode: Yup.string(),
            email: Yup.string().email("Invalid email").required("Email required")
        }),
        // consignee: Yup.object({
        //     name: Yup.string().required("Consignee name required"),
        //     gstin: Yup.string().required("GSTIN required"),
        //     address: Yup.string().required("Address required"),
        //     contact: Yup.string().required("Contact required"),
        //     email: Yup.string().email("Invalid email").required("Email required")
        // }),
        items: Yup.array().of(
            Yup.object({
                name: Yup.string().required("Item name required"),
                quantity: Yup.number().required("Quantity required").moreThan(0),
                unitPrice: Yup.number().required("Unit price required").moreThan(0),
                units: Yup.string().required("Unit selection required") // Add this line

            })
        )
    });

    const handlePOSelect = (e, setFieldValue) => {
        const selectedPONumber = e.target.value;
        const selectedPO = purchaseOrders.find(po => po.poNumber === selectedPONumber);
        if (selectedPO) {
            setFieldValue("poNumber", selectedPO.poNumber);
            setFieldValue("poDate", selectedPO.date);
        }
    };

    // const handleItemSelect = (e, index, setFieldValue) => {
    //     const selectedProductName = e.target.value;
    //     const selectedProduct = bomProducts.find(bom => bom.productName === selectedProductName);
    //     if (selectedProduct) {
    //         setFieldValue(`items.${index}.name`, selectedProduct.productName);
    //         setFieldValue(`items.${index}.description`, selectedProduct.description);
    //         setFieldValue(`items.${index}.hsn`, selectedProduct.hsnCode);

    //         // Show BOM requirements when product is selected
    //         toast.info(
    //             `To make 1 ${selectedProduct.productName} you need: ${selectedProduct.items.map(i => `${i.requiredQty} ${i.itemName}`).join(", ")}`,
    //             {
    //                 autoClose: false,
    //                 closeOnClick: false,
    //                 draggable: false,
    //                 closeButton: true
    //             }
    //         );
    //     }
    // };


    const handleItemSelect = (selectedOption, index, setFieldValue) => {
        if (selectedOption) {
            setFieldValue(`items.${index}.name`, selectedOption.value);
            setFieldValue(`items.${index}.description`, selectedOption.bomData.description);
            setFieldValue(`items.${index}.hsn`, selectedOption.bomData.hsnCode);

            // Show BOM requirements toast
            toast.info(
                `To make 1 ${selectedOption.value} you need: ${selectedOption.bomData.items.map(i =>
                    `${i.requiredQty} ${i.itemName}`
                ).join(", ")}`,
                {
                    autoClose: false,
                    closeOnClick: false,
                    draggable: false,
                    closeButton: true
                }
            );
        }
    };

    const handleCustomerSelect = (e, setFieldValue) => {
        const selectedCustomerName = e.target.value;
        const selectedCustomer = customers.find(c => c.customerName === selectedCustomerName);
        if (selectedCustomer) {
            setFieldValue("receiver.name", selectedCustomer.customerName);
            setFieldValue("receiver.gstin", selectedCustomer.gstNumber);
            setFieldValue("receiver.address", selectedCustomer.address);
            setFieldValue("receiver.city", selectedCustomer.city);
            setFieldValue("receiver.pincode", selectedCustomer.pincode);
            setFieldValue("receiver.contact", selectedCustomer.contactNumber);
            setFieldValue("receiver.email", selectedCustomer.email);
            // setFieldValue("consignee.name", selectedCustomer.customerName);
            // setFieldValue("consignee.gstin", selectedCustomer.gstNumber);
            // setFieldValue("consignee.address", selectedCustomer.address);
            // setFieldValue("consignee.contact", selectedCustomer.contactNumber);
            // setFieldValue("consignee.email", selectedCustomer.email);
            setGstType(selectedCustomer.gstNumber?.slice(0, 2) === "24" ? "intra" : "inter");
        }
    };

    const calculateTotals = (items, otherCharges = 0, receiverGST = "") => {
        const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        const isIntraState = receiverGST.startsWith("24");
        const cgst = isIntraState ? +(subtotal * 0.09).toFixed(2) : 0;
        const sgst = isIntraState ? +(subtotal * 0.09).toFixed(2) : 0;
        const igst = !isIntraState ? +(subtotal * 0.18).toFixed(2) : 0;
        const total = +(subtotal + cgst + sgst + igst + Number(otherCharges || 0)).toFixed(2);
        return { subtotal, cgst, sgst, igst, total };
    };

    // const calculateTotals = (items, otherCharges = 0) => {
    //     const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    //     const cgst = +(subtotal * 0.09).toFixed(2);
    //     const sgst = +(subtotal * 0.09).toFixed(2);
    //     const total = +(subtotal + cgst + sgst + Number(otherCharges || 0)).toFixed(2);
    //     return { subtotal, cgst, sgst, total };
    // };

    const handleSubmit = async (values, { resetForm }) => {

        toast.dismiss();

        // If we're already submitting or have validation errors, bail out
        if (isSubmitting || submissionStateRef.current.hasValidationErrors) {
            return;
        }

        setIsSubmitting(true); // Set submitting state

        try {
            const inventoryCheck = await checkInventory(
                values.items[0].name,
                values.items[0].quantity
            );

            if (!inventoryCheck.canProduce) {
                toast.error(inventoryCheck.message, {
                    autoClose: false,
                    closeOnClick: false,
                    draggable: false,
                    closeButton: true
                });
                return;
            }

            const numericOtherCharges = Number(values.otherCharges || 0);
            const totals = calculateTotals(values.items, numericOtherCharges);
            const newWorkOrder = {
                ...values,
                otherCharges: numericOtherCharges,
                ...totals,
                materialRequirements: inventoryCheck.details
            };

            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/workorder/create-workorder`,
                newWorkOrder
            );

            // Add new work order at the beginning of the array
            setWorkOrders(prev => [response.data.data, ...prev]);
            toast.success("Work order created successfully!");
            setShowForm(false);

            // resetForm({
            //     values: {
            //         ...initialValues,
            //         workOrderNumber: generateWorkOrderNumber(workOrders.length + 1)
            //     }
            // });
        
        
        } catch (error) {
            console.error("Error saving work order:", error);
            toast.error(error.response?.data?.message || "Failed to save work order");
        } finally {
            setIsSubmitting(false); // Reset submitting state
        }
    };

    const handleExportPDF = () => {
        if (!selectedWorkOrder) return toast.warn("Select a work order to export");
        const element = document.getElementById("workorder-pdf");
        html2pdf()
            .from(element)
            .set({
                margin: 10,
                filename: `${selectedWorkOrder.workOrderNumber}.pdf`,
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
            })
            .save();
    };

    const handleExportExcel = () => {
        if (workOrders.length === 0) {
            toast.warn("No work orders to export");
            return;
        }

        // Prepare data for Excel
        const data = workOrders.map(order => ({
            'Work Order No': order.workOrderNumber,
            'Date': order.workOrderDate,
            'Receiver': order.receiver?.name || 'N/A',
            'Total': order.total?.toFixed(2),
            'PO Number': order.poNumber || 'N/A',
            // 'Consignee': order.consignee?.name || 'N/A',
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "WorkOrders");
        XLSX.writeFile(workbook, "WorkOrders.xlsx");
        toast.success("Exported all work orders to Excel");
    };

    // Add this component near the top of your WorkOrder.js file
    const WorkOrderModal = ({ workOrder, onClose, onExport }) => {
        useEffect(() => {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = 'auto';
            };
        }, []);

        if (!workOrder) return null;

        const totals = {
            subtotal: workOrder.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
            cgst: workOrder.cgst || 0,
            sgst: workOrder.sgst || 0,
            total: workOrder.total || 0
        };

        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <div className="modal-title">Work Order: {workOrder.workOrderNumber}</div>
                        <button className="modal-close" onClick={onClose}>
                            &times;
                        </button>
                    </div>

                    <div className="modal-body">
                        <div className="wo-details-grid">
                            {/* Basic Work Order Details */}
                            <div className="detail-row">
                                <span className="detail-label">Work Order No:</span>
                                <span className="detail-value">{workOrder.workOrderNumber}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Date:</span>
                                <span className="detail-value">{workOrder.workOrderDate}</span>
                            </div>
                            {workOrder.poNumber && (
                                <div className="detail-row">
                                    <span className="detail-label">PO Number:</span>
                                    <span className="detail-value">{workOrder.poNumber}</span>
                                </div>
                            )}
                            {workOrder.poDate && (
                                <div className="detail-row">
                                    <span className="detail-label">PO Date:</span>
                                    <span className="detail-value">{workOrder.poDate}</span>
                                </div>
                            )}

                            {/* Receiver Details */}
                            <div className="section-header">Receiver Details (Billed To)</div>
                            <div className="detail-row">
                                <span className="detail-label">Name:</span>
                                <span className="detail-value">{workOrder.receiver.name}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">GSTIN:</span>
                                <span className="detail-value">{workOrder.receiver.gstin}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Address:</span>
                                <span className="detail-value">{workOrder.receiver.address}</span>
                            </div>
                            <div className="address-details-row">
                                <div className="detail-row">
                                    <span className="detail-label">City:</span>
                                    <span className="detail-value">{workOrder.receiver.city || 'N/A'}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Pincode:</span>
                                    <span className="detail-value">{workOrder.receiver.pincode || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Contact:</span>
                                <span className="detail-value">{workOrder.receiver.contact}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Email:</span>
                                <span className="detail-value">{workOrder.receiver.email}</span>
                            </div>


                            {/*  <div className="section-header">Consignee Details (Shipped To)</div>
                            <div className="detail-row">
                                <span className="detail-label">Name:</span>
                                <span className="detail-value">{workOrder.consignee.name}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">GSTIN:</span>
                                <span className="detail-value">{workOrder.consignee.gstin}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Address:</span>
                                <span className="detail-value">{workOrder.consignee.address}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Contact:</span>
                                <span className="detail-value">{workOrder.consignee.contact}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Email:</span>
                                <span className="detail-value">{workOrder.consignee.email}</span>
                            </div> */}

                            {/* Items Section */}
                            <div className="section-header">Items Ordered</div>
                            <div className="items-grid">
                                {workOrder.items.map((item, index) => (
                                    <div key={index} className="item-card">
                                        <div className="item-header">
                                            <span className="item-name">{item.name}</span>
                                            <span className="item-hsn">HSN: {item.hsn || 'N/A'}</span>
                                        </div>
                                        <div className="item-details">
                                            <span>Qty: {item.quantity} {item.units}</span>
                                            <span>Rate: ₹{item.unitPrice}</span>
                                            <span>Total: ₹{(item.quantity * item.unitPrice).toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Transport Details */}
                            {/* <div className="section-header">Transport Details</div>
                            <div className="detail-row">
                                <span className="detail-label">LR Number:</span>
                                <span className="detail-value">{workOrder.lrNumber || 'N/A'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">LR Date:</span>
                                <span className="detail-value">{workOrder.lrDate || 'N/A'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Transporter:</span>
                                <span className="detail-value">{workOrder.transporter || 'N/A'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Mobile:</span>
                                <span className="detail-value">{workOrder.transportMobile || 'N/A'}</span>
                            </div> */}

                            {/* Bank Details */}
                            {/* <div className="section-header">Bank Details</div>
                            <div className="detail-row">
                                <span className="detail-label">Bank Name:</span>
                                <span className="detail-value">{workOrder.bank?.name || 'N/A'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Account No:</span>
                                <span className="detail-value">{workOrder.bank?.account || 'N/A'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Branch:</span>
                                <span className="detail-value">{workOrder.bank?.branch || 'N/A'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">IFSC:</span>
                                <span className="detail-value">{workOrder.bank?.ifsc || 'N/A'}</span>
                            </div> */}

                            {/* Totals Section */}
                            <div className="section-header">Order Summary</div>
                            <div className="totals-section">
                                <div className="total-row">
                                    <span>Subtotal:</span>
                                    <span>₹{totals.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="total-row">
                                    <span>CGST (9%):</span>
                                    <span>₹{totals.cgst.toFixed(2)}</span>
                                </div>
                                <div className="total-row">
                                    <span>SGST (9%):</span>
                                    <span>₹{totals.sgst.toFixed(2)}</span>
                                </div>
                                {workOrder.otherCharges > 0 && (
                                    <div className="total-row">
                                        <span>Other Charges:</span>
                                        <span>₹{workOrder.otherCharges.toFixed(2)}</span>
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
            <div className="workorder-container">
                <div className="page-header">
                    <h2>Work Orders</h2>
                    <div className="right-section">
                        <div className="search-container">
                            <FaSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search Work Orders..."
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
                                <FaPlus /> {showForm ? "Close Form" : "Create Work Order"}
                            </button>
                        </div>
                    </div>
                </div>

                {isLoading && <div className="loading">Loading data...</div>}

                {showForm && (
                    <div className="form-container">
                        {/* <h2>Create Work Order</h2>  */}
                        <Formik
                            initialValues={initialValues}
                            validationSchema={validationSchema}
                            validateOnBlur={false}
                            validateOnChange={false}
                            onSubmit={handleSubmit}
                        >
                            {({ values, setFieldValue, errors, submitCount, isSubmitting }) => {
                                // Show errors as toast when submit is attempted
                                submissionStateRef.current.isSubmitting = isSubmitting;


                                useEffect(() => {
                                    // Only show errors if:
                                    // 1. User has tried to submit
                                    // 2. There are validation errors
                                    // 3. We're not currently submitting
                                    if (submitCount > 0 && Object.keys(errors).length > 0 && !submissionStateRef.current.isSubmitting) {
                                        // Clear all previous toasts first
                                        toast.dismiss();

                                        // Track that we have validation errors
                                        submissionStateRef.current.hasValidationErrors = true;

                                        // Show field-specific errors
                                        if (errors.workOrderDate) toast.error(errors.workOrderDate);

                                        if (errors.receiver) {
                                            Object.values(errors.receiver).forEach(err => toast.error(`Receiver: ${err}`));
                                        }

                                        if (Array.isArray(errors.items)) {
                                            errors.items.forEach((itemError, index) => {
                                                if (itemError?.name)
                                                    toast.error(`Item ${index + 1}: ${itemError.name}`);
                                                if (itemError?.quantity)
                                                    toast.error(`Item ${index + 1}: ${itemError.quantity}`);
                                                if (itemError?.unitPrice)
                                                    toast.error(`Item ${index + 1}: ${itemError.unitPrice}`);
                                                if (itemError?.units)
                                                    toast.error(`Item ${index + 1}: ${itemError.units}`);
                                            });
                                        }
                                    } else if (submitCount > 0 && Object.keys(errors).length === 0) {
                                        // Reset validation error flag when errors are fixed
                                        submissionStateRef.current.hasValidationErrors = false;
                                    }
                                }, [submitCount, errors, isSubmitting]);

                                return (
                                    <>
                                        <div className="po-form-header">
                                            <h2>Create Work Order</h2>
                                            <div className="date-container">
                                                <span className="date-label">Date:</span>
                                                <span className="po-date">{values.workOrderDate}</span>
                                            </div>
                                        </div>
                                        <Form>
                                            {/* Work Order Number and Date */}
                                            <div className="form-group-row">
                                                {/* <div className="field-wrapper">
                                                <label>Work Order No</label>
                                                <Field name="workOrderNumber" readOnly placeholder="Generated After Submission" />
                                            </div> */}
                                                <div className="field-wrapper">
                                                    {/* <label>Work Order Date</label>  */}
                                                    <Field name="workOrderDate" type="hidden" />
                                                </div>
                                            </div>

                                            {/* Receiver Section */}
                                            <h3>Receiver (Billed To)</h3>
                                            <div className="form-group-row">
                                                <div className="field-wrapper">
                                                    <label>Name</label>
                                                    <Field
                                                        name="receiver.name"
                                                        as="select"
                                                        onChange={(e) => handleCustomerSelect(e, setFieldValue)}
                                                    >
                                                        <option value="">Select Customer</option>
                                                        {customers.map(customer => (
                                                            <option key={customer.customerId} value={customer.customerName}>
                                                                {customer.customerName}
                                                            </option>
                                                        ))}
                                                    </Field>
                                                </div>
                                                <div className="field-wrapper">
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

                                            {/* Consignee Section */}
                                            {/* <h3>Consignee (Shipped To)</h3>
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
                                        </div> */}

                                            {/* Items Section */}
                                            <h3>Item Details</h3>
                                            <FieldArray name="items">
                                                {({ push, remove }) => (
                                                    <div className="form-items">
                                                        {values.items.map((_, index) => (
                                                            <div className="item-row" key={index}>
                                                                <Select
                                                                    className="react-select-container"
                                                                    classNamePrefix="react-select"
                                                                    options={bomProducts.map(bom => ({
                                                                        value: bom.productName,
                                                                        label: bom.productName,
                                                                        bomData: bom // Pass the full BOM data
                                                                    }))}
                                                                    onChange={(selectedOption) => handleItemSelect(selectedOption, index, setFieldValue)}
                                                                    placeholder="Products"
                                                                    isSearchable={true}
                                                                    noOptionsMessage={() => "No products found"}
                                                                />
                                                                <Field name={`items.${index}.description`} placeholder="Description" readOnly />
                                                                <Field name={`items.${index}.hsn`} placeholder="HSN Code" readOnly />
                                                                <Field name={`items.${index}.quantity`} type="number" placeholder="Qty" />
                                                                <Field name={`items.${index}.unitPrice`} type="number" placeholder="Unit Price" />
                                                                <Select
                                                                    className="react-select-container"
                                                                    classNamePrefix="react-select"
                                                                    options={UNIT_OPTIONS}
                                                                    onChange={(selectedOption) =>
                                                                        setFieldValue(`items.${index}.units`, selectedOption?.value || "")
                                                                    }
                                                                    placeholder="Units"
                                                                    isSearchable={true}
                                                                    noOptionsMessage={() => "No units found"}
                                                                />
                                                                {values.items.length > 1 && (
                                                                    <button type="button" className="remove-btn" onClick={() => remove(index)}>

                                                                        <FaTrash />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                        <button
                                                            type="button"
                                                            className="add-btn"
                                                            onClick={() => push({ name: "", description: "", hsn: "", quantity: 0, unitPrice: 0, units: "" })}
                                                        >
                                                            + Add Item
                                                        </button>
                                                    </div>
                                                )}
                                            </FieldArray>

                                            {/* Transport Details */}
                                            {/* <h3>Transport Details</h3>
                                        <div className="form-group-row">
                                            <div className="field-wrapper">
                                                <label>LR Number</label>
                                                <Field name="lrNumber" />
                                            </div>
                                            <div className="field-wrapper">
                                                <label>LR Date</label>
                                                <Field name="lrDate" type="date" />
                                            </div>
                                            <div className="field-wrapper">
                                                <label>Transporter</label>
                                                <Field name="transporter" />
                                            </div>
                                            <div className="field-wrapper">
                                                <label>Mobile</label>
                                                <Field name="transportMobile" />
                                            </div>
                                        </div> */}

                                            {/* Bank Details */}
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

                                            {/* Other Charges and Totals */}
                                            <div className="field-wrapper">
                                                <label>Other Charges</label>
                                                <Field name="otherCharges" type="number" />
                                            </div>

                                            <div className="totals">
                                                <p>Subtotal: ₹{calculateTotals(values.items, values.otherCharges, values.receiver.gstin).subtotal}</p>
                                                {calculateTotals(values.items, values.otherCharges, values.receiver.gstin).cgst > 0 && (
                                                    <p>CGST (9%): ₹{calculateTotals(values.items, values.otherCharges, values.receiver.gstin).cgst}</p>
                                                )}
                                                {calculateTotals(values.items, values.otherCharges, values.receiver.gstin).sgst > 0 && (
                                                    <p>SGST (9%): ₹{calculateTotals(values.items, values.otherCharges, values.receiver.gstin).sgst}</p>
                                                )}
                                                {calculateTotals(values.items, values.otherCharges, values.receiver.gstin).igst > 0 && (
                                                    <p>IGST (18%): ₹{calculateTotals(values.items, values.otherCharges, values.receiver.gstin).igst}</p>
                                                )}
                                                {values.otherCharges > 0 && (
                                                    <p>Other Charges: ₹{Number(values.otherCharges).toFixed(2)}</p>
                                                )}
                                                <p>Total: ₹{calculateTotals(values.items, values.otherCharges, values.receiver.gstin).total}</p>
                                            </div>

                                            <div className="submit-btn-container">
                                                <button
                                                    type="submit"
                                                    disabled={isSubmitting}
                                                    className={isSubmitting ? "submitting" : "submit-btn"}
                                                >
                                                    {isSubmitting ? "Submitting..." : "Submit Work Order"}
                                                </button>
                                            </div>
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
                                <th>Work Order No</th>
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
                                filteredWorkOrders.map((order) => (
                                    <tr
                                        key={order.workOrderNumber}
                                        onClick={() => setSelectedWorkOrder(order)}
                                        className={selectedWorkOrder?.workOrderNumber === order.workOrderNumber ? "selected" : ""}
                                    >
                                        <td>{order.workOrderNumber}</td>
                                        <td>{order.workOrderDate}</td>
                                        <td>{order.receiver?.name || 'N/A'}</td>
                                        <td>₹{order.total?.toFixed(2)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{ display: "none" }}>
                    {selectedWorkOrder && <WorkOrderPrint workOrder={selectedWorkOrder} />}
                </div>

                {selectedWorkOrder && (
                    <WorkOrderModal
                        workOrder={selectedWorkOrder}
                        onClose={() => setSelectedWorkOrder(null)}
                        onExport={handleExportPDF}
                    />
                )}
            </div>
        </Navbar>
    );
};

export default WorkOrder;