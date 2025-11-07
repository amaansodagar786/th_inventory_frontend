import React, { useState, useEffect, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import { FaFileExcel, FaRupeeSign, FaShoppingCart, FaWarehouse, FaDollarSign, FaBox, FaMoneyBill, FaChartLine, FaClipboardList } from "react-icons/fa";
import * as XLSX from "xlsx";
import Navbar from "../../Components/Sidebar/Navbar";
import "../Form/Form.scss";
import "./Reports.scss";
import "react-toastify/dist/ReactToastify.css";

const Reports = () => {
  const [activeReport, setActiveReport] = useState("purchase");
  const [timeFilter, setTimeFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Report data structure
  const reportTypes = {
    purchase: {
      title: "Purchase Report",
      icon: <FaShoppingCart />,
      color: "#e67e22",
      endpoint: "/grn-report"
    },
    sales: {
      title: "Sales Report", 
      icon: <FaMoneyBill />,
      color: "#27ae60",
      endpoint: "/sales-report"
    },
    inventory: {
      title: "Inventory Report",
      icon: <FaWarehouse />,
      color: "#3498db",
      endpoint: "/inventory-report"
    }
  };

  // Fetch report data with useCallback
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (timeFilter !== 'all') {
        params.append('filterType', timeFilter);
        if (timeFilter === 'custom' && customStartDate && customEndDate) {
          params.append('startDate', customStartDate);
          params.append('endDate', customEndDate);
        }
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/reports${reportTypes[activeReport].endpoint}?${params}`
      );
      const data = await response.json();
      
      if (response.ok) {
        setReportData(data);
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      console.error("Error fetching report:", err);
      toast.error("Failed to fetch report data");
    } finally {
      setLoading(false);
    }
  }, [activeReport, timeFilter, customStartDate, customEndDate]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Export to Excel
  const exportToExcel = () => {
    if (!reportData) {
      toast.warning("No data to export");
      return;
    }

    let dataToExport = [];
    let fileName = "";

    switch (activeReport) {
      case "purchase":
        dataToExport = reportData.grns || [];
        fileName = `purchase_report_${timeFilter}`;
        break;
      case "sales":
        dataToExport = reportData.sales || [];
        fileName = `sales_report_${timeFilter}`;
        break;
      case "inventory":
        dataToExport = reportData.inventoryItems || [];
        fileName = `inventory_report`;
        break;
    }

    if (dataToExport.length === 0) {
      toast.warning("No data available for export");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report Data");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
    toast.success("Report exported successfully!");
  };

  // Render report cards based on active report
  const renderReportCards = () => {
    if (!reportData) return null;

    switch (activeReport) {
      case "purchase":
        return (
          <div className="report-cards-grid">
            <div className="report-card">
              <div className="card-value">{reportData.totalGRNs || 0}</div>
              <div className="card-label">Total GRNs</div>
            </div>
            <div className="report-card">
              <div className="card-value">{reportData.totalQty || 0}</div>
              <div className="card-label">Total Quantity</div>
            </div>
            <div className="report-card">
              <div className="card-value">
                <FaRupeeSign className="rupee-icon" />
                {(reportData.totalPurchaseValue || 0).toLocaleString()}
              </div>
              <div className="card-label">Total Purchase Value</div>
            </div>
            <div className="report-card">
              <div className="card-value">
                <FaRupeeSign className="rupee-icon" />
                {(reportData.averagePurchaseValue || 0).toLocaleString()}
              </div>
              <div className="card-label">Avg. Purchase Value</div>
            </div>
          </div>
        );

      case "sales":
        return (
          <div className="report-cards-grid">
            <div className="report-card">
              <div className="card-value">{reportData.totalSales || 0}</div>
              <div className="card-label">Total Sales</div>
            </div>
            <div className="report-card">
              <div className="card-value">
                <FaRupeeSign className="rupee-icon" />
                {(reportData.totalRevenue || 0).toLocaleString()}
              </div>
              <div className="card-label">Total Revenue</div>
            </div>
            <div className="report-card">
              <div className="card-value">{reportData.totalItemsSold || 0}</div>
              <div className="card-label">Items Sold</div>
            </div>
            <div className="report-card">
              <div className="card-value">
                <FaRupeeSign className="rupee-icon" />
                {(reportData.avgInvoiceValue || 0).toLocaleString()}
              </div>
              <div className="card-label">Avg. Invoice Value</div>
            </div>
          </div>
        );

      case "inventory":
        return (
          <div className="report-cards-grid">
            <div className="report-card">
              <div className="card-value">{reportData.totalItems || 0}</div>
              <div className="card-label">Total Items</div>
            </div>
            <div className="report-card">
              <div className="card-value">{reportData.totalStock || 0}</div>
              <div className="card-label">Total Stock</div>
            </div>
            <div className="report-card">
              <div className="card-value">
                <FaRupeeSign className="rupee-icon" />
                {(reportData.totalValue || 0).toLocaleString()}
              </div>
              <div className="card-label">Total Value</div>
            </div>
            <div className="report-card">
              <div className="card-value">{reportData.lowStockItems || 0}</div>
              <div className="card-label">Low Stock Items</div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render data table based on active report
  const renderDataTable = () => {
    if (!reportData) return null;

    switch (activeReport) {
      case "purchase":
        const grns = reportData.grns || [];
        return (
          <div className="data-table-section">
            <h4>Purchase Details</h4>
            <div className="data-table-container">
              <table>
                <thead>
                  <tr>
                    <th>GRN No.</th>
                    <th>Vendor</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Total Qty</th>
                    <th>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {grns.slice(0, 10).map((grn, index) => (
                    <tr key={grn._id || index}>
                      <td>{grn.grnNumber || 'N/A'}</td>
                      <td>{grn.vendorName || 'N/A'}</td>
                      <td>{grn.grnDate || 'N/A'}</td>
                      <td>{grn.items?.length || 0}</td>
                      <td>{grn.items?.reduce((sum, item) => sum + (item.qty || 0), 0)}</td>
                      <td>
                        <FaRupeeSign className="rupee-icon-small" />
                        {grn.total?.toLocaleString() || '0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {grns.length === 0 && (
                <div className="no-data-message">No purchase data available</div>
              )}
            </div>
          </div>
        );

      case "sales":
        const sales = reportData.sales || [];
        return (
          <div className="data-table-section">
            <h4>Sales Details</h4>
            <div className="data-table-container">
              <table>
                <thead>
                  <tr>
                    <th>Invoice No.</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Total Amount</th>
                    <th>GST</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, 10).map((sale, index) => (
                    <tr key={sale._id || index}>
                      <td>{sale.invoiceNumber || 'N/A'}</td>
                      <td>{sale.receiver?.name || sale.receiver?.companyName || 'N/A'}</td>
                      <td>{sale.invoiceDate || 'N/A'}</td>
                      <td>{sale.items?.length || 0}</td>
                      <td>
                        <FaRupeeSign className="rupee-icon-small" />
                        {sale.total?.toLocaleString() || '0'}
                      </td>
                      <td>
                        <FaRupeeSign className="rupee-icon-small" />
                        {((sale.cgst || 0) + (sale.sgst || 0) + (sale.igst || 0)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sales.length === 0 && (
                <div className="no-data-message">No sales data available</div>
              )}
            </div>
          </div>
        );

      case "inventory":
        const inventoryItems = reportData.inventoryItems || [];
        return (
          <div className="data-table-section">
            <h4>Inventory Details</h4>
            <div className="data-table-container">
              <table>
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>HSN Code</th>
                    <th>Current Stock</th>
                    <th>Unit</th>
                    <th>Avg. Price</th>
                    <th>Stock Value</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryItems.slice(0, 10).map((item, index) => (
                    <tr key={item._id || item.inventoryId || index}>
                      <td>{item.itemName || 'N/A'}</td>
                      <td>{item.hsnCode || 'N/A'}</td>
                      <td className={item.currentStock <= (item.minimumQty || 0) ? 'low-stock' : ''}>
                        {item.currentStock || 0}
                      </td>
                      <td>{item.unit || 'N/A'}</td>
                      <td>
                        <FaRupeeSign className="rupee-icon-small" />
                        {item.averagePrice?.toLocaleString() || '0'}
                      </td>
                      <td>
                        <FaRupeeSign className="rupee-icon-small" />
                        {((item.currentStock || 0) * (item.averagePrice || 0)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {inventoryItems.length === 0 && (
                <div className="no-data-message">No inventory data available</div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Navbar>
      <ToastContainer position="top-center" autoClose={3000} />
      <div className="main">
        {/* Page Header */}
        <div className="page-header">
          <h2>Reports Dashboard</h2>
          <div className="right-section">
            {/* Time Filter */}
            <div className="time-filter-container">
              <select 
                value={timeFilter} 
                onChange={(e) => setTimeFilter(e.target.value)}
                className="time-filter-select"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Date</option>
              </select>

              {timeFilter === 'custom' && (
                <div className="custom-date-filters">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="date-input"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="date-input"
                  />
                  <button 
                    onClick={fetchReportData}
                    className="apply-date-btn"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* Export Button */}
            <div className="action-buttons-group">
              <button className="export-all-btn" onClick={exportToExcel}>
                <FaFileExcel /> Export Excel
              </button>
            </div>
          </div>
        </div>

        {/* Report Type Selector */}
        <div className="report-type-selector">
          {Object.entries(reportTypes).map(([key, report]) => (
            <div
              key={key}
              className={`report-type-card ${activeReport === key ? 'active' : ''}`}
              onClick={() => setActiveReport(key)}
              style={{ 
                borderColor: report.color,
                background: activeReport === key ? `${report.color}15` : 'white'
              }}
            >
              <div className="report-icon" style={{ color: report.color }}>
                {report.icon}
              </div>
              <div className="report-title">{report.title}</div>
            </div>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Generating report...</p>
          </div>
        )}

        {/* Report Content */}
        {!loading && reportData && (
          <div className="report-content">
            {/* Report Header with Icon on Left */}
            <div className="report-header-with-icon">
              <div className="header-icon" style={{ color: reportTypes[activeReport].color }}>
                {reportTypes[activeReport].icon}
              </div>
              <div className="header-content">
                <h3 style={{ color: reportTypes[activeReport].color }}>
                  {reportTypes[activeReport].title}
                </h3>
                <div className="report-summary">
                  {timeFilter !== 'all' ? `Showing data for ${timeFilter}` : 'Showing all data'}
                </div>
              </div>
            </div>
            
            {/* Summary Cards */}
            {renderReportCards()}
            
            {/* Data Table */}
            {renderDataTable()}
          </div>
        )}

        {/* No Data State */}
        {!loading && !reportData && (
          <div className="no-data-state">
            <p>No report data available</p>
          </div>
        )}
      </div>
    </Navbar>
  );
};

export default Reports;