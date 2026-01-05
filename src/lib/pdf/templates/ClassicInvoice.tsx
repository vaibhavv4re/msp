import React from 'react';
import { Page, Document, StyleSheet, View, Text, Image } from '@react-pdf/renderer';
import { InvoicePDFData } from '../types';
import { pdfTheme } from '../theme';

interface Props {
    data: InvoicePDFData;
}

export const ClassicInvoice: React.FC<Props> = ({ data }) => {
    const styles = StyleSheet.create({
        page: {
            padding: 40,
            fontFamily: pdfTheme.fonts.regular,
            backgroundColor: '#FFFFFF',
            color: '#000000',
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 30,
            borderBottomWidth: 1,
            borderBottomColor: '#000',
            paddingBottom: 10,
        },
        businessDetails: {
            flex: 1,
        },
        invoiceInfo: {
            flex: 1,
            textAlign: 'right',
        },
        bizName: {
            fontSize: 14,
            fontFamily: pdfTheme.fonts.bold,
            marginBottom: 4,
            textTransform: 'uppercase',
        },
        bizText: {
            fontSize: 9,
            color: '#333',
            lineHeight: 1.2,
        },
        title: {
            fontSize: 24,
            fontFamily: pdfTheme.fonts.bold,
            marginBottom: 8,
        },
        metaRow: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            marginBottom: 2,
        },
        metaLabel: {
            fontSize: 9,
            fontFamily: pdfTheme.fonts.bold,
            width: 80,
        },
        metaValue: {
            fontSize: 9,
            width: 100,
        },
        billToBox: {
            marginTop: 20,
            marginBottom: 30,
            padding: 12,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            backgroundColor: '#f9fafb',
        },
        billToLabel: {
            fontSize: 8,
            fontFamily: pdfTheme.fonts.bold,
            color: '#4b5563',
            textTransform: 'uppercase',
            marginBottom: 4,
        },
        customerName: {
            fontSize: 12,
            fontFamily: pdfTheme.fonts.bold,
            marginBottom: 2,
        },
        customerDetails: {
            fontSize: 9,
            color: '#374151',
            lineHeight: 1.3,
        },
        table: {
            marginTop: 10,
        },
        tableHeader: {
            flexDirection: 'row',
            backgroundColor: '#f3f4f6',
            borderWidth: 1,
            borderColor: '#000',
        },
        tableHeaderCell: {
            fontSize: 9,
            fontFamily: pdfTheme.fonts.bold,
            padding: 6,
            borderRightWidth: 1,
            borderRightColor: '#000',
        },
        tableRow: {
            flexDirection: 'row',
            borderLeftWidth: 1,
            borderLeftColor: '#000',
            borderBottomWidth: 1,
            borderBottomColor: '#000',
        },
        tableCell: {
            fontSize: 9,
            padding: 6,
            borderRightWidth: 1,
            borderRightColor: '#000',
        },
        colDesc: { flex: 5 },
        colQty: { flex: 0.8, textAlign: 'center' },
        colRate: { flex: 1.2, textAlign: 'right' },
        colAmount: { flex: 1.5, textAlign: 'right' },
        summaryContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 20,
        },
        amountInWordsBox: {
            flex: 1,
            paddingRight: 40,
        },
        wordsLabel: {
            fontSize: 8,
            fontFamily: pdfTheme.fonts.bold,
            color: '#6b7280',
            fontStyle: 'italic',
            marginBottom: 2,
        },
        wordsValue: {
            fontSize: 9,
            color: '#111827',
        },
        totalsBox: {
            width: 200,
        },
        totalRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 2,
        },
        totalLabel: {
            fontSize: 9,
        },
        totalValue: {
            fontSize: 9,
        },
        grandTotalRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 6,
            marginTop: 4,
            borderTopWidth: 1,
            borderTopColor: '#000',
            borderBottomWidth: 2,
            borderBottomColor: '#000',
        },
        grandTotalLabel: {
            fontSize: 10,
            fontFamily: pdfTheme.fonts.bold,
        },
        grandTotalValue: {
            fontSize: 10,
            fontFamily: pdfTheme.fonts.bold,
        },
        footer: {
            marginTop: 40,
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        bankDetails: {
            flex: 1,
        },
        signatory: {
            width: 150,
            textAlign: 'center',
            alignItems: 'center',
        },
        footerLabel: {
            fontSize: 8,
            fontFamily: pdfTheme.fonts.bold,
            textTransform: 'uppercase',
            marginBottom: 4,
            color: '#6b7280',
        },
        footerText: {
            fontSize: 8,
            color: '#4b5563',
            lineHeight: 1.3,
        },
        signatureImage: {
            width: 100,
            height: 40,
            marginBottom: 5,
        },
        signatureLine: {
            borderTopWidth: 1,
            borderTopColor: '#000',
            width: '100%',
            paddingTop: 4,
        },
        signatoryLabel: {
            fontSize: 8,
            fontFamily: pdfTheme.fonts.bold,
        },
        paidStamp: {
            position: 'absolute',
            top: 250,
            right: 170,
            borderWidth: 4,
            borderColor: '#059669',
            color: '#059669',
            padding: 10,
            fontSize: 40,
            fontFamily: pdfTheme.fonts.bold,
            transform: 'rotate(-15deg)',
            opacity: 0.2,
            borderRadius: 10,
            zIndex: 100,
        },
        settlementBlock: {
            marginTop: 10,
            padding: 8,
            backgroundColor: '#f8fafc',
            borderWidth: 1,
            borderColor: '#e2e8f0',
            borderRadius: 4,
        }
    });

    const isPaid = data.totals.balanceDue <= 0;
    const hasAdvance = data.totals.advancePaid && data.totals.advancePaid > 0;

    return (
        <Document title={`Invoice-${data.invoice.number}`}>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View style={styles.businessDetails}>
                        <Text style={styles.bizName}>{data.business.name}</Text>
                        <Text style={styles.bizText}>{data.business.address}</Text>
                        <Text style={styles.bizText}>
                            {[data.business.city, data.business.state, data.business.pin].filter(Boolean).join(', ')}
                        </Text>
                        <View style={{ marginTop: 4 }}>
                            {data.business.phone && <Text style={styles.bizText}>Contact: {data.business.phone}</Text>}
                            {data.business.email && <Text style={styles.bizText}>Email: {data.business.email}</Text>}
                            {data.business.gstin && <Text style={styles.bizText}>GSTIN: {data.business.gstin}</Text>}
                            {data.business.pan && <Text style={styles.bizText}>PAN: {data.business.pan}</Text>}
                        </View>
                    </View>
                    <View style={styles.invoiceInfo}>
                        <Text style={styles.title}>INVOICE</Text>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Invoice No:</Text>
                            <Text style={styles.metaValue}>#{data.invoice.number}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Date:</Text>
                            <Text style={styles.metaValue}>{data.invoice.date}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Due Date:</Text>
                            <Text style={styles.metaValue}>{data.invoice.dueDate || '-'}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.billToBox}>
                    <Text style={styles.billToLabel}>Billed To:</Text>
                    <Text style={styles.customerName}>{data.customer.name}</Text>
                    <Text style={styles.customerDetails}>{data.customer.address}</Text>
                    {data.customer.gstin && <Text style={styles.customerDetails}>GSTIN: {data.customer.gstin}</Text>}
                </View>

                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, styles.colDesc]}>Description</Text>
                        <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
                        <Text style={[styles.tableHeaderCell, styles.colRate]}>Rate</Text>
                        <Text style={[styles.tableHeaderCell, styles.colAmount, { borderRightWidth: 0 }]}>Amount</Text>
                    </View>
                    {data.items.map((item, i) => (
                        <View key={i} style={styles.tableRow} wrap={false}>
                            <View style={[styles.tableCell, styles.colDesc]}>
                                <Text style={{ fontFamily: pdfTheme.fonts.bold }}>{item.description}</Text>
                                {item.sacCode ? <Text style={{ fontSize: 7, color: '#666', marginTop: 2 }}>SAC: {item.sacCode}</Text> : null}
                            </View>
                            <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
                            <Text style={[styles.tableCell, styles.colRate]}>{item.rate.toLocaleString('en-IN')}</Text>
                            <Text style={[styles.tableCell, styles.colAmount, { borderRightWidth: 0 }]}>{item.amount.toLocaleString('en-IN')}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.summaryContainer} wrap={false}>
                    <View style={styles.amountInWordsBox}>
                        {data.totals.amountInWords && (
                            <>
                                <Text style={styles.wordsLabel}>Amount in words:</Text>
                                <Text style={styles.wordsValue}>{data.totals.amountInWords}</Text>
                            </>
                        )}
                    </View>
                    <View style={styles.totalsBox}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Subtotal:</Text>
                            <Text style={styles.totalValue}>₹{data.totals.subtotal.toLocaleString('en-IN')}</Text>
                        </View>
                        {data.totals.discount && (
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Discount:</Text>
                                <Text style={styles.totalValue}>- ₹{data.totals.discount.toLocaleString('en-IN')}</Text>
                            </View>
                        )}
                        {data.totals.cgst !== undefined && (
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>CGST:</Text>
                                <Text style={styles.totalValue}>₹{data.totals.cgst.toLocaleString('en-IN')}</Text>
                            </View>
                        )}
                        {data.totals.sgst !== undefined && (
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>SGST:</Text>
                                <Text style={styles.totalValue}>₹{data.totals.sgst.toLocaleString('en-IN')}</Text>
                            </View>
                        )}
                        {data.totals.igst !== undefined && (
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>IGST:</Text>
                                <Text style={styles.totalValue}>₹{data.totals.igst.toLocaleString('en-IN')}</Text>
                            </View>
                        )}
                        {data.totals.tdsAmount !== undefined && (
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>TDS withheld:</Text>
                                <Text style={styles.totalValue}>- ₹{data.totals.tdsAmount.toLocaleString('en-IN')}</Text>
                            </View>
                        )}
                        <View style={styles.grandTotalRow}>
                            <Text style={styles.grandTotalLabel}>INVOICE TOTAL:</Text>
                            <Text style={styles.grandTotalValue}>₹{data.totals.total.toLocaleString('en-IN')}</Text>
                        </View>
                        {hasAdvance && !isPaid && (
                            <View style={styles.settlementBlock}>
                                <View style={[styles.totalRow, { paddingVertical: 1 }]}>
                                    <Text style={[styles.totalLabel, { fontSize: 8, color: '#64748b' }]}>Advance Received:</Text>
                                    <Text style={[styles.totalValue, { fontSize: 8, color: '#64748b' }]}>₹{data.totals.advancePaid!.toLocaleString('en-IN')}</Text>
                                </View>
                                <View style={[styles.totalRow, { marginTop: 4, borderTopWidth: 0.5, borderTopColor: '#cbd5e1', paddingTop: 4 }]}>
                                    <Text style={[styles.totalLabel, { fontFamily: pdfTheme.fonts.bold, color: '#0f172a' }]}>BALANCE DUE:</Text>
                                    <Text style={[styles.totalValue, { fontFamily: pdfTheme.fonts.bold, color: '#0f172a' }]}>₹{data.totals.balanceDue.toLocaleString('en-IN')}</Text>
                                </View>
                            </View>
                        )}
                        {!isPaid && !hasAdvance && (
                            <View style={[styles.grandTotalRow, { borderTopWidth: 0, marginTop: 0 }]}>
                                <Text style={styles.grandTotalLabel}>BALANCE DUE:</Text>
                                <Text style={styles.grandTotalValue}>₹{data.totals.balanceDue.toLocaleString('en-IN')}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {isPaid && (
                    <Text style={styles.paidStamp}>PAID</Text>
                )}

                <View style={styles.footer} wrap={false}>
                    <View style={styles.bankDetails}>
                        <Text style={styles.footerLabel}>Payment Information</Text>
                        {data.bankAccount && (
                            <>
                                <Text style={styles.footerText}>Bank: {data.bankAccount.bankName}</Text>
                                <Text style={styles.footerText}>A/C No: {data.bankAccount.accountNumber}</Text>
                                <Text style={styles.footerText}>IFSC: {data.bankAccount.ifsc}</Text>
                                <Text style={styles.footerText}>A/C Name: {data.bankAccount.holderName}</Text>
                            </>
                        )}
                        {data.terms && (
                            <View style={{ marginTop: 15 }}>
                                <Text style={styles.footerLabel}>Terms & Conditions</Text>
                                <Text style={[styles.footerText, { fontSize: 7 }]}>{data.terms}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.signatory}>
                        {data.business.signatureUrl && (
                            <Image src={data.business.signatureUrl} style={styles.signatureImage} />
                        )}
                        <View style={styles.signatureLine}>
                            <Text style={styles.footerLabel}>Authorized Signatory</Text>
                            <Text style={styles.signatoryLabel}>{data.business.name}</Text>
                        </View>
                    </View>
                </View>
            </Page>
        </Document>
    );
};
