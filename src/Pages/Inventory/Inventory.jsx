import React, { useState, useEffect, useRef, useMemo } from "react";
import Navbar from "../../Components/Sidebar/Navbar";
import html2pdf from "html2pdf.js";
import { FaFileExport, FaSearch, FaFilter } from "react-icons/fa";
import "./Inventory.scss";
import axios from "axios";

const Inventory = () => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [itemHistory, setItemHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);


    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [showLoader, setShowLoader] = useState(false);
    const loaderTimeoutRef = useRef(null);

    const [stockFilter, setStockFilter] = useState("all");

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15); // Adjust as needed


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
                setCurrentPage(1); // Reset to first page when search changes
                setShowLoader(false);
            }, 300);

            return () => {
                clearTimeout(searchTimeout);
                if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);
                setShowLoader(false);
            };
        } else {
            setDebouncedSearch("");
            setCurrentPage(1); // Reset to first page when search is cleared
            setShowLoader(false);
        }
    }, [searchTerm]);

    // Filter inventory
    // Filter inventory
    const filteredInventory = useMemo(() => {
        let result = inventory;

        // Apply stock filter
        if (stockFilter === "low") {
            result = result.filter(item => item.currentStock <= item.minimumQty && item.currentStock > 0);
        } else if (stockFilter === "out") {
            result = result.filter(item => item.currentStock === 0);
        }

        // Apply search filter
        if (debouncedSearch) {
            result = result.filter(item => {
                // Check item fields
                if (item.itemName?.toLowerCase().includes(debouncedSearch)) return true;
                if (item.hsnCode?.toLowerCase().includes(debouncedSearch)) return true;
                if (item.description?.toLowerCase().includes(debouncedSearch)) return true;

                // Check status
                let status = "";
                if (item.currentStock === 0) {
                    status = "out of stock";
                } else if (item.currentStock <= item.minimumQty) {
                    status = "low stock";
                } else {
                    status = "in stock";
                }

                if (status.includes(debouncedSearch)) return true;

                return false;
            });
        }

        return result;
    }, [debouncedSearch, inventory, stockFilter]);

    // Paginated inventory
    const paginatedInventory = useMemo(() => {
        // If searching, show all filtered results without pagination
        if (debouncedSearch) return filteredInventory;

        // Otherwise, apply pagination
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredInventory.slice(0, startIndex + itemsPerPage);
    }, [filteredInventory, currentPage, itemsPerPage, debouncedSearch]);

    // Check if there are more items to load
    const hasMoreInventory = useMemo(() => {
        return debouncedSearch ? false : currentPage * itemsPerPage < filteredInventory.length;
    }, [currentPage, itemsPerPage, filteredInventory.length, debouncedSearch]);

    const loadMoreInventory = () => {
        setCurrentPage(prev => prev + 1);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_URL}/inventory/get-inventory`);

                if (response.data.success) {
                    setInventory(Array.isArray(response.data.data) ? response.data.data : []);
                } else {
                    setError(response.data.message || "Failed to load inventory data");
                }
                setLoading(false);
            } catch (error) {
                console.error("Error fetching inventory:", error);
                setError("Failed to load inventory data");
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const fetchItemHistory = async (itemId) => {
        setHistoryLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/grn/get-grns`);
            if (response.data.success) {
                // Filter GRNs that contain this item and map to item-specific details
                const history = response.data.data
                    .filter(grn => grn.items.some(item => item.name === itemId))
                    .map(grn => {
                        const itemData = grn.items.find(item => item.name === itemId);
                        return {
                            grnNumber: grn.grnNumber,
                            grnDate: grn.grnDate,
                            poNumber: grn.poNumber,
                            vendorName: grn.vendorName,
                            vendorGST: grn.vendorGST,
                            rate: itemData.rate,
                            quantity: itemData.qty,
                            unit: itemData.unit,
                            total: itemData.qty * itemData.rate,
                            gstType: grn.gstType,
                            cgst: grn.cgst,
                            sgst: grn.sgst,
                            igst: grn.igst
                        };
                    });
                setItemHistory(history);
            }
        } catch (error) {
            console.error("Error fetching item history:", error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleRowClick = (item) => {
        // Close if clicking the same item
        if (selectedItem?.itemName === item.itemName) {
            setSelectedItem(null);
            return;
        }
        setSelectedItem(item);
        fetchItemHistory(item.itemName);
    };

    const handleExport = () => {
        // Create a styled table for PDF export
        const element = document.createElement("div");
        element.style.fontFamily = "Arial, sans-serif";
        element.style.padding = "20px";

        // Add title
        const title = document.createElement("h2");
        title.textContent = "Inventory Report";
        title.style.textAlign = "center";
        title.style.color = "#3f3f91";
        title.style.marginBottom = "20px";
        element.appendChild(title);

        // Create table with styles
        const table = document.createElement("table");
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        table.style.border = "1px solid #ddd";

        // Add table headers
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        headerRow.style.backgroundColor = "#f5f6fa";

        ["Item", "HSN", "Units", "Description", "Avg Price", "Min Qty", "Current Stock", "In Use", "Status"].forEach(headerText => {
            const th = document.createElement("th");
            th.textContent = headerText;
            th.style.padding = "10px";
            th.style.border = "1px solid #ddd";
            th.style.fontWeight = "bold";
            th.style.color = "#3f3f91";
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Add table body
        const tbody = document.createElement("tbody");

        filteredInventory.forEach(item => {
            const row = document.createElement("tr");

            [
                item.itemName,
                item.hsnCode || "-",
                item.unit || "-",
                item.description || "-",
                `₹${item.averagePrice?.toFixed(2) || "0.00"}`,
                item.minimumQty,
                item.currentStock,
                item.inUse,
                item.currentStock <= item.minimumQty ? "Low Stock" : "In Stock"
            ].forEach(cellText => {
                const td = document.createElement("td");
                td.textContent = cellText;
                td.style.padding = "8px";
                td.style.border = "1px solid #ddd";

                // Add color for status
                if (cellText === "Low Stock") {
                    td.style.color = "#d32f2f";
                    td.style.fontWeight = "500";
                } else if (cellText === "In Stock") {
                    td.style.color = "#388e3c";
                }

                row.appendChild(td);
            });

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        element.appendChild(table);

        // Add filter info
        const filterInfo = document.createElement("p");
        filterInfo.textContent = `Filters applied: ${stockFilter !== "all" ? `Stock: ${stockFilter === "low" ? "Low Stock" : "Out of Stock"}` : "All Stock"}${debouncedSearch ? `, Search: "${debouncedSearch}"` : ""}`;
        filterInfo.style.marginTop = "15px";
        filterInfo.style.fontSize = "12px";
        filterInfo.style.color = "#666";
        element.appendChild(filterInfo);

        // Add export date
        const exportDate = document.createElement("p");
        exportDate.textContent = `Exported on: ${new Date().toLocaleString()}`;
        exportDate.style.marginTop = "5px";
        exportDate.style.fontSize = "12px";
        exportDate.style.color = "#666";
        element.appendChild(exportDate);

        html2pdf().from(element).set({
            margin: 10,
            filename: "Inventory_Report.pdf",
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }
        }).save();
    };

    if (error) {
        return (
            <Navbar>
                <div className="inventory-page">
                    <div className="error-message">{error}</div>
                </div>
            </Navbar>
        );
    }

    return (
        <Navbar>
            <div className="inventory-page">
                <div className="page-header">
                    <h2>Inventory</h2>
                    <div className="right-section">


                        <div className="filter-container">
                            <div className="filter-with-icon">
                                <FaFilter className="filter-icon" />
                                <select
                                    value={stockFilter}
                                    onChange={(e) => setStockFilter(e.target.value)}
                                    className="stock-filter"
                                >
                                    <option value="all">All Stock</option>
                                    <option value="low">Low Stock</option>
                                    <option value="out">Out of Stock</option>
                                </select>
                            </div>
                        </div>

                        <div className="search-container">
                            <FaSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search inventory..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="action-buttons-group">
                            <button className="export-all-btn" onClick={handleExport}>
                                <FaFileExport /> Export
                            </button>
                        </div>
                    </div>
                </div>

                <div className="data-table" id="inventory-table">
                    {loading ? (
                        <div className="loading">Loading inventory...</div>
                    ) : inventory.length === 0 ? (
                        <div className="no-data">No inventory items found</div>
                    ) : (
                        <>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>HSN</th>
                                        <th>Units</th>
                                        <th>Description</th>
                                        <th>Avg Price</th>
                                        <th>Min Qty</th>
                                        <th>Current Stock</th>
                                        <th>In Use</th>
                                        <th>Status</th>
                                        <th>Notification</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {showLoader ? (
                                        <tr>
                                            <td colSpan="10" style={{ textAlign: 'center', padding: '40px' }}>
                                                <div className="table-loader"></div>
                                            </td>
                                        </tr>
                                    ) : (
                                        // CHANGE THIS LINE: filteredInventory → paginatedInventory
                                        paginatedInventory.map((item, index) => (
                                            <React.Fragment key={index}>
                                                <tr
                                                    onClick={() => handleRowClick(item)}
                                                    className={`clickable-row ${selectedItem?.itemName === item.itemName ? 'selected' : ''}`}
                                                >
                                                    <td>{item.itemName}</td>
                                                    <td>{item.hsnCode || "-"}</td>
                                                    <td>{item.unit || "-"}</td>
                                                    <td>{item.description || "-"}</td>
                                                    <td>₹{item.averagePrice?.toFixed(2) || "0.00"}</td>
                                                    <td>{item.minimumQty}</td>
                                                    <td>{item.currentStock}</td>
                                                    <td>{item.inUse}</td>
                                                    <td className={
                                                        item.currentStock === 0 ? "out-of-stock" :
                                                            item.currentStock <= item.minimumQty ? "low-stock" : "in-stock"
                                                    }>
                                                        {item.currentStock === 0
                                                            ? "Out of Stock"
                                                            : item.currentStock <= item.minimumQty
                                                                ? "Low Stock"
                                                                : "In Stock"}
                                                    </td>
                                                    <td>
                                                        {item.currentStock === 0
                                                            ? <span className="alert urgent">Out of Stock</span>
                                                            : item.currentStock <= item.minimumQty
                                                                ? <span className="alert">Reorder Needed</span>
                                                                : "-"}
                                                    </td>
                                                </tr>
                                                {selectedItem?.itemName === item.itemName && (
                                                    <tr className="history-row">
                                                        <td colSpan="10">
                                                            <div className="history-container">
                                                                <h3>Purchase History for: {selectedItem.itemName}</h3>
                                                                {historyLoading ? (
                                                                    <div className="history-loading">Loading history...</div>
                                                                ) : itemHistory.length === 0 ? (
                                                                    <div className="history-no-data">No purchase history found for this item</div>
                                                                ) : (
                                                                    <div className="history-table-container">
                                                                        <table className="history-table">
                                                                            <thead>
                                                                                <tr>
                                                                                    <th>GRN No.</th>
                                                                                    <th>Date</th>
                                                                                    <th>PO No.</th>
                                                                                    <th>Vendor</th>
                                                                                    <th>Rate (₹)</th>
                                                                                    <th>Qty</th>
                                                                                    <th>Total (₹)</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {itemHistory.map((history, idx) => (
                                                                                    <tr key={idx}>
                                                                                        <td>{history.grnNumber}</td>
                                                                                        <td>{history.grnDate}</td>
                                                                                        <td>{history.poNumber || "-"}</td>
                                                                                        <td>{history.vendorName}</td>
                                                                                        <td>{history.rate.toFixed(2)}</td>
                                                                                        <td>{history.quantity}</td>
                                                                                        <td>{history.total.toFixed(2)}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))
                                    )}
                                </tbody>
                            </table>

                        </>
                    )}
                </div>
            </div>
        </Navbar>
    );
};

export default Inventory;