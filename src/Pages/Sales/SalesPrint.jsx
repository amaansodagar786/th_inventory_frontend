import React from "react";
import "./Salesprint.scss";
import { QRCodeCanvas as QRCode } from "qrcode.react";

const SalesPrint = ({ invoice, qrCodeUrl }) => {
    if (!invoice) return null;

    const {
        invoiceNumber,
        invoiceDate,
        poNumber,
        poDate,
        receiver,
        consignee,
        items,
        subtotal,
        cgst,
        sgst,
        igst,
        total,
        lrNumber,
        lrDate,
        transporter,
        transportMobile,
        vehicleNumber,
        otherCharges,
        terms,
        extraNote,
        packetForwardingPercent,
        freightPercent,
        inspectionPercent,
        additionalCharges
    } = invoice;

    // Calculate charges if not already in invoice
    const calculatedCharges = additionalCharges || {
        packetForwarding: packetForwardingPercent ? (subtotal * packetForwardingPercent) / 100 : 0,
        freight: freightPercent ? (subtotal * freightPercent) / 100 : 0,
        inspection: inspectionPercent ? (subtotal * inspectionPercent) / 100 : 0
    };

    return (
        <div id="sales-pdf">
            {/* EMPTY HEADER SPACE FOR PRE-PRINTED STATIONERY */}
            <div className="header-space"></div>

            {/* Company GST and LUT details */}
            <div className="company-details">
                <div className="left-details">
                    <p><strong>GSTIN:</strong> 24AAAFF2996A1ZS</p>
                    <p><strong>State:</strong> Gujarat, Code: 24</p>
                    <p><strong>PAN No:</strong> AAAFF2996A</p>
                </div>
                <div className="right-details">
                    <p><strong>LUT ARN No:</strong> AD240323034277D</p>
                    <p><strong>From:</strong> 01/04/2025 <strong>To:</strong> 31/03/2026</p>
                </div>
            </div>

            {/* Invoice and PO details side by side */}
            <div className="invoice-po-section">
                <div className="invoice-details">
                    <p><strong>Invoice No:</strong> {invoiceNumber}</p>
                    <p><strong>Invoice Date:</strong> {invoiceDate}</p>
                </div>
                {(poNumber || poDate) && (
                    <div className="po-details">
                        {poNumber && <p><strong>PO Number:</strong> {poNumber}</p>}
                        {poDate && <p><strong>PO Date:</strong> {poDate}</p>}
                    </div>
                )}
            </div>

            <div className="party-section">
                <div className="party-card">
                    <h3>Billed To:</h3>
                    <p><strong>{receiver?.name}</strong></p>
                    <p>{receiver?.address}</p>
                    <p>GSTIN: {receiver?.gstin}</p>
                    <p>Contact: {receiver?.contact}</p>
                    <p>Email: {receiver?.email}</p>
                </div>
                <div className="party-card">
                    <h3>Shipped To:</h3>
                    <p><strong>{consignee?.name}</strong></p>
                    <p>{consignee?.address}</p>
                    <p>GSTIN: {consignee?.gstin}</p>
                    <p>Contact: {consignee?.contact}</p>
                    <p>Email: {consignee?.email}</p>
                </div>
            </div>

            <table className="items-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Description</th>
                        <th>HSN</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => (
                        <tr key={index}>
                            <td>{index + 1}</td>
                            <td>{item.name}</td>
                            <td>{item.description || '-'}</td>
                            <td>{item.hsn || '-'}</td>
                            <td>{item.quantity} {item.units}</td>
                            <td>₹{item.unitPrice.toFixed(2)}</td>
                            <td>₹{(item.quantity * item.unitPrice).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="summary-section">
                <div className="transport-details">
                    <h4>Transport Details</h4>
                    <p><strong>Transporter:</strong> {transporter || 'N/A'}</p>
                    {vehicleNumber && <p><strong>Vehicle No:</strong> {vehicleNumber}</p>}
                    <p><strong>LR No:</strong> {lrNumber || 'N/A'}</p>
                    <p><strong>LR Date:</strong> {lrDate || 'N/A'}</p>
                    <p><strong>Contact:</strong> {transportMobile || 'N/A'}</p>
                </div>
                <div className="amount-details">
                    <table>
                        <tbody>
                            <tr>
                                <td>Subtotal:</td>
                                <td>₹{subtotal?.toFixed(2)}</td>
                            </tr>
                            
                            {/* Show additional charges only if they exist */}
                            {packetForwardingPercent > 0 && (
                                <tr>
                                    <td>Packet Forwarding ({packetForwardingPercent}%):</td>
                                    <td>₹{calculatedCharges.packetForwarding.toFixed(2)}</td>
                                </tr>
                            )}
                            {freightPercent > 0 && (
                                <tr>
                                    <td>Freight ({freightPercent}%):</td>
                                    <td>₹{calculatedCharges.freight.toFixed(2)}</td>
                                </tr>
                            )}
                            {inspectionPercent > 0 && (
                                <tr>
                                    <td>Inspection ({inspectionPercent}%):</td>
                                    <td>₹{calculatedCharges.inspection.toFixed(2)}</td>
                                </tr>
                            )}
                            
                            {cgst > 0 && (
                                <tr>
                                    <td>CGST (9%):</td>
                                    <td>₹{cgst?.toFixed(2)}</td>
                                </tr>
                            )}
                            {sgst > 0 && (
                                <tr>
                                    <td>SGST (9%):</td>
                                    <td>₹{sgst?.toFixed(2)}</td>
                                </tr>
                            )}
                            {igst > 0 && (
                                <tr>
                                    <td>IGST (18%):</td>
                                    <td>₹{igst?.toFixed(2)}</td>
                                </tr>
                            )}
                            {otherCharges > 0 && (
                                <tr>
                                    <td>Other Charges:</td>
                                    <td>₹{otherCharges?.toFixed(2)}</td>
                                </tr>
                            )}
                            <tr className="total-row">
                                <td><strong>Total:</strong></td>
                                <td><strong>₹{total?.toFixed(2)}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bank-qr-section">
                <div className="bank-details">
                    <h4>Bank Details</h4>
                    <p><strong>Bank Name:</strong> BANK OF BARODA</p>
                    <p><strong>Account No:</strong> 05730400000053</p>
                    <p><strong>Branch:</strong> GIDC MAKARPURA</p>
                    <p><strong>IFSC:</strong> BARBOINDMAK (0 Zero)</p>
                </div>
                {qrCodeUrl && (
                    <div className="qr-code">
                        <QRCode value={qrCodeUrl} size={100} />
                        <p>Scan to download invoice</p>
                    </div>
                )}
            </div>

            {(terms || extraNote) && (
                <div className="notes-section">
                    {extraNote && (
                        <div className="extra-notes">
                            <h4>Notes</h4>
                            <p>{extraNote}</p>
                        </div>
                    )}
                    {terms && (
                        <div className="terms-section">
                            <h4>Terms & Conditions</h4>
                            <pre>{terms}</pre>
                        </div>
                    )}
                </div>
            )}

            <div className="certification-section">
                <div className="certification-text">
                    <p>Certified that particulars given above are true and correct and the amount indicated represents the price actually charged and that there is no flow of additional consideration directly or indirectly from the buyer</p>
                </div>
                <div className="signature-box">
                    <p>For FERROTUBE</p>
                    <div className="signature-line"></div>
                    <p>Authorized Signatory</p>
                </div>
            </div>

            <div className="jurisdiction-note">
                <p>Subject to Vadodara Jurisdiction</p>
            </div>
        </div>
    );
};

export default SalesPrint;