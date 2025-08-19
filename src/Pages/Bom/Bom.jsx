import React, { useState, useEffect, useRef, useMemo } from "react";
import { Formik, Form, Field, FieldArray } from "formik";
import * as Yup from "yup";
import { toast, ToastContainer } from "react-toastify";
import { FaPlus, FaFileExport, FaFileExcel, FaSearch, FaTrash } from "react-icons/fa";
import Navbar from "../../Components/Sidebar/Navbar";
import html2pdf from "html2pdf.js";
import BOMPrint from "./BOMPrint";
import "react-toastify/dist/ReactToastify.css";
import "./Bom.scss";
import axios from "axios";
import * as XLSX from "xlsx";

import Select from 'react-select';

const Bom = () => {
  const [boms, setBoms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedBOM, setSelectedBOM] = useState(null);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showLoader, setShowLoader] = useState(false);
  const loaderTimeoutRef = useRef(null);


  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);


  useEffect(() => {
    if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);

    if (searchTerm.trim()) {
      loaderTimeoutRef.current = setTimeout(() => {
        setShowLoader(true);
      }, 300);

      const searchTimeout = setTimeout(() => {
        if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);
        setDebouncedSearch(searchTerm.trim().toLowerCase());
        setShowLoader(false);
      }, 300);

      return () => {
        clearTimeout(searchTimeout);
        if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);
        setShowLoader(false);
      };
    } else {
      setDebouncedSearch("");
      setShowLoader(false);
    }
  }, [searchTerm]);



  // Fetch Items
  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/items/get-items`);
        const sortedItems = response.data.sort(
          (a, b) =>
            new Date(b.createdAt || b.date || Date.now()) -
            new Date(a.createdAt || a.date || Date.now())
        );
        setItems(sortedItems);
      } catch (error) {
        toast.error("Failed to fetch items");
        console.error("Error fetching items:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchItems();
  }, []);

  // Fetch BOMs
  useEffect(() => {
    const fetchBOMs = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/bom/get-boms`);
        setBoms(response.data.data);
      } catch (error) {
        toast.error("Failed to fetch BOMs");
        console.error("Error fetching BOMs:", error);
      }
    };
    fetchBOMs();
  }, []);

  // Initial values
  const initialValues = {
    productName: "",
    description: "",
    hsnCode: "",
    items: [
      {
        itemId: "",
        itemName: "",
        itemDescription: "",
        requiredQty: 0,
      },
    ],
  };

  // Validation schema
  // Update the validationSchema
  const validationSchema = Yup.object({
    productName: Yup.string().required("Product Name is required"),
    items: Yup.array()
      .of(
        Yup.object({
          itemName: Yup.string().required("Item name required"),
          requiredQty: Yup.number()
            .required("Required quantity is required")
            .moreThan(0, "Required quantity must be more than 0"),
        })
      )
      .min(1, "At least one item is required"), // Add this line
  });


  // Filter BOMs
  const filteredBOMs = useMemo(() => {
    if (!debouncedSearch) return boms;

    return boms.filter(bom => {
      // Check BOM fields
      if (bom.productName?.toLowerCase().includes(debouncedSearch)) return true;
      if (bom.description?.toLowerCase().includes(debouncedSearch)) return true;
      if (bom.hsnCode?.toLowerCase().includes(debouncedSearch)) return true;

      // Check items
      if (bom.items?.some(item =>
        item.itemName?.toLowerCase().includes(debouncedSearch) ||
        item.itemDescription?.toLowerCase().includes(debouncedSearch)
      )) return true;

      return false;
    });
  }, [debouncedSearch, boms]);

  // Item select handler
  const handleItemSelect = (selectedOption, index, setFieldValue) => {
    if (selectedOption) {
      setFieldValue(`items.${index}.itemId`, selectedOption.value);
      setFieldValue(`items.${index}.itemName`, selectedOption.label);
      setFieldValue(`items.${index}.itemDescription`, selectedOption.itemData.description);
    }
  };

  // Submit handler
  const handleSubmit = async (values, { resetForm }) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/bom/create-bom`,
        values
      );
      toast.success("BOM created successfully!");
      setBoms((prev) => [...prev, response.data.data]);
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error("Error saving BOM:", error);
      toast.error("Failed to save BOM");
    }
  };

  // Export PDF
  const handleExportPDF = () => {
    if (!selectedBOM) return toast.warn("Select a BOM to export");
    const element = document.getElementById("bom-pdf");
    html2pdf().from(element).set({ filename: `${selectedBOM.productName}.pdf` }).save();
  };

  // Export Excel
  const handleExportExcel = () => {
    if (boms.length === 0) {
      toast.warn("No BOMs to export");
      return;
    }

    const data = boms.map((bom) => ({
      "Product Name": bom.productName,
      Description: bom.description,
      "HSN Code": bom.hsnCode,
      "Items Count": bom.items?.length || 0,
      Components:
        bom.items?.map((item) => `${item.itemName} (${item.requiredQty})`).join(", ") ||
        "None",
      "Created At": new Date(bom.createdAt).toLocaleDateString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BOMs");

    worksheet["!cols"] = [
      { wch: 20 },
      { wch: 30 },
      { wch: 15 },
      { wch: 12 },
      { wch: 40 },
      { wch: 15 },
    ];

    XLSX.writeFile(workbook, "BOMs.xlsx");
    toast.success("Exported all BOMs to Excel");
  };

  const BOMModal = ({ bom, onClose, onExport }) => {
    useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'auto';
      };
    }, []);

    if (!bom) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">BOM: {bom.productName}</div>
            <button className="modal-close" onClick={onClose}>
              &times;
            </button>
          </div>

          <div className="modal-body">
            <div className="wo-details-grid">
              {/* Basic BOM Details */}
              <div className="detail-row">
                <span className="detail-label">Product Name:</span>
                <span className="detail-value">{bom.productName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Description:</span>
                <span className="detail-value">{bom.description || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">HSN Code:</span>
                <span className="detail-value">{bom.hsnCode || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Created At:</span>
                <span className="detail-value">
                  {new Date(bom.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Items Section */}
              <div className="section-header">Components</div>
              <div className="items-grid">
                {bom.items?.map((item, index) => (
                  <div key={index} className="item-card">
                    <div className="item-header">
                      <span className="item-name">{item.itemName}</span>
                      {/* <span className="item-id">ID: {item.itemId || 'N/A'}</span>  */}
                    </div>
                    <div className="item-details">
                      <span>Description: {item.itemDescription || 'N/A'}</span>
                      <span>Required Qty: {item.requiredQty}</span>
                    </div>
                  </div>
                ))}
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
          <h2>Bill of Material (BOM)</h2>
          <div className="right-section">
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search BOMs..."
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
                <FaPlus /> {showForm ? "Close BOM" : "Create BOM"}
              </button>
            </div>
          </div>
        </div>

        {isLoading && <div className="loading">Loading items...</div>}

        {showForm && (
          <div className="form-container premium">
            <h2>Create BOM</h2>
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              validateOnBlur={false}
              validateOnChange={false}
              onSubmit={handleSubmit}
            >
              {({ values, setFieldValue, errors, submitCount }) => {
                // Show toast errors when submit is attempted
                // Inside the Formik render function
                useEffect(() => {
                  if (submitCount > 0 && Object.keys(errors).length > 0) {
                    if (errors.productName) toast.error(errors.productName);

                    // Show items array validation error (like min 1 item)
                    if (typeof errors.items === 'string') {
                      toast.error(errors.items);
                    }

                    if (Array.isArray(errors.items)) {
                      errors.items.forEach((itemError, index) => {
                        if (itemError?.itemName)
                          toast.error(`Item ${index + 1}: ${itemError.itemName}`);
                        if (itemError?.requiredQty)
                          toast.error(`Item ${index + 1}: ${itemError.requiredQty}`);
                      });
                    }
                  }
                }, [submitCount, errors]);

                return (
                  <Form>
                    <div className="form-group-row">
                      <div className="grn-field-wrapper">
                        <label>Product Name</label>
                        <Field name="productName" />
                      </div>
                      <div className="grn-field-wrapper">
                        <label>Description</label>
                        <Field name="description" />
                      </div>
                      <div className="grn-field-wrapper">
                        <label>HSN/SAC Code</label>
                        <Field name="hsnCode" />
                      </div>
                    </div>

                    <FieldArray name="items">
                      {({ remove, push }) => (
                        <div className="form-items">
                          {values.items.map((item, index) => (
                            <div className="item-row" key={index}>
                              <div>
                                <label>Item Name</label>
                                <Select
                                  className="react-select-container"
                                  classNamePrefix="react-select"
                                  options={items.map(item => ({
                                    value: item.itemId,
                                    label: item.itemName,
                                    itemData: item
                                  }))}
                                  onChange={(selectedOption) => handleItemSelect(selectedOption, index, setFieldValue)}
                                  placeholder="Items"
                                  isSearchable={true}
                                  noOptionsMessage={() => "No items found"}
                                />
                              </div>

                              <div>
                                <label>Description</label>
                                <Field
                                  name={`items.${index}.itemDescription`}
                                  placeholder="Description"
                                />
                              </div>
                              <div>
                                <label>Required Qty</label>
                                <Field
                                  name={`items.${index}.requiredQty`}
                                  type="number"
                                  placeholder="Required Qty"
                                />
                              </div>
                              <div>
                                <label style={{ opacity: 0 }}>Delete</label>
                                {/* Only show delete button if there's more than 1 item */}
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
                            </div>
                          ))}
                          <button
                            type="button"
                            className="add-btn"
                            onClick={() =>
                              push({
                                itemId: "",
                                itemName: "",
                                itemDescription: "",
                                requiredQty: 0,
                              })
                            }
                          >
                            + Add Item
                          </button>
                        </div>
                      )}
                    </FieldArray>

                    <button type="submit">Submit BOM</button>
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
                <th>Product</th>
                <th>Description</th>
                <th>Items Count</th>
              </tr>
            </thead>
            <tbody>
              {showLoader ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="table-loader"></div>
                  </td>
                </tr>
              ) : (
                filteredBOMs.map((bom) => (
                  <tr
                    key={bom.productName}
                    onClick={() => setSelectedBOM(bom)}
                    className={selectedBOM?.productName === bom.productName ? "selected" : ""}
                  >
                    <td>{bom.productName}</td>
                    <td>{bom.description}</td>
                    <td>{bom.items?.length || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: "none" }}>
          {selectedBOM && <BOMPrint bom={selectedBOM} />}
        </div>

        {selectedBOM && (
          <BOMModal
            bom={selectedBOM}
            onClose={() => setSelectedBOM(null)}
            onExport={handleExportPDF}
          />
        )}
      </div>
    </Navbar>
  );
};

export default Bom;
