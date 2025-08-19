import React from "react";
// import QRCode from "qrcode.react";  
import { QRCodeCanvas as QRCode } from "qrcode.react"; // ✅ fixes the issue
import "./PurchaseOrderPrint.scss";

const PurchaseOrderPrint = ({ po }) => {
  if (!po) return null;

  const isIntraState = po.vendorGST?.startsWith("24");

  return (
    <div className="print-container" id="po-pdf">
      <div className="header">
        <div className="left">
          <p><strong>GSTIN:</strong> 24AAAFF2996A1Z6</p>
          <p><strong>PAN No.:</strong> AAAFF2996A</p>
        </div>
        <div className="center">
          <h3>Techorses </h3>
          <p>Ride The Technology</p>
          <h2>PURCHASE ORDER</h2>
        </div>
        <div className="right">
          <p><strong>State:</strong> Gujarat</p>
          <p><strong>State Code:</strong> 24</p>
          <p><strong>LUT ARN No:</strong> AD240224050202C</p>
          <p><strong>Valid:</strong> 01/04/2025 to 31/03/2026</p>
        </div>
      </div>
      <div className="section">
        <div className="col">
          <p><strong>Vendor:</strong> {po.vendorName}</p>
          <p><strong>GSTIN:</strong> {po.vendorGST}</p>
          <p><strong>Address:</strong> {po.vendorAddress}</p>
          <p><strong>Contact:</strong> {po.vendorContact}</p>
          <p><strong>Email:</strong> {po.vendorEmail}</p>
        </div>
        <div className="col">
          <p><strong>Ship To:</strong> {po.shipName}</p>
          <p><strong>Company:</strong> {po.shipCompany}</p>
          <p><strong>Phone:</strong> {po.shipPhone}</p>
        </div>
        <div className="col">
          <p><strong>Date:</strong> {po.date}</p>
          <p><strong>PO Number:</strong> {po.poNumber}</p>
        </div>
      </div>
      <table className="po-table">
        <thead>
          <tr>
            <th>SR NO.</th>
            <th>ITEM #</th>
            <th>DESCRIPTION</th>
            <th>HSN/AC CODE</th>
            <th>QTY</th>
            <th>UNIT RATE (₹)</th>
            <th>UNITS</th>
            <th>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {po.items.map((item, idx) => (
            <tr key={idx}>
              <td>{idx + 1}</td>
              <td>{item.name}</td>
              <td>{item.description}</td>
              <td>{item.hsn}</td>
              <td>{item.qty}</td>
              <td>₹{item.rate}</td>
              <td>{item.unit}</td>
              <td>₹{(item.qty * item.rate).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="summary">
        <p><strong>SUBTOTAL:</strong> ₹{po.subtotal.toFixed(2)}</p>
        {isIntraState ? (
          <>
            <p><strong>CGST @ 9%:</strong> ₹{po.cgst.toFixed(2)}</p>
            <p><strong>SGST @ 9%:</strong> ₹{po.sgst.toFixed(2)}</p>
          </>
        ) : (
          <p><strong>IGST @ 18%:</strong> ₹{po.igst?.toFixed(2) || ((po.total - po.subtotal).toFixed(2))}</p>
        )}
        <p><strong>TOTAL:</strong> ₹{po.total.toFixed(2)}</p>
      </div>
      {/* <div className="qr-section-left">
        {qrCodeUrl && (
          <div className="qr-wrapper">
            <QRCode value={qrCodeUrl} size={128} />
            <p>Scan to download this PO PDF</p>
          </div>
        )}
      </div> */}

      <div className="footer">
        <p>For Ferro Tube & Forge Industries</p>
        <p className="sign">Authorised Signatory</p>
        <p className="contact-note">If you have any questions about this purchase order, please contact</p>
      </div>
    </div>
  );
};

export default PurchaseOrderPrint;
