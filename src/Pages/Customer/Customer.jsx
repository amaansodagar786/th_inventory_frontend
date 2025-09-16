import React, { useState, useEffect, useMemo } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast, ToastContainer } from "react-toastify";
import {
  FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt,
  FaIdCard, FaPlus, FaFileExport, FaFileExcel, FaSearch, FaEdit, FaSave, FaTrash
} from "react-icons/fa";
import html2pdf from "html2pdf.js";
import * as XLSX from "xlsx";
import Navbar from "../../Components/Sidebar/Navbar";
import "../Form/Form.scss";
import "./Customer.scss";
import "react-toastify/dist/ReactToastify.css";

const Customer = () => {
  const [showForm, setShowForm] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);



  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);



  // Debounce logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim().toLowerCase());
      setCurrentPage(1); // Reset to first page when search changes
    }, 300); // 300ms delay
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/customer/get-customers`
        );
        const data = await response.json();

        // Sort by creation date (newest first)
        const sortedData = data.sort((a, b) => {
          const dateA = a.createdAt
            ? new Date(a.createdAt)
            : new Date(a._id.getTimestamp());
          const dateB = b.createdAt
            ? new Date(b.createdAt)
            : new Date(b._id.getTimestamp());
          return dateB - dateA;
        });

        setCustomers(sortedData);
      } catch (err) {
        console.error("Error fetching customers:", err);
        toast.error("Failed to fetch customers");
      }
    };
    fetchCustomers();
  }, []);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    if (!debouncedSearch) return customers;

    return customers.filter((cust) => {
      return (
        cust.customerName?.toLowerCase().includes(debouncedSearch) ||
        cust.gstNumber?.toLowerCase().includes(debouncedSearch) ||
        cust.email?.toLowerCase().includes(debouncedSearch) ||
        cust.companyName?.toLowerCase().includes(debouncedSearch) ||
        cust.contactNumber?.toLowerCase().includes(debouncedSearch) ||
        cust.address?.toLowerCase().includes(debouncedSearch)
      );
    });
  }, [debouncedSearch, customers]);

  const paginatedCustomers = useMemo(() => {
    // If searching, show all filtered results without pagination
    if (debouncedSearch) return filteredCustomers;

    // Otherwise, apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(0, startIndex + itemsPerPage);
  }, [filteredCustomers, currentPage, itemsPerPage, debouncedSearch]);

  // Check if there are more customers to load
  const hasMoreCustomers = useMemo(() => {
    return debouncedSearch ? false : currentPage * itemsPerPage < filteredCustomers.length;
  }, [currentPage, itemsPerPage, filteredCustomers.length, debouncedSearch]);


  const loadMoreCustomers = () => {
    setCurrentPage(prev => prev + 1);
  };


  // Handle row selection
  const selectCustomer = (customerId) => {
    setSelectedCustomer((prev) => (prev === customerId ? null : customerId));
  };

  // Export single customer as PDF
  // Export single customer as PDF
  const exportAsPdf = () => {
    if (!selectedCustomer) {
      toast.warning("Please select a customer first");
      return;
    }

    const customer = customers.find((c) => c.customerId === selectedCustomer);

    const content = `
  <div style="font-family: 'Arial', sans-serif; padding: 30px; background: #fff; max-width: 800px; margin: 0 auto;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #3f3f91; margin: 0; font-size: 28px; font-weight: bold;">Customer Details</h1>
      <div style="height: 3px; background: linear-gradient(90deg, #3f3f91, #6a6ac5); width: 100px; margin: 10px auto;"></div>
    </div>
    
    <div style="border: 2px solid #3f3f91; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
      <div style="background: #3f3f91; padding: 15px; color: white;">
        <h2 style="margin: 0; font-size: 22px;">${customer.customerName || 'N/A'}</h2>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">${customer.companyName || 'N/A'}</p>
      </div>
      
      <div style="padding: 25px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div>
            <h3 style="color: #3f3f91; margin: 0 0 15px 0; font-size: 18px; border-bottom: 1px solid #eee; padding-bottom: 8px;">Contact Information</h3>
            
            <div style="margin-bottom: 12px;">
              <div style="font-weight: bold; color: #555; margin-bottom: 4px;">Primary Email</div>
              <div>${customer.email || 'N/A'}</div>
            </div>
            
            ${customer.email2 ? `
            <div style="margin-bottom: 12px;">
              <div style="font-weight: bold; color: #555; margin-bottom: 4px;">Secondary Email</div>
              <div>${customer.email2}</div>
            </div>
            ` : ''}
            
            ${customer.email3 ? `
            <div style="margin-bottom: 12px;">
              <div style="font-weight: bold; color: #555; margin-bottom: 4px;">Tertiary Email</div>
              <div>${customer.email3}</div>
            </div>
            ` : ''}
            
            <div style="margin-bottom: 12px;">
              <div style="font-weight: bold; color: #555; margin-bottom: 4px;">Primary Contact</div>
              <div>${customer.contactNumber || 'N/A'}</div>
            </div>
            
            ${customer.contactNumber2 ? `
            <div style="margin-bottom: 12px;">
              <div style="font-weight: bold; color: #555; margin-bottom: 4px;">Secondary Contact</div>
              <div>${customer.contactNumber2}</div>
            </div>
            ` : ''}
            
            ${customer.contactNumber3 ? `
            <div style="margin-bottom: 12px;">
              <div style="font-weight: bold; color: #555; margin-bottom: 4px;">Tertiary Contact</div>
              <div>${customer.contactNumber3}</div>
            </div>
            ` : ''}
          </div>
          
          <div>
            <h3 style="color: #3f3f91; margin: 0 0 15px 0; font-size: 18px; border-bottom: 1px solid #eee; padding-bottom: 8px;">Company Details</h3>
            
            <div style="margin-bottom: 12px;">
              <div style="font-weight: bold; color: #555; margin-bottom: 4px;">GST Number</div>
              <div>${customer.gstNumber || 'N/A'}</div>
            </div>
            
            <div style="margin-bottom: 12px;">
              <div style="font-weight: bold; color: #555; margin-bottom: 4px;">Address</div>
              <div>${customer.address || 'N/A'}</div>
            </div>
            
            <div style="margin-bottom: 12px;">
              <div style="font-weight: bold; color: #555; margin-bottom: 4px;">City</div>
              <div>${customer.city || 'N/A'}</div>
            </div>
            
            <div style="margin-bottom: 12px;">
              <div style="font-weight: bold; color: #555; margin-bottom: 4px;">Pincode</div>
              <div>${customer.pincode || 'N/A'}</div>
            </div>
            
            <div style="margin-bottom: 12px;">
              <div style="font-weight: bold; color: #555; margin-bottom: 4px;">Created Date</div>
              <div>${new Date(customer.createdAt || customer._id?.getTimestamp()).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
        
        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; text-align: center; margin-top: 20px; border: 1px dashed #ddd;">
          <div style="font-style: italic; color: #777;">Generated on ${new Date().toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  </div>`;

    const opt = {
      margin: 10,
      filename: `${customer.customerName}_details.pdf`,
      image: { type: "jpeg", quality: 1 },
      html2canvas: { scale: 3 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    html2pdf().from(content).set(opt).save();
  };

  // Export all customers as Excel
  const exportAllAsExcel = () => {
    // Use filteredCustomers instead of customers
    const dataToExport = filteredCustomers.length > 0 ? filteredCustomers : customers;

    if (dataToExport.length === 0) {
      toast.warning("No customers to export");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      dataToExport.map((customer) => ({
        Name: customer.customerName,
        "Company Name": customer.companyName,
        "GST No.": customer.gstNumber,
        "Primary Email": customer.email,
        "Secondary Email": customer.email2,
        "Tertiary Email": customer.email3,
        "Primary Contact": customer.contactNumber,
        "Secondary Contact": customer.contactNumber2,
        "Tertiary Contact": customer.contactNumber3,
        "Address": customer.address,
        "City": customer.city,
        "Pincode": customer.pincode,
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

    // Use appropriate filename based on whether filtered or all
    const fileName = debouncedSearch ? "filtered_customers.xlsx" : "all_customers.xlsx";
    XLSX.writeFile(workbook, fileName);
  };

  // Form initial values
  const initialValues = {
    customerName: "",
    companyName: "",
    gstNumber: "",
    email: "",         // Primary email (validated)
    email2: "",        // Secondary email (optional)
    email3: "",        // Tertiary email (optional)
    contactNumber: "", // Primary contact (validated)
    contactNumber2: "",// Secondary contact (optional)
    contactNumber3: "",// Tertiary contact (optional)
    address: "",
    city: "",       // New field
    pincode: "",
  };

  // Validation schema
  const validationSchema = Yup.object({
    customerName: Yup.string()
      .required("Customer Name is required")
      .matches(/^[a-zA-Z\s]*$/, "Customer Name cannot contain numbers"),
    email: Yup.string()
      .email("Invalid email")
      .required("Primary Email is required"),
    contactNumber: Yup.string()
      .required("Primary Contact is required")
      .matches(/^[0-9]+$/, "Must be only digits")
      .min(10, "Must be exactly 10 digits")
      .max(10, "Must be exactly 10 digits"),
    gstNumber: Yup.string()
      .required("GST Number is required")
      .matches(/^[0-9A-Za-z]*$/, "Only alphanumeric characters allowed")
      .length(15, "GST number must be exactly 15 characters"),
    address: Yup.string().required("Address is required"),
    city: Yup.string()
      .required("City is required")
      .matches(/^[a-zA-Z\s]*$/, "City cannot contain numbers"),
    pincode: Yup.string()
      .required("Pincode is required")
      .matches(/^[0-9]{6}$/, "Pincode must be exactly 6 digits"),

    // Optional fields
    companyName: Yup.string()
      .matches(/^[a-zA-Z\s]*$/, "Company Name cannot contain numbers"),

    email2: Yup.string().email("Invalid email"),
    email3: Yup.string().email("Invalid email"),
    contactNumber2: Yup.string()
      .matches(/^[0-9]*$/, "Must be only digits")
      .min(10, "Must be exactly 10 digits")
      .max(10, "Must be exactly 10 digits"),
    contactNumber3: Yup.string()
      .matches(/^[0-9]*$/, "Must be only digits")
      .min(10, "Must be exactly 10 digits")
      .max(10, "Must be exactly 10 digits"),
  });

  // Handle form submission

  const handleSubmit = async (values, { resetForm, setFieldError }) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/customer/create-customer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.field === "email") {
          const errorMessage = "Customer with this email already exists";
          setFieldError("email", errorMessage);
          toast.error(errorMessage); // Show toast notification
        } else {
          throw new Error(data.message || "Failed to add customer");
        }
        return;
      }

      const savedCustomer = data;
      setCustomers((prev) => [savedCustomer, ...prev]);
      toast.success("Customer added successfully!");
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error("Error adding customer:", error);
      toast.error(error.message || "Error creating customer");
    }
  };

  // Add these functions to your Customer component
  const handleUpdateCustomer = async (updatedCustomer) => {
    try {
      const customerId = updatedCustomer.customerId;

      // Remove both timestamp fields that cause issues
      const dataToSend = { ...updatedCustomer };
      delete dataToSend.createdAt;
      delete dataToSend.updatedAt; // Add this line!

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/customer/update-customer/${customerId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataToSend),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update customer");
      }

      const data = await response.json();
      setCustomers(prev =>
        prev.map(cust =>
          cust.customerId === updatedCustomer.customerId ? data : cust
        )
      );
      toast.success("Customer updated successfully!");
    } catch (error) {
      console.error("Error updating customer:", error);
      toast.error(error.message || "Error updating customer");
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/customer/delete-customer/${customerId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete customer");
      }

      setCustomers(prev =>
        prev.filter(cust => cust.customerId !== customerId)
      );
      setSelectedCustomer(null);
      toast.success("Customer deleted successfully!");
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast.error(error.message || "Error deleting customer");
    }
  };




  const CustomerModal = ({ customer, onClose, onExport, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedCustomer, setEditedCustomer] = useState({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [errors, setErrors] = useState({}); // Initialize errors state

    useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'auto';
      };
    }, []);

    useEffect(() => {
      if (customer) {
        setEditedCustomer({ ...customer });
        setErrors({}); // Reset errors when customer changes
      }
    }, [customer]);

    // Validation function for the modal form
    const validateForm = (values) => {
      const newErrors = {};

      // Required fields validation
      if (!values.customerName) newErrors.customerName = "Customer Name is required";
      else if (!/^[a-zA-Z\s]*$/.test(values.customerName)) newErrors.customerName = "Customer Name cannot contain numbers";

      if (values.companyName && !/^[a-zA-Z\s]*$/.test(values.companyName))
        newErrors.companyName = "Company Name cannot contain numbers";

      if (!values.email) newErrors.email = "Primary Email is required";
      else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email))
        newErrors.email = "Invalid email address";

      if (!values.contactNumber) newErrors.contactNumber = "Primary Contact is required";
      else if (!/^[0-9]+$/.test(values.contactNumber)) newErrors.contactNumber = "Must be only digits";
      else if (values.contactNumber.length !== 10) newErrors.contactNumber = "Must be exactly 10 digits";

      if (!values.gstNumber) newErrors.gstNumber = "GST Number is required";
      else if (values.gstNumber.length !== 15) newErrors.gstNumber = "GST number must be exactly 15 characters";

      if (!values.address) newErrors.address = "Address is required";

      if (!values.city) newErrors.city = "City is required";
      else if (!/^[a-zA-Z\s]*$/.test(values.city)) newErrors.city = "City cannot contain numbers";

      if (!values.pincode) newErrors.pincode = "Pincode is required";
      else if (!/^[0-9]{6}$/.test(values.pincode)) newErrors.pincode = "Pincode must be exactly 6 digits";

      // Optional fields validation
      if (values.email2 && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email2))
        newErrors.email2 = "Invalid email address";

      if (values.email3 && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email3))
        newErrors.email3 = "Invalid email address";

      if (values.contactNumber2 && !/^[0-9]*$/.test(values.contactNumber2))
        newErrors.contactNumber2 = "Must be only digits";
      else if (values.contactNumber2 && values.contactNumber2.length !== 10)
        newErrors.contactNumber2 = "Must be exactly 10 digits";

      if (values.contactNumber3 && !/^[0-9]*$/.test(values.contactNumber3))
        newErrors.contactNumber3 = "Must be only digits";
      else if (values.contactNumber3 && values.contactNumber3.length !== 10)
        newErrors.contactNumber3 = "Must be exactly 10 digits";

      return newErrors;
    };

    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setEditedCustomer(prev => ({ ...prev, [name]: value }));

      // Validate the field in real-time
      const fieldErrors = validateForm({ ...editedCustomer, [name]: value });
      setErrors(prev => ({ ...prev, [name]: fieldErrors[name] }));
    };

    const handleSave = async () => {
      const formErrors = validateForm(editedCustomer);
      if (Object.keys(formErrors).length > 0) {
        setErrors(formErrors);
        toast.error("Please fix the errors before saving");
        return;
      }

      try {
        await onUpdate(editedCustomer);
        setIsEditing(false);
        setErrors({});
      } catch (error) {
        console.error("Error updating customer:", error);
      }
    };

    if (!customer) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">
              {isEditing ? "Edit Customer" : `Customer Details: ${customer.customerName}`}
            </div>
            <button className="modal-close" onClick={onClose}>
              &times;
            </button>
          </div>

          <div className="modal-body">
            <div className="wo-details-grid">
              {/* Customer Name */}
              <div className="detail-row">
                <span className="detail-label">Customer Name *</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <input
                      type="text"
                      name="customerName"
                      value={editedCustomer.customerName || ''}
                      onChange={handleInputChange}
                      className={`edit-input ${errors.customerName ? 'error' : ''}`}
                    />
                    {errors.customerName && <div className="error-message">{errors.customerName}</div>}
                  </div>
                ) : (
                  <span className="detail-value">{customer.customerName}</span>
                )}
              </div>

              {/* Company Name */}
              <div className="detail-row">
                <span className="detail-label">Company Name</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <input
                      type="text"
                      name="companyName"
                      value={editedCustomer.companyName || ''}
                      onChange={handleInputChange}
                      className="edit-input"
                    />
                  </div>
                ) : (
                  <span className="detail-value">{customer.companyName || 'N/A'}</span>
                )}
              </div>

              {/* GST Number */}
              <div className="detail-row">
                <span className="detail-label">GST Number *</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <input
                      type="text"
                      name="gstNumber"
                      value={editedCustomer.gstNumber || ''}
                      onChange={handleInputChange}
                      className={`edit-input ${errors.gstNumber ? 'error' : ''}`}
                    />
                    {errors.gstNumber && <div className="error-message">{errors.gstNumber}</div>}
                  </div>
                ) : (
                  <span className="detail-value">{customer.gstNumber || 'N/A'}</span>
                )}
              </div>

              {/* Primary Email */}
              <div className="detail-row">
                <span className="detail-label">Primary Email *</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <input
                      type="email"
                      name="email"
                      value={editedCustomer.email || ''}
                      onChange={handleInputChange}
                      className={`edit-input ${errors.email ? 'error' : ''}`}
                    />
                    {errors.email && <div className="error-message">{errors.email}</div>}
                  </div>
                ) : (
                  <span className="detail-value">{customer.email || 'N/A'}</span>
                )}
              </div>

              {/* Secondary Email */}
              <div className="detail-row">
                <span className="detail-label">Secondary Email</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <input
                      type="email"
                      name="email2"
                      value={editedCustomer.email2 || ''}
                      onChange={handleInputChange}
                      className={`edit-input ${errors.email2 ? 'error' : ''}`}
                    />
                    {errors.email2 && <div className="error-message">{errors.email2}</div>}
                  </div>
                ) : (
                  <span className="detail-value">{customer.email2 || 'N/A'}</span>
                )}
              </div>

              {/* Tertiary Email */}
              <div className="detail-row">
                <span className="detail-label">Tertiary Email</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <input
                      type="email"
                      name="email3"
                      value={editedCustomer.email3 || ''}
                      onChange={handleInputChange}
                      className={`edit-input ${errors.email3 ? 'error' : ''}`}
                    />
                    {errors.email3 && <div className="error-message">{errors.email3}</div>}
                  </div>
                ) : (
                  <span className="detail-value">{customer.email3 || 'N/A'}</span>
                )}
              </div>

              {/* Primary Contact */}
              <div className="detail-row">
                <span className="detail-label">Primary Contact *</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <input
                      type="text"
                      name="contactNumber"
                      value={editedCustomer.contactNumber || ''}
                      onChange={handleInputChange}
                      className={`edit-input ${errors.contactNumber ? 'error' : ''}`}
                    />
                    {errors.contactNumber && <div className="error-message">{errors.contactNumber}</div>}
                  </div>
                ) : (
                  <span className="detail-value">{customer.contactNumber || 'N/A'}</span>
                )}
              </div>

              {/* Secondary Contact */}
              <div className="detail-row">
                <span className="detail-label">Secondary Contact</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <input
                      type="text"
                      name="contactNumber2"
                      value={editedCustomer.contactNumber2 || ''}
                      onChange={handleInputChange}
                      className={`edit-input ${errors.contactNumber2 ? 'error' : ''}`}
                    />
                    {errors.contactNumber2 && <div className="error-message">{errors.contactNumber2}</div>}
                  </div>
                ) : (
                  <span className="detail-value">{customer.contactNumber2 || 'N/A'}</span>
                )}
              </div>

              {/* Tertiary Contact */}
              <div className="detail-row">
                <span className="detail-label">Tertiary Contact</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <input
                      type="text"
                      name="contactNumber3"
                      value={editedCustomer.contactNumber3 || ''}
                      onChange={handleInputChange}
                      className={`edit-input ${errors.contactNumber3 ? 'error' : ''}`}
                    />
                    {errors.contactNumber3 && <div className="error-message">{errors.contactNumber3}</div>}
                  </div>
                ) : (
                  <span className="detail-value">{customer.contactNumber3 || 'N/A'}</span>
                )}
              </div>

              {/* Address */}
              <div className="detail-row">
                <span className="detail-label">Address *</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <textarea
                      name="address"
                      value={editedCustomer.address || ''}
                      onChange={handleInputChange}
                      className={`edit-textarea ${errors.address ? 'error' : ''}`}
                      rows="3"
                    />
                    {errors.address && <div className="error-message">{errors.address}</div>}
                  </div>
                ) : (
                  <span className="detail-value">{customer.address || 'N/A'}</span>
                )}
              </div>

              {/* City */}
              <div className="detail-row">
                <span className="detail-label">City *</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <input
                      type="text"
                      name="city"
                      value={editedCustomer.city || ''}
                      onChange={handleInputChange}
                      className={`edit-input ${errors.city ? 'error' : ''}`}
                    />
                    {errors.city && <div className="error-message">{errors.city}</div>}
                  </div>
                ) : (
                  <span className="detail-value">{customer.city || 'N/A'}</span>
                )}
              </div>

              {/* Pincode */}
              <div className="detail-row">
                <span className="detail-label">Pincode *</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <input
                      type="text"
                      name="pincode"
                      value={editedCustomer.pincode || ''}
                      onChange={handleInputChange}
                      className={`edit-input ${errors.pincode ? 'error' : ''}`}
                    />
                    {errors.pincode && <div className="error-message">{errors.pincode}</div>}
                  </div>
                ) : (
                  <span className="detail-value">{customer.pincode || 'N/A'}</span>
                )}
              </div>

              {/* Created At */}
              <div className="detail-row">
                <span className="detail-label">Created At:</span>
                <span className="detail-value">
                  {new Date(customer.createdAt || customer._id?.getTimestamp()).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="export-btn" onClick={onExport}>
              <FaFileExport /> Export as PDF
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
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="confirm-dialog-overlay">
            <div className="confirm-dialog">
              <h3>Confirm Deletion</h3>
              <p>Are you sure you want to delete {customer.customerName}? This action cannot be undone.</p>
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
                    onDelete(customer.customerId);
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


  // Update the modal rendering part
  {
    selectedCustomer && (
      <CustomerModal
        customer={customers.find(c => c.customerId === selectedCustomer)}
        onClose={() => setSelectedCustomer(null)}
        onExport={exportAsPdf}
        onUpdate={handleUpdateCustomer}
        onDelete={handleDeleteCustomer}
      />
    )
  }
  return (
    <Navbar>
      <ToastContainer position="top-center" autoClose={3000} />
      <div className="main">
        <div className="page-header">
          <h2>Customer List</h2>
          <div className="right-section">
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search Customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="action-buttons-group">
              <button className="export-all-btn" onClick={exportAllAsExcel}>
                <FaFileExcel /> Export All
              </button>
              <button className="add-btn" onClick={() => setShowForm(!showForm)}>
                <FaPlus /> {showForm ? "Close" : "Add Customer"}
              </button>
            </div>
          </div>
        </div>


        {showForm && (
          <div className="form-container premium">
            <h2>Add Customer</h2>
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              <Form>
                {/* Customer Name + Company Name */}
                <div className="form-row">
                  <div className="form-field">
                    <label><FaUser /> Customer Name *</label>
                    <Field name="customerName" type="text" />
                    <ErrorMessage name="customerName" component="div" className="error" />
                  </div>
                  <div className="form-field">
                    <label><FaIdCard /> Company Name</label>
                    <Field name="companyName" type="text" />
                  </div>
                </div>

                {/* Desktop: Original email+contact rows */}
                <div className="form-row email-contact-row">
                  <div className="form-field">
                    <label><FaEnvelope /> Primary Email *</label>
                    <Field name="email" type="email" />
                    <ErrorMessage name="email" component="div" className="error" />
                  </div>
                  <div className="form-field">
                    <label><FaPhone /> Primary Contact *</label>
                    <Field name="contactNumber" type="text" />
                    <ErrorMessage name="contactNumber" component="div" className="error" />
                  </div>
                </div>

                <div className="form-row email-contact-row">
                  <div className="form-field">
                    <label><FaEnvelope /> Secondary Email</label>
                    <Field name="email2" type="email" />
                    <ErrorMessage name="email2" component="div" className="error" />
                  </div>
                  <div className="form-field">
                    <label><FaPhone /> Secondary Contact</label>
                    <Field name="contactNumber2" type="text" />
                    <ErrorMessage name="contactNumber2" component="div" className="error" />

                  </div>
                </div>

                <div className="form-row email-contact-row">
                  <div className="form-field">
                    <label><FaEnvelope /> Tertiary Email</label>
                    <Field name="email3" type="email" />
                    <ErrorMessage name="email3" component="div" className="error" />
                  </div>
                  <div className="form-field">
                    <label><FaPhone /> Tertiary Contact</label>
                    <Field name="contactNumber3" type="text" />
                    <ErrorMessage name="contactNumber3" component="div" className="error" />

                  </div>
                </div>

                {/* Mobile: Grouped email fields */}
                <div className="email-fields-group">
                  <div className="form-field">
                    <label><FaEnvelope /> Primary Email *</label>
                    <Field name="email" type="email" />
                    <ErrorMessage name="email" component="div" className="error" />
                  </div>
                  <div className="form-field">
                    <label><FaEnvelope /> Secondary Email</label>
                    <Field name="email2" type="email" />
                    <ErrorMessage name="email2" component="div" className="error" />
                  </div>
                  <div className="form-field">
                    <label><FaEnvelope /> Tertiary Email</label>
                    <Field name="email3" type="email" />
                    <ErrorMessage name="email3" component="div" className="error" />
                  </div>
                </div>

                {/* Mobile: Grouped contact fields */}
                <div className="contact-fields-group">
                  <div className="form-field">
                    <label><FaPhone /> Primary Contact *</label>
                    <Field name="contactNumber" type="text" />
                    <ErrorMessage name="contactNumber" component="div" className="error" />
                  </div>
                  <div className="form-field">
                    <label><FaPhone /> Secondary Contact</label>
                    <Field name="contactNumber2" type="text" />
                    <ErrorMessage name="contactNumber2" component="div" className="error" />

                  </div>
                  <div className="form-field">
                    <label><FaPhone /> Tertiary Contact</label>
                    <Field name="contactNumber3" type="text" />
                    <ErrorMessage name="contactNumber3" component="div" className="error" />

                  </div>
                </div>

                {/* GST + Address */}
                <div className="form-row">
                  <div className="form-field">
                    <label><FaIdCard /> GST Number *</label>
                    <Field name="gstNumber" type="text" />
                    <ErrorMessage name="gstNumber" component="div" className="error" />
                  </div>


                  <div className="form-field">
                    <label><FaMapMarkerAlt /> Address *</label>
                    <Field name="address" as="textarea" rows="3" />
                    <ErrorMessage name="address" component="div" className="error" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label><FaMapMarkerAlt /> City *</label>
                    <Field name="city" type="text" />
                    <ErrorMessage name="city" component="div" className="error" />
                  </div>

                  <div className="form-field">
                    <label><FaMapMarkerAlt /> Pincode *</label>
                    <Field name="pincode" type="text" />
                    <ErrorMessage name="pincode" component="div" className="error" />
                  </div>
                </div>

                <button type="submit">Submit</button>
              </Form>
            </Formik>
          </div>
        )}

        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>GST No.</th>
                <th>Email</th>
                <th>Contact</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.map((cust, index) => (
                <tr
                  key={cust.customerId || index}
                  className={
                    selectedCustomer === cust.customerId ? "selected" : ""
                  }
                  onClick={() => selectCustomer(cust.customerId)}
                >
                  <td>{cust.customerName}</td>
                  <td>{cust.companyName}</td>
                  <td>{cust.gstNumber}</td>
                  <td>{cust.email}</td>
                  <td>{cust.contactNumber}</td>
                  <td>{cust.address}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {hasMoreCustomers && (
            <div className="load-more-container">
              <button className="load-more-btn" onClick={loadMoreCustomers}>
                Load More
              </button>
            </div>
          )}
        </div>

        {selectedCustomer && (
          <CustomerModal
            customer={customers.find(c => c.customerId === selectedCustomer)}
            onClose={() => setSelectedCustomer(null)}
            onExport={exportAsPdf}
            onUpdate={handleUpdateCustomer}
            onDelete={handleDeleteCustomer}
          />
        )}

      </div>
    </Navbar>
  );
};

export default Customer;
