import React, { useState, useEffect, useRef, useMemo } from "react";
import { Formik, Form, Field, FieldArray } from "formik";
import * as Yup from "yup";
import { toast, ToastContainer } from "react-toastify";
import { FaPlus, FaFileExport, FaFileExcel, FaSearch, FaTrash, FaEdit, FaSave } from "react-icons/fa";
import Navbar from "../../Components/Sidebar/Navbar";
import html2pdf from "html2pdf.js";
import "react-toastify/dist/ReactToastify.css";
import "./Defective.scss";
import Select from 'react-select';
import axios from "axios";
import * as XLSX from 'xlsx';

const Defective = () => {
  const [defectiveItems, setDefectiveItems] = useState([]);
  const [restoredItems, setRestoredItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedDefective, setSelectedDefective] = useState(null);
  const [selectedSection, setSelectedSection] = useState("defectFinds"); // defectFinds or restoreDefects
  const [isEditingDefective, setIsEditingDefective] = useState(false);
  const [editedDefective, setEditedDefective] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showLoader, setShowLoader] = useState(false);
  const loaderTimeoutRef = useRef(null);

  const [inventoryData, setInventoryData] = useState({});



  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch Items and Inventory from backend
  useEffect(() => {
    const fetchItemsAndInventory = async () => {
      setIsLoading(true);
      try {
        // Fetch items
        const itemsResponse = await axios.get(`${import.meta.env.VITE_API_URL}/items/get-items`);
        const formattedItems = itemsResponse.data.map(item => ({
          id: item.itemId,
          name: item.itemName,
          description: item.description,
          hsnCode: item.hsnCode,
        }));
        setItems(formattedItems);

        // Fetch inventory to get current stock
        const inventoryResponse = await axios.get(`${import.meta.env.VITE_API_URL}/inventory/get-inventory`);

        // Create a map of itemId to currentStock
        const inventoryMap = {};

        if (inventoryResponse.data.success && Array.isArray(inventoryResponse.data.data)) {
          inventoryResponse.data.data.forEach(invItem => {
            inventoryMap[invItem.itemId] = invItem.currentStock;
          });
        } else {
          console.error("Unexpected inventory response structure:", inventoryResponse.data);
          toast.error("Unexpected inventory data format");
        }

        // Set inventory data to state
        setInventoryData(inventoryMap);
      } catch (error) {
        toast.error("Failed to fetch items or inventory data");
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchItemsAndInventory();
  }, []);
  // Submit handler


  // Fetch Defective Records
  // In the fetchDefectives function, update the data structure:
  useEffect(() => {
    const fetchDefectives = async () => {
      try {
        // Fetch defect finds
        const defectResponse = await axios.get(`${import.meta.env.VITE_API_URL}/defective/get-defectives`);
        const defectFinds = defectResponse.data.filter(item => item.type === "defectFinds");


        console.log("Raw backend response:", defectResponse.data);


        // Map the backend response to include both id and defectiveId for compatibility
        const formattedDefectFinds = defectFinds.map(item => ({
          ...item,
          id: item.defectiveId || item.id // Use defectiveId if available, fallback to id
        }));

        // Fetch restore records
        const restoreResponse = await axios.get(`${import.meta.env.VITE_API_URL}/defective/get-restore-defectives`);
        const restoreDefects = restoreResponse.data;

        setDefectiveItems(formattedDefectFinds);
        setRestoredItems(restoreDefects);

        // Debug log to check the structure
        console.log("Defective items:", formattedDefectFinds);
      } catch (error) {
        toast.error("Failed to fetch defective records");
        console.error("Error fetching defectives:", error);
      }
    };
    fetchDefectives();
  }, []);


  // Add this validation function for restore quantities
  // Update the validateRestoreQuantity function
  const validateRestoreQuantity = async (defectiveId, items) => {
    if (!defectiveId || !items || items.length === 0) return false;

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/defective/validate-restore`,
        { defectiveId, items }
      );

      if (response.data.errors && response.data.errors.length > 0) {
        response.data.errors.forEach(error => {
          toast.error(`${error.itemName || 'Item'}: ${error.error}`);
        });
        return false;
      }
      return true;
    } catch (error) {
      console.error("Validation error:", error);

      // Handle network errors or other issues
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => {
          toast.error(err.error || "Validation error");
        });
      } else {
        toast.error("Validation failed. Please check your quantities.");
      }

      return false;
    }
  };

  // Then call this validation before submitting in handleSubmit
  // for the restore section


  // Search functionality
  useEffect(() => {
    if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);

    if (searchTerm.trim()) {
      loaderTimeoutRef.current = setTimeout(() => {
        setShowLoader(true);
      }, 300);

      const searchTimeout = setTimeout(() => {
        if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);
        setDebouncedSearch(searchTerm.trim().toLowerCase());
        setCurrentPage(1);
        setShowLoader(false);
      }, 300);

      return () => {
        clearTimeout(searchTimeout);
        if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);
        setShowLoader(false);
      };
    } else {
      setDebouncedSearch("");
      setCurrentPage(1);
      setShowLoader(false);
    }
  }, [searchTerm]);

  // When defect options
  const whenDefectOptions = [
    { value: "During Production", label: "During Production" },
    { value: "After Storage(long time)", label: "After Storage(long time)" }
  ];

  // Reason options
  const reasonOptions = [
    { value: "Machine Error", label: "Machine Error" },
    { value: "Human Error", label: "Human Error" },
    { value: "Expired", label: "Expired" },
    { value: "Damaged in Storage", label: "Damaged in Storage" },
    { value: "Other", label: "Other" }
  ];

  // Initial values based on selected section
  const getInitialValues = () => {
    if (selectedSection === "defectFinds") {
      return {
        date: new Date().toISOString().split('T')[0],
        items: [
          {
            itemId: "",
            itemName: "",
            itemDescription: "",
            hsnCode: "",
            quantity: 0,
            whenDefect: "",
            reason: ""
          },
        ],
      };
    } else {
      return {
        date: new Date().toISOString().split('T')[0],
        defectiveId: "",
        items: []
      };
    }
  };

  // Validation schema based on selected section
  const getValidationSchema = () => {
    if (selectedSection === "defectFinds") {
      return Yup.object({
        date: Yup.date().required("Date is required"),
        items: Yup.array()
          .of(
            Yup.object({
              itemId: Yup.string().required("Item selection is required"),
              itemName: Yup.string().required("Item name is required"),
              quantity: Yup.number()
                .required("Quantity is required")
                .moreThan(0, "Quantity must be more than 0")
                .typeError("Quantity must be a number"),
              whenDefect: Yup.string().required("When defect is required"),
              reason: Yup.string().required("Reason is required"),
            })
          )
          .min(1, "At least one item is required"),
      });
    } else {
      return Yup.object({
        defectiveId: Yup.string().required("Defective reference is required"),
        items: Yup.array()
          .of(
            Yup.object({
              itemId: Yup.string().required("Item selection is required"),
              itemName: Yup.string().required("Item name is required"),
              quantity: Yup.number()
                .required("Quantity is required")
                .moreThan(0, "Quantity must be more than 0")
                .typeError("Quantity must be a number"),
            })
          )
          .min(1, "At least one item is required"),
      });
    }
  };

  // Filter items based on search
  const filteredItems = useMemo(() => {
    const itemsToFilter = selectedSection === "defectFinds" ? defectiveItems : restoredItems;

    if (!debouncedSearch) return itemsToFilter;

    return itemsToFilter.filter(item => {
      if (item.date?.toLowerCase().includes(debouncedSearch)) return true;
      if (item.id?.toString().includes(debouncedSearch)) return true;

      // Check items in the defective/restored entry
      if (item.items?.some(i =>
        i.itemName?.toLowerCase().includes(debouncedSearch) ||
        i.itemDescription?.toLowerCase().includes(debouncedSearch) ||
        i.hsnCode?.toLowerCase().includes(debouncedSearch) ||
        i.whenDefect?.toLowerCase().includes(debouncedSearch) ||
        i.reason?.toLowerCase().includes(debouncedSearch)
      )) return true;

      return false;
    });
  }, [debouncedSearch, defectiveItems, restoredItems, selectedSection]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    if (debouncedSearch) return filteredItems;

    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(0, startIndex + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage, debouncedSearch]);

  // Check if there are more items to load
  const hasMoreItems = useMemo(() => {
    return debouncedSearch ? false : currentPage * itemsPerPage < filteredItems.length;
  }, [currentPage, itemsPerPage, filteredItems.length, debouncedSearch]);

  const loadMoreItems = () => {
    setCurrentPage(prev => prev + 1);
  };


  // Get available items for selection
  const getAvailableItems = (currentItems, currentIndex) => {
    return items
      .filter(item => {
        return !currentItems.some((selectedItem, idx) =>
          idx !== currentIndex && selectedItem.itemId === item.id
        );
      })
      .map(item => ({
        value: item.id,
        label: item.name,
        itemData: item
      }));
  };

  // Item select handler
  const handleItemSelect = (selectedOption, index, values, setFieldValue) => {
    if (selectedOption) {
      setFieldValue(`items.${index}.itemId`, selectedOption.value);
      setFieldValue(`items.${index}.itemName`, selectedOption.label);
      setFieldValue(`items.${index}.itemDescription`, selectedOption.itemData.description);
      setFieldValue(`items.${index}.hsnCode`, selectedOption.itemData.hsnCode);
    } else {
      setFieldValue(`items.${index}.itemId`, "");
      setFieldValue(`items.${index}.itemName`, "");
      setFieldValue(`items.${index}.itemDescription`, "");
      setFieldValue(`items.${index}.hsnCode`, "");
    }
  };

  // Defective select handler for restore section
  // Add this function to calculate remaining quantities
  // Add this function to calculate remaining quantities
  const getRemainingQuantities = (defectiveId) => {
    if (!defectiveId) return {};

    const defectiveItem = defectiveItems.find(item =>
      item.defectiveId === defectiveId || item.id === defectiveId
    );

    if (!defectiveItem) return {};

    // Calculate already restored quantities for this defective record
    const restoredForThisDefective = restoredItems.filter(
      restore => restore.defectiveReferenceId === defectiveId
    );

    const remainingQuantities = {};

    // Initialize with original quantities
    defectiveItem.items.forEach(item => {
      remainingQuantities[item.itemId] = item.quantity;
    });

    // Subtract already restored quantities
    restoredForThisDefective.forEach(restore => {
      restore.items.forEach(restoreItem => {
        if (remainingQuantities[restoreItem.itemId]) {
          remainingQuantities[restoreItem.itemId] -= restoreItem.quantity;
        }
      });
    });

    return remainingQuantities;
  };

  // Update the handleDefectiveSelect function
  // Update the handleDefectiveSelect function
  const handleDefectiveSelect = (selectedOption, setFieldValue) => {
    if (selectedOption) {
      const defectiveItem = defectiveItems.find(item =>
        item.defectiveId === selectedOption.value || item.id === selectedOption.value
      );

      if (defectiveItem) {
        const remainingQuantities = getRemainingQuantities(selectedOption.value);

        // Only include items that still have remaining quantity
        const itemsWithRemaining = defectiveItem.items
          .filter(item => (remainingQuantities[item.itemId] || 0) > 0)
          .map(item => ({
            itemId: item.itemId,
            itemName: item.itemName,
            itemDescription: item.itemDescription,
            hsnCode: item.hsnCode,
            quantity: 0, // Start with 0, user can enter up to remaining
            maxQuantity: remainingQuantities[item.itemId] // Store max allowed
          }));

        console.log("Selected defective item:", defectiveItem);
        console.log("Remaining quantities:", remainingQuantities);
        console.log("Items to set:", itemsWithRemaining);

        setFieldValue("defectiveId", defectiveItem.defectiveId || defectiveItem.id);

        // Clear existing items first, then set new ones
        setFieldValue("items", []);

        // Use setTimeout to ensure the field array is properly updated
        setTimeout(() => {
          setFieldValue("items", itemsWithRemaining);
        }, 0);
      }
    } else {
      setFieldValue("defectiveId", "");
      setFieldValue("items", []);
    }
  };

  // Submit handler
  const handleSubmit = async (values, { resetForm, setSubmitting }) => {
    try {
      let endpoint;
      let payload;

      if (selectedSection === "defectFinds") {
        endpoint = `${import.meta.env.VITE_API_URL}/defective/create-defective`;
        payload = {
          ...values,
          type: selectedSection,
        };
      } else {
        // Validate restore quantities first
        const isValid = await validateRestoreQuantity(values.defectiveId, values.items);
        if (!isValid) {
          setSubmitting(false);
          return;
        }

        endpoint = `${import.meta.env.VITE_API_URL}/defective/create-restore-defective`;
        payload = {
          defectiveReferenceId: values.defectiveId,
          items: values.items,
          date: values.date,
        };
      }

      const response = await axios.post(endpoint, payload);

      if (selectedSection === "defectFinds") {
        setDefectiveItems(prev => [...prev, response.data.data]);
      } else {
        setRestoredItems(prev => [...prev, response.data.data]);
      }

      toast.success(
        selectedSection === "defectFinds"
          ? "Defective item recorded successfully!"
          : "Defective item restored successfully!"
      );
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error("Error saving data:", error);
      toast.error("Failed to save data");
    } finally {
      setSubmitting(false);
    }
  };

  // Export PDF
  const handleExportPDF = () => {
    if (!selectedDefective) return toast.warn("Select an item to export");
    // PDF export implementation would go here
    toast.info("PDF export functionality would be implemented here");
  };

  // Export Excel
  const handleExportExcel = () => {
    const dataToExport = filteredItems.length > 0 ? filteredItems :
      (selectedSection === "defectFinds" ? defectiveItems : restoredItems);

    if (dataToExport.length === 0) {
      toast.warn("No items to export");
      return;
    }

    // Excel export implementation would go here
    toast.info("Excel export functionality would be implemented here");
  };

  // Defective Modal Component
  const DefectiveModal = ({ item, onClose, onExport, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedItem, setEditedItem] = useState({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'auto';
      };
    }, []);

    useEffect(() => {
      if (item) {
        setEditedItem({ ...item });
        setErrors({});
      }
    }, [item]);

    if (!item) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">
              {isEditing ? "Edit Item" : `${selectedSection === "defectFinds" ? "Defective" : "Restored"} Item Details`}
            </div>
            <button className="modal-close" onClick={onClose}>
              &times;
            </button>
          </div>

          <div className="modal-body">
            <div className="wo-details-grid">
              <div className="detail-row">
                <span className="detail-label">ID:</span>
                <span className="detail-value">{item.id}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Date:</span>
                <span className="detail-value">{item.date}</span>
              </div>

              {selectedSection === "restoreDefects" && (
                <div className="detail-row">
                  <span className="detail-label">Defective Reference ID:</span>
                  <span className="detail-value">{item.defectiveId}</span>
                </div>
              )}

              <div className="section-header">Items</div>
              <div className="items-grid">
                {item.items?.map((itemDetail, index) => (
                  <div key={index} className="item-card">
                    <div className="item-header">
                      <span className="item-name">{itemDetail.itemName}</span>
                    </div>
                    <div className="item-details">
                      <span>Description: {itemDetail.itemDescription || 'N/A'}</span>
                      <span>HSN Code: {itemDetail.hsnCode || 'N/A'}</span>
                      <span>Quantity: {itemDetail.quantity}</span>
                      {selectedSection === "defectFinds" && (
                        <>
                          <span>When Defect: {itemDetail.whenDefect}</span>
                          <span>Reason: {itemDetail.reason}</span>
                        </>
                      )}
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
              <p>Are you sure you want to delete this item? This action cannot be undone.</p>
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
                    onDelete(item.id);
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

  return (
    <Navbar>
      <ToastContainer position="top-center" autoClose={3000} />
      <div className="main">
        <div className="page-header">
          <h2>Defective Items Manage</h2>
          <div className="right-section">
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="action-buttons-group">
              <button className="export-all-btn" onClick={handleExportExcel}>
                <FaFileExcel /> Export All
              </button>
              <button className="add-btn" onClick={() => setShowForm(!showForm)}>
                <FaPlus /> {showForm ? "Close Form" : "Create New"}
              </button>
            </div>
          </div>
        </div>

        {/* Section Selection */}
        <div className="section-selector">
          <button
            className={`section-btn ${selectedSection === "defectFinds" ? "active" : ""}`}
            onClick={() => {
              setSelectedSection("defectFinds");
              setSelectedDefective(null);
              setShowForm(false);
            }}
          >
            Defect Finds
          </button>
          <button
            className={`section-btn ${selectedSection === "restoreDefects" ? "active" : ""}`}
            onClick={() => {
              setSelectedSection("restoreDefects");
              setSelectedDefective(null);
              setShowForm(false);
            }}
          >
            Restore Defects
          </button>
        </div>

        {showForm && (
          <div className="form-container premium">
            <h2>{selectedSection === "defectFinds" ? "Record Defective Items" : "Restore Defective Items"}</h2>
            <Formik
              initialValues={getInitialValues()}
              validationSchema={getValidationSchema()}
              validateOnBlur={false}
              validateOnChange={false}
              onSubmit={handleSubmit}
            >
              {({ values, setFieldValue, errors, touched, submitCount }) => {
                // Show toast errors when submit is attempted
                useEffect(() => {
                  if (submitCount > 0 && Object.keys(errors).length > 0) {
                    if (errors.date) toast.error(errors.date);
                    if (errors.defectiveId) toast.error(errors.defectiveId);

                    if (typeof errors.items === 'string') {
                      toast.error(errors.items);
                    }

                    if (Array.isArray(errors.items)) {
                      errors.items.forEach((itemError, index) => {
                        if (itemError?.itemName)
                          toast.error(`Item ${index + 1}: ${itemError.itemName}`);
                        if (itemError?.quantity)
                          toast.error(`Item ${index + 1}: ${itemError.quantity}`);
                        if (itemError?.whenDefect)
                          toast.error(`Item ${index + 1}: ${itemError.whenDefect}`);
                        if (itemError?.reason)
                          toast.error(`Item ${index + 1}: ${itemError.reason}`);
                      });
                    }
                  }
                }, [submitCount, errors]);

                return (
                  <Form>
                    {selectedSection === "defectFinds" ? (
                      <div className="form-group-row">
                        <div className="grn-field-wrapper">
                          <label>Date *</label>
                          <Field
                            name="date"
                            type="date"
                            className={errors.date && touched.date ? 'error' : ''}
                          />
                          {errors.date && touched.date && (
                            <div className="error-message">{errors.date}</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>

                        <div className="form-group-row">
                          <div className="grn-field-wrapper">
                            <label>Date *</label>
                            <Field
                              name="date"
                              type="date"
                              className={errors.date && touched.date ? 'error' : ''}
                            />
                            {errors.date && touched.date && (
                              <div className="error-message">{errors.date}</div>
                            )}
                          </div>
                        </div>


                        <div className="form-group-row">
                          <div className="grn-field-wrapper">
                            <label>Select Defective Reference *</label>
                            <Select
                              className={`react-select-container ${errors.defectiveId ? 'error' : ''}`}
                              classNamePrefix="react-select"
                              options={defectiveItems.map(item => ({
                                value: item.defectiveId || item.id, // Use defectiveId if available
                                label: `Defective #${item.defectiveNumber || item.defectiveId || item.id} - ${item.date}`
                              }))}
                              onChange={(selectedOption) => handleDefectiveSelect(selectedOption, setFieldValue)}
                              value={defectiveItems.find(item =>
                                (item.defectiveId === values.defectiveId) || (item.id === values.defectiveId)
                              ) ? {
                                value: values.defectiveId,
                                label: `Defective #${defectiveItems.find(item =>
                                  (item.defectiveId === values.defectiveId) || (item.id === values.defectiveId)
                                )?.defectiveNumber || values.defectiveId
                                  } - ${defectiveItems.find(item =>
                                    (item.defectiveId === values.defectiveId) || (item.id === values.defectiveId)
                                  )?.date
                                  }`
                              } : null}
                              placeholder="Select Defective Reference"
                              isSearchable={true}
                              noOptionsMessage={() => "No defective items found"}
                            />
                            {errors.defectiveId && (
                              <div className="error-message">{errors.defectiveId}</div>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    <FieldArray name="items">
                      {({ remove, push }) => (
                        <div className="form-items">
                          {values.items.map((item, index) => {
                            const itemError = errors.items && errors.items[index];
                            const itemTouched = touched.items && touched.items[index];

                            return (
                              <div className="item-row" key={index}>
                                <div className="field-wrapper">
                                  <label>Item Name *</label>
                                  <Select
                                    className={`react-select-container ${itemError?.itemId ? 'error' : ''}`}
                                    classNamePrefix="react-select"
                                    options={getAvailableItems(values.items, index)}
                                    onChange={(selectedOption) => handleItemSelect(selectedOption, index, values, setFieldValue)}
                                    value={items.find(i => i.id === item.itemId) ? {
                                      value: item.itemId,
                                      label: item.itemName,
                                      itemData: items.find(i => i.id === item.itemId)
                                    } : null}
                                    placeholder="Select Item"
                                    isSearchable={true}
                                    isDisabled={selectedSection === "restoreDefects"}
                                    noOptionsMessage={() => "No items found"}
                                  />
                                  {itemError?.itemId && itemTouched?.itemId && (
                                    <div className="error-message">{itemError.itemId}</div>
                                  )}
                                </div>

                                <div className="field-wrapper">
                                  <label>Description</label>
                                  <Field
                                    name={`items.${index}.itemDescription`}
                                    placeholder="Description"
                                    disabled={true}
                                  />
                                </div>

                                <div className="field-wrapper">
                                  <label>HSN Code</label>
                                  <Field
                                    name={`items.${index}.hsnCode`}
                                    placeholder="HSN Code"
                                    disabled={true}
                                  />
                                </div>

                                <div className="field-wrapper">
                                  <label>Quantity *
                                    {selectedSection === "restoreDefects" && ` (Max: ${item.maxQuantity || 0})`}
                                    {selectedSection === "defectFinds" && item.itemId && ` (Max: ${inventoryData[item.itemId] || 0})`}
                                  </label>
                                  <Field
                                    name={`items.${index}.quantity`}
                                    type="number"
                                    placeholder="Quantity"
                                    className={itemError?.quantity && itemTouched?.quantity ? 'error' : ''}
                                    onBlur={(e) => {
                                      const value = parseInt(e.target.value);

                                      // Validation for restoreDefects section
                                      if (selectedSection === "restoreDefects") {
                                        const maxQty = item.maxQuantity || 0;
                                        if (value > maxQty) {
                                          toast.error(`Cannot restore more than ${maxQty} for ${item.itemName}`);
                                          setFieldValue(`items.${index}.quantity`, maxQty);
                                        }
                                      }

                                      // Validation for defectFinds section
                                      if (selectedSection === "defectFinds" && item.itemId) {
                                        const currentStock = inventoryData[item.itemId] || 0;
                                        if (value > currentStock) {
                                          toast.error(`Cannot add more than ${currentStock} for ${item.itemName}`);
                                          setFieldValue(`items.${index}.quantity`, currentStock);
                                        }
                                      }
                                    }}
                                  />
                                  {itemError?.quantity && itemTouched?.quantity && (
                                    <div className="error-message">{itemError.quantity}</div>
                                  )}
                                </div>
                                {selectedSection === "defectFinds" && (
                                  <>
                                    <div className="field-wrapper">
                                      <label>When Defect *</label>
                                      <Select
                                        className={`react-select-container ${itemError?.whenDefect ? 'error' : ''}`}
                                        classNamePrefix="react-select"
                                        options={whenDefectOptions}
                                        onChange={(selectedOption) =>
                                          setFieldValue(`items.${index}.whenDefect`, selectedOption?.value || "")
                                        }
                                        value={whenDefectOptions.find(opt => opt.value === item.whenDefect) || null}
                                        placeholder="When Defect"
                                      />
                                      {itemError?.whenDefect && itemTouched?.whenDefect && (
                                        <div className="error-message">{itemError.whenDefect}</div>
                                      )}
                                    </div>

                                    <div className="field-wrapper">
                                      <label>Reason *</label>
                                      <Select
                                        className={`react-select-container ${itemError?.reason ? 'error' : ''}`}
                                        classNamePrefix="react-select"
                                        options={reasonOptions}
                                        onChange={(selectedOption) =>
                                          setFieldValue(`items.${index}.reason`, selectedOption?.value || "")
                                        }
                                        value={reasonOptions.find(opt => opt.value === item.reason) || null}
                                        placeholder="Select Reason"
                                      />
                                      {itemError?.reason && itemTouched?.reason && (
                                        <div className="error-message">{itemError.reason}</div>
                                      )}
                                    </div>
                                  </>
                                )}

                                <div>
                                  <label style={{ opacity: 0 }}>Delete</label>
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
                            );
                          })}
                          <button
                            type="button"
                            className="add-btn"
                            onClick={() =>
                              push({
                                itemId: "",
                                itemName: "",
                                itemDescription: "",
                                hsnCode: "",
                                quantity: 0,
                                whenDefect: "",
                                reason: ""
                              })
                            }
                          >
                            + Add Item
                          </button>
                        </div>
                      )}
                    </FieldArray>

                    <button type="submit">Submit</button>
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
                <th>ID</th>
                <th>Date</th>
                <th>Items Count</th>
                {selectedSection === "restoreDefects" && <th>Defective Reference</th>}
              </tr>
            </thead>
            <tbody>
              {showLoader ? (
                <tr>
                  <td colSpan={selectedSection === "restoreDefects" ? 4 : 3} style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="table-loader"></div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr
                    key={item.restoreId || item.defectiveId} // Use appropriate ID
                    onClick={() => setSelectedDefective(item)}
                    className={selectedDefective?.id === item.id ? "selected" : ""}
                  >
                    <td>
                      {selectedSection === "defectFinds"
                        ? item.defectiveNumber
                        : item.restoreNumber // Show restore number for restore records
                      }
                    </td>
                    <td>{item.date}</td>
                    <td>{item.items?.length || 0}</td>
                    {selectedSection === "restoreDefects" && (
                      <td>{item.defectiveReferenceNumber || item.defectiveReferenceId}</td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {hasMoreItems && (
            <div className="load-more-container">
              <button className="load-more-btn" onClick={loadMoreItems}>
                Load More
              </button>
            </div>
          )}
        </div>

        {selectedDefective && (
          <DefectiveModal
            item={selectedDefective}
            onClose={() => setSelectedDefective(null)}
            onExport={handleExportPDF}
            onUpdate={() => { }} // Implement if needed
            onDelete={(id) => {
              if (selectedSection === "defectFinds") {
                setDefectiveItems(prev => prev.filter(item => item.id !== id));
              } else {
                setRestoredItems(prev => prev.filter(item => item.id !== id));
              }
              setSelectedDefective(null);
              toast.success("Item deleted successfully");
            }}
          />
        )}
      </div>
    </Navbar>
  );
};

export default Defective;