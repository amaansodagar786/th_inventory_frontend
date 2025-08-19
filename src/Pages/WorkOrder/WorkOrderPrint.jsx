import React from "react";
import "./WorkOrderPrint.scss";

const WorkOrderPrint = ({ workOrder }) => {
    if (!workOrder) return null;

    const {
        workOrderNumber,
        workOrderDate,
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
        bank,
        otherCharges,
        status
    } = workOrder;

    return (
        <div id="workorder-pdf">
            <div className="header">
                <div className="header-left">
                    <h1>TECHORSES</h1>
                    <p>123 Business Street, Industrial Area</p>
                    <p>Ahmedabad, Gujarat - 380001</p>
                    <p>GSTIN: 24XXXXXXXXX1Z5</p>
                </div>
                <div className="header-right">
                    <h2>WORK ORDER</h2>
                    <table className="header-info">
                        <tbody>
                            <tr>
                                <td>WO No:</td>
                                <td>{workOrderNumber}</td>
                            </tr>
                            <tr>
                                <td>Date:</td>
                                <td>{workOrderDate}</td>
                            </tr>
                            
                        </tbody>
                    </table>
                </div>
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
                {/* <div className="party-card">
                    <h3>Shipped To:</h3>
                    <p><strong>{consignee?.name}</strong></p>
                    <p>{consignee?.address}</p>
                    <p>GSTIN: {consignee?.gstin}</p>
                    <p>Contact: {consignee?.contact}</p>
                    <p>Email: {consignee?.email}</p>
                </div> */}
            </div>

            {poNumber && (
                <div className="po-info">
                    <p><strong>PO Number:</strong> {poNumber}</p>
                    <p><strong>PO Date:</strong> {poDate}</p>
                </div>
            )}

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
                            <td>{item.description}</td>
                            <td>{item.hsn}</td>
                            {/* <td>{item.quantity} {item.units}</td> */}
                            <td>{item.quantity} </td>
                            <td>₹{item.unitPrice}</td>
                            <td>₹{(item.quantity * item.unitPrice).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="summary-section">
                {/* <div className="transport-details">
                    {transporter && (
                        <>
                            <h4>Transport Details</h4>
                            <p><strong>Transporter:</strong> {transporter}</p>
                            <p><strong>LR No:</strong> {lrNumber}</p>
                            <p><strong>LR Date:</strong> {lrDate}</p>
                            <p><strong>Contact:</strong> {transportMobile}</p>
                        </>
                    )}
                </div> */}
                <div className="amount-details">
                    <table>
                        <tbody>
                            <tr>
                                <td>Subtotal:</td>
                                <td>₹{subtotal?.toFixed(2)}</td>
                            </tr>
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

            {/* <div className="bank-details">
                <h4>Bank Details</h4>
                <p><strong>Bank Name:</strong> {bank?.name}</p>
                <p><strong>Account No:</strong> {bank?.account}</p>
                <p><strong>Branch:</strong> {bank?.branch}</p>
                <p><strong>IFSC:</strong> {bank?.ifsc}</p>
            </div> */}

            <div className="terms-section">
                <h4>Terms & Conditions</h4>
                <ul>
                    <li>Payment due within 15 days from date of invoice</li>
                    {/* <li>Goods once sold will not be taken back</li> */}
                    <li>Interest @18% p.a. will be charged on overdue payments</li>
                </ul>
            </div>

            <div className="signature-section">
                <div className="signature-box">
                    <p>For TECHORSES</p>
                    <div className="signature-line"></div>
                    <p>Authorized Signatory</p>
                </div>
            </div>
        </div>
    );
};

export default WorkOrderPrint;