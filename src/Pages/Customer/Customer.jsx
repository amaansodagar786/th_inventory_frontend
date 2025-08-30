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



  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);



  // Debounce logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim().toLowerCase());
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
      // Only search in selected fields
      return (
        cust.customerName?.toLowerCase().includes(debouncedSearch) ||
        cust.gstNumber?.toLowerCase().includes(debouncedSearch) ||
        cust.email?.toLowerCase().includes(debouncedSearch)
      );
    });
  }, [debouncedSearch, customers]);

  // Handle row selection
  const selectCustomer = (customerId) => {
    setSelectedCustomer((prev) => (prev === customerId ? null : customerId));
  };

  // Export single customer as PDF
  const exportAsPdf = () => {
    if (!selectedCustomer) {
      toast.warning("Please select a customer first");
      return;
    }

    const customer = customers.find((c) => c.customerId === selectedCustomer);

    const content = `
<div style="font-family: 'Arial', sans-serif; padding: 30px; background: #fff;">
  <h1 style="color: #3f3f91; text-align: center; margin-bottom: 20px; font-size: 24px;">
    Customer Details
  </h1>

  <div style="border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
    <h2 style="color: #3f3f91; margin-bottom: 15px; font-size: 20px;">
      ${customer.customerName}
    </h2>
    <hr style="border: none; border-top: 1px solid #eee; margin-bottom: 15px;" />

    <p style="margin: 10px 0; font-size: 14px;">
      <strong>Company Name:</strong> ${customer.companyName || 'N/A'}
    </p>

    <p style="margin: 10px 0; font-size: 14px;">
      <strong>GST Number:</strong> ${customer.gstNumber || 'N/A'}
    </p>
    
    <p style="margin: 10px 0; font-size: 14px;">
      <strong>Primary Email:</strong> ${customer.email || 'N/A'}
    </p>
    ${customer.email2 ? `<p style="margin: 10px 0; font-size: 14px;">
      <strong>Secondary Email:</strong> ${customer.email2}
    </p>` : ''}
    ${customer.email3 ? `<p style="margin: 10px 0; font-size: 14px;">
      <strong>Tertiary Email:</strong> ${customer.email3}
    </p>` : ''}
    
    <p style="margin: 10px 0; font-size: 14px;">
      <strong>Primary Contact:</strong> ${customer.contactNumber || 'N/A'}
    </p>
    ${customer.contactNumber2 ? `<p style="margin: 10px 0; font-size: 14px;">
      <strong>Secondary Contact:</strong> ${customer.contactNumber2}
    </p>` : ''}
    ${customer.contactNumber3 ? `<p style="margin: 10px 0; font-size: 14px;">
      <strong>Tertiary Contact:</strong> ${customer.contactNumber3}
    </p>` : ''}
    
    <p style="margin: 10px 0; font-size: 14px;">
      <strong>Address:</strong> ${customer.address || 'N/A'}
    </p>

    <p style="margin: 10px 0; font-size: 14px;">
  <strong>City:</strong> ${customer.city || 'N/A'}
</p>
<p style="margin: 10px 0; font-size: 14px;">
  <strong>Pincode:</strong> ${customer.pincode || 'N/A'}
</p>
  </div>
</div>
`;

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
    if (customers.length === 0) {
      toast.warning("No customers to export");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      customers.map((customer) => ({
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
    XLSX.writeFile(workbook, "all_customers.xlsx");
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
    customerName: Yup.string().required("Customer Name is required"),
    email: Yup.string()
      .email("Invalid email")
      .required("Primary Email is required"),
    contactNumber: Yup.string()
      .required("Primary Contact is required")
      .matches(/^[0-9]+$/, "Must be only digits")
      .min(10, "Must be at least 10 digits"),
    gstNumber: Yup.string()
      .required("GST Number is required")
      .matches(/^[0-9A-Za-z]*$/, "Only alphanumeric characters allowed")
      .length(15, "GST number must be exactly 15 characters"),
    address: Yup.string().required("Address is required"),
    city: Yup.string().required("City is required"),
    pincode: Yup.string()
      .required("Pincode is required")
      .matches(/^[0-9]{6}$/, "Pincode must be exactly 6 digits"),

    // Optional fields
    companyName: Yup.string(),
    email2: Yup.string().email("Invalid email"),
    email3: Yup.string().email("Invalid email"),
    contactNumber2: Yup.string()
      .matches(/^[0-9]*$/, "Must be only digits")
      .min(10, "Must be at least 10 digits"),
    contactNumber3: Yup.string()
      .matches(/^[0-9]*$/, "Must be only digits")
      .min(10, "Must be at least 10 digits"),
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

    useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'auto';
      };
    }, []);

    useEffect(() => {
      if (customer) {
        setEditedCustomer({ ...customer });
      }
    }, [customer]);

    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setEditedCustomer(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
      try {
        await onUpdate(editedCustomer);
        setIsEditing(false);
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
                <span className="detail-label">Customer Name:</span>
                {isEditing ? (
                  <input
                    type="text"
                    name="customerName"
                    value={editedCustomer.customerName || ''}
                    onChange={handleInputChange}
                    className="edit-input"
                  />
                ) : (
                  <span className="detail-value">{customer.customerName}</span>
                )}
              </div>

              {/* Company Name */}
              <div className="detail-row">
                <span className="detail-label">Company Name:</span>
                {isEditing ? (
                  <input
                    type="text"
                    name="companyName"
                    value={editedCustomer.companyName || ''}
                    onChange={handleInputChange}
                    className="edit-input"
                  />
                ) : (
                  <span className="detail-value">{customer.companyName || 'N/A'}</span>
                )}
              </div>

              {/* GST Number */}
              <div className="detail-row">
                <span className="detail-label">GST Number:</span>
                {isEditing ? (
                  <input
                    type="text"
                    name="gstNumber"
                    value={editedCustomer.gstNumber || ''}
                    onChange={handleInputChange}
                    className="edit-input"
                  />
                ) : (
                  <span className="detail-value">{customer.gstNumber || 'N/A'}</span>
                )}
              </div>

              {/* Primary Email */}
              <div className="detail-row">
                <span className="detail-label">Primary Email:</span>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={editedCustomer.email || ''}
                    onChange={handleInputChange}
                    className="edit-input"
                  />
                ) : (
                  <span className="detail-value">{customer.email || 'N/A'}</span>
                )}
              </div>

              {/* Secondary Email */}
              {customer.email2 && (
                <div className="detail-row">
                  <span className="detail-label">Secondary Email:</span>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email2"
                      value={editedCustomer.email2 || ''}
                      onChange={handleInputChange}
                      className="edit-input"
                    />
                  ) : (
                    <span className="detail-value">{customer.email2}</span>
                  )}
                </div>
              )}

              {/* Tertiary Email */}
              {customer.email3 && (
                <div className="detail-row">
                  <span className="detail-label">Tertiary Email:</span>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email3"
                      value={editedCustomer.email3 || ''}
                      onChange={handleInputChange}
                      className="edit-input"
                    />
                  ) : (
                    <span className="detail-value">{customer.email3}</span>
                  )}
                </div>
              )}

              {/* Primary Contact */}
              <div className="detail-row">
                <span className="detail-label">Primary Contact:</span>
                {isEditing ? (
                  <input
                    type="text"
                    name="contactNumber"
                    value={editedCustomer.contactNumber || ''}
                    onChange={handleInputChange}
                    className="edit-input"
                  />
                ) : (
                  <span className="detail-value">{customer.contactNumber || 'N/A'}</span>
                )}
              </div>

              {/* Secondary Contact */}
              {customer.contactNumber2 && (
                <div className="detail-row">
                  <span className="detail-label">Secondary Contact:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="contactNumber2"
                      value={editedCustomer.contactNumber2 || ''}
                      onChange={handleInputChange}
                      className="edit-input"
                    />
                  ) : (
                    <span className="detail-value">{customer.contactNumber2}</span>
                  )}
                </div>
              )}

              {/* Tertiary Contact */}
              {customer.contactNumber3 && (
                <div className="detail-row">
                  <span className="detail-label">Tertiary Contact:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      name="contactNumber3"
                      value={editedCustomer.contactNumber3 || ''}
                      onChange={handleInputChange}
                      className="edit-input"
                    />
                  ) : (
                    <span className="detail-value">{customer.contactNumber3}</span>
                  )}
                </div>
              )}

              {/* Address */}
              <div className="detail-row">
                <span className="detail-label">Address:</span>
                {isEditing ? (
                  <textarea
                    name="address"
                    value={editedCustomer.address || ''}
                    onChange={handleInputChange}
                    className="edit-textarea"
                    rows="3"
                  />
                ) : (
                  <span className="detail-value">{customer.address || 'N/A'}</span>
                )}
              </div>

              {/* City */}
              <div className="detail-row">
                <span className="detail-label">City:</span>
                {isEditing ? (
                  <input
                    type="text"
                    name="city"
                    value={editedCustomer.city || ''}
                    onChange={handleInputChange}
                    className="edit-input"
                  />
                ) : (
                  <span className="detail-value">{customer.city || 'N/A'}</span>
                )}
              </div>

              {/* Pincode */}
              <div className="detail-row">
                <span className="detail-label">Pincode:</span>
                {isEditing ? (
                  <input
                    type="text"
                    name="pincode"
                    value={editedCustomer.pincode || ''}
                    onChange={handleInputChange}
                    className="edit-input"
                  />
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
            <div className="page-actions">
              {/* <button className="export-btn" onClick={exportAsPdf}>
                <FaFileExport /> Export
              </button> */}
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
                  </div>
                  <div className="form-field">
                    <label><FaPhone /> Tertiary Contact</label>
                    <Field name="contactNumber3" type="text" />
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
                    <label><FaMapMarkerAlt /> Address *</label> {/* Added asterisk to indicate required */}
                    <Field name="address" as="textarea" rows="3" />
                    <ErrorMessage name="address" component="div" className="error" /> {/* Added error message */}
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
              {filteredCustomers.map((cust, index) => (
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
