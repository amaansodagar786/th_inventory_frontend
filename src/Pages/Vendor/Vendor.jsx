import React, { useState, useEffect, useMemo } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import Navbar from "../../Components/Sidebar/Navbar";
import {
  FaUserTie, FaEnvelope, FaPhone, FaMapMarkerAlt,
  FaIdCard, FaPlus, FaFileExport, FaFileExcel, FaSearch
} from "react-icons/fa";
import html2pdf from "html2pdf.js";
import * as XLSX from "xlsx";
import "../Form/Form.scss";
import "./Vendor.scss";
import "react-toastify/dist/ReactToastify.css";

const Vendor = () => {
  const [showForm, setShowForm] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");



  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);




  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch Vendors
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/vendors/get-vendors`);
        const sortedData = response.data.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt)
            : (a._id?.getTimestamp ? new Date(a._id.getTimestamp()) : new Date(0));
          const dateB = b.createdAt ? new Date(b.createdAt)
            : (b._id?.getTimestamp ? new Date(b._id.getTimestamp()) : new Date(0));
          return dateB - dateA;
        });
        setVendors(sortedData);
      } catch (error) {
        console.error("Failed to fetch vendors:", error);
        toast.error("Failed to load vendor data.");
      }
    };
    fetchVendors();
  }, []);

  // Filter vendors
  const filteredVendors = useMemo(() => {
    if (!debouncedSearch) return vendors;
    return vendors.filter((v) =>
      v.vendorName?.toLowerCase().includes(debouncedSearch) ||
      v.gstNumber?.toLowerCase().includes(debouncedSearch) ||
      v.email?.toLowerCase().includes(debouncedSearch) ||
      v.contactNumber?.toLowerCase().includes(debouncedSearch) ||
      v.address?.toLowerCase().includes(debouncedSearch)
    );
  }, [debouncedSearch, vendors]);

  // Submit vendor
  const initialValues = {
    vendorName: "",
    companyName: "",
    gstNumber: "",
    email: "",         // Primary email (validated)
    email2: "",        // Secondary email (optional)
    email3: "",        // Tertiary email (optional)
    contactNumber: "", // Primary contact (validated)
    contactNumber2: "",// Secondary contact (optional)
    contactNumber3: "",// Tertiary contact (optional)
    address: "",
  };

const validationSchema = Yup.object({
  vendorName: Yup.string()
    .required("Vendor Name is required"),

  email: Yup.string()
    .email("Invalid email")
    .required("Email is required"),

  contactNumber: Yup.string()
    .matches(/^[0-9]+$/, "Contact Number must contain only digits")
    .min(10, "Contact Number must be at least 10 digits")
    // .max(10, "Contact Number must be exactly 10 digits") 
    .required("Contact Number is required"),

  companyName: Yup.string(),

  gstNumber: Yup.string()
    .matches(/^[0-9A-Z]+$/, "GST Number must contain only uppercase letters and digits")
    .min(15, "GST Number must be 15 characters")
    .max(15, "GST Number must be 15 characters"),

  email2: Yup.string().email("Invalid email"),
  email3: Yup.string().email("Invalid email"),

  contactNumber2: Yup.string()
    .matches(/^[0-9]+$/, "Contact Number must contain only digits")
    .min(10, "Contact Number must be at least 10 digits") ,
    // .max(10, "Contact Number must be exactly 10 digits"), 

  contactNumber3: Yup.string()
    .matches(/^[0-9]+$/, "Contact Number must contain only digits")
    .min(10, "Contact Number must be at least 10 digits") ,
    // .max(10, "Contact Number must be exactly 10 digits"), 

  address: Yup.string(),
});


  // Update handleSubmit function
  const handleSubmit = async (values, { resetForm, setFieldError }) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/vendors/create-vendors`,
        values
      );

      setVendors((prev) => [response.data, ...prev]);
      toast.success("Vendor submitted successfully!");
      resetForm();
      setShowForm(false);
    } catch (error) {
      if (error.response && error.response.data.field === "email") {
        const errorMessage = "Vendor with this email already exists";
        setFieldError("email", errorMessage);
        toast.error(errorMessage);
      } else {
        console.error("Error submitting vendor:", error);
        toast.error(error.response?.data?.message || "Failed to submit vendor.");
      }
    }
  };

  const selectVendor = (vendorId) => {
    setSelectedVendor((prev) => (prev === vendorId ? null : vendorId));
  };

  // Export PDF
  const exportSelectedAsPDF = () => {
    if (!selectedVendor) {
      toast.warning("Please select a vendor to export");
      return;
    }
    const vendor = vendors.find((v) => v.vendorId === selectedVendor);

    const content = `
  <div style="font-family: 'Arial', sans-serif; padding: 30px; background: #fff;">
    <h1 style="color: #3f3f91; text-align: center; margin-bottom: 20px; font-size: 24px;">
      Vendor Details
    </h1>
    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
      <h2 style="color: #3f3f91; margin-bottom: 15px; font-size: 20px;">
        ${vendor.vendorName}
      </h2>
      <hr style="border: none; border-top: 1px solid #eee; margin-bottom: 15px;" />
      <p><strong>Company Name:</strong> ${vendor.companyName || 'N/A'}</p>
      <p><strong>GST Number:</strong> ${vendor.gstNumber || 'N/A'}</p>
      <p><strong>Primary Email:</strong> ${vendor.email || 'N/A'}</p>
      ${vendor.email2 ? `<p><strong>Secondary Email:</strong> ${vendor.email2}</p>` : ''}
      ${vendor.email3 ? `<p><strong>Tertiary Email:</strong> ${vendor.email3}</p>` : ''}
      <p><strong>Primary Contact:</strong> ${vendor.contactNumber || 'N/A'}</p>
      ${vendor.contactNumber2 ? `<p><strong>Secondary Contact:</strong> ${vendor.contactNumber2}</p>` : ''}
      ${vendor.contactNumber3 ? `<p><strong>Tertiary Contact:</strong> ${vendor.contactNumber3}</p>` : ''}
      <p><strong>Address:</strong> ${vendor.address || 'N/A'}</p>
    </div>
  </div>`;

    const opt = {
      margin: 10,
      filename: `${vendor.vendorName}_details.pdf`,
      image: { type: "jpeg", quality: 1 },
      html2canvas: { scale: 3 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    html2pdf().from(content).set(opt).save();
  };

  // Export All Excel
  const exportAllAsExcel = () => {
    if (vendors.length === 0) {
      toast.warning("No vendors to export");
      return;
    }
    const data = vendors.map((vendor) => ({
      "Vendor Name": vendor.vendorName,
      "Company Name": vendor.companyName,
      "GST Number": vendor.gstNumber,
      "Primary Email": vendor.email,
      "Secondary Email": vendor.email2,
      "Tertiary Email": vendor.email3,
      "Primary Contact": vendor.contactNumber,
      "Secondary Contact": vendor.contactNumber2,
      "Tertiary Contact": vendor.contactNumber3,
      "Address": vendor.address,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendors");
    XLSX.writeFile(workbook, "all_vendors.xlsx");
  };


  const VendorModal = ({ vendor, onClose, onExport }) => {
    useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'auto';
      };
    }, []);

    if (!vendor) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">Vendor Details: {vendor.vendorName}</div>
            <button className="modal-close" onClick={onClose}>
              &times;
            </button>
          </div>

          <div className="modal-body">
            <div className="wo-details-grid">
              <div className="detail-row">
                <span className="detail-label">Vendor Name:</span>
                <span className="detail-value">{vendor.vendorName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Company Name:</span>
                <span className="detail-value">{vendor.companyName || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">GST Number:</span>
                <span className="detail-value">{vendor.gstNumber || 'N/A'}</span>
              </div>

              {/* Email Fields */}
              <div className="detail-row">
                <span className="detail-label">Primary Email:</span>
                <span className="detail-value">{vendor.email || 'N/A'}</span>
              </div>
              {vendor.email2 && (
                <div className="detail-row">
                  <span className="detail-label">Secondary Email:</span>
                  <span className="detail-value">{vendor.email2}</span>
                </div>
              )}
              {vendor.email3 && (
                <div className="detail-row">
                  <span className="detail-label">Tertiary Email:</span>
                  <span className="detail-value">{vendor.email3}</span>
                </div>
              )}

              {/* Contact Fields */}
              <div className="detail-row">
                <span className="detail-label">Primary Contact:</span>
                <span className="detail-value">{vendor.contactNumber || 'N/A'}</span>
              </div>
              {vendor.contactNumber2 && (
                <div className="detail-row">
                  <span className="detail-label">Secondary Contact:</span>
                  <span className="detail-value">{vendor.contactNumber2}</span>
                </div>
              )}
              {vendor.contactNumber3 && (
                <div className="detail-row">
                  <span className="detail-label">Tertiary Contact:</span>
                  <span className="detail-value">{vendor.contactNumber3}</span>
                </div>
              )}

              <div className="detail-row">
                <span className="detail-label">Address:</span>
                <span className="detail-value">{vendor.address || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Created At:</span>
                <span className="detail-value">
                  {new Date(vendor.createdAt || vendor._id?.getTimestamp()).toLocaleDateString()}
                </span>
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
          <h2>Vendor List</h2>
          <div className="right-section">
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search Vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="page-actions">
              {/* <button className="export-btn" onClick={exportSelectedAsPDF}>
                <FaFileExport /> Export
              </button> */}
              <button className="export-all-btn" onClick={exportAllAsExcel}>
                <FaFileExcel /> Export All
              </button>
              <button className="add-btn" onClick={() => setShowForm(!showForm)}>
                <FaPlus /> {showForm ? "Close" : "Add Vendor"}
              </button>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="form-container premium">
            <h2>Add Vendor</h2>
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              <Form>
                {/* Vendor Name + Company Name (unchanged) */}
                <div className="form-row">
                  <div className="form-field">
                    <label><FaUserTie /> Vendor Name *</label>
                    <Field name="vendorName" type="text" />
                    <ErrorMessage name="vendorName" component="div" className="error" />
                  </div>
                  <div className="form-field">
                    <label><FaIdCard /> Company Name</label>
                    <Field name="companyName" type="text" />
                  </div>
                </div>

                {/* Desktop: Original email+contact rows (shown on desktop) */}
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

                {/* Mobile: Grouped email fields (hidden on desktop) */}
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

                {/* Mobile: Grouped contact fields (hidden on desktop) */}
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

                {/* GST + Address (unchanged) */}
                <div className="form-row">
                  <div className="form-field">
                    <label><FaIdCard /> GST Number</label>
                    <Field name="gstNumber" type="text" />
                  </div>
                  <div className="form-field">
                    <label><FaMapMarkerAlt /> Address</label>
                    <Field name="address" as="textarea" rows="3" />
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
              {filteredVendors.map((vendor, index) => (
                <tr
                  key={vendor.vendorId || index}
                  className={selectedVendor === vendor.vendorId ? "selected" : ""}
                  onClick={() => selectVendor(vendor.vendorId)}
                >
                  <td>{vendor.vendorName}</td>
                  <td>{vendor.companyName}</td>
                  <td>{vendor.gstNumber}</td>
                  <td>{vendor.email}</td>
                  <td>{vendor.contactNumber}</td>
                  <td>{vendor.address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


        {selectedVendor && (
          <VendorModal
            vendor={vendors.find(v => v.vendorId === selectedVendor)}
            onClose={() => setSelectedVendor(null)}
            onExport={exportSelectedAsPDF}
          />
        )}
      </div>
    </Navbar>
  );
};

export default Vendor;
