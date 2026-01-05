import React from 'react';
import { Page, Document, StyleSheet, View, Text } from '@react-pdf/renderer';
import { InvoicePDFData } from '../types';
import { pdfTheme } from '../theme';

interface Props {
    data: InvoicePDFData;
}

export const CompactInvoice: React.FC<Props> = ({ data }) => {
    const styles = StyleSheet.create({
        page: {
            padding: 30,
            fontFamily: pdfTheme.fonts.regular,
            backgroundColor: '#FFFFFF',
            fontSize: 8,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            borderBottomWidth: 0.5,
            borderBottomColor: '#eee',
            paddingBottom: 8,
            marginBottom: 15,
        },
        bizName: {
            fontSize: 12,
            fontFamily: pdfTheme.fonts.bold,
            color: data.business.brandColor,
        },
        headerMeta: {
            fontSize: 9,
            color: '#666',
        },
        addressSection: {
            flexDirection: 'row',
            marginBottom: 20,
        },
        addressCol: {
            flex: 1,
        },
        label: {
            fontSize: 7,
            fontFamily: pdfTheme.fonts.bold,
            color: '#999',
            textTransform: 'uppercase',
            marginBottom: 2,
        },
        addressText: {
            lineHeight: 1.3,
            color: '#444',
        },
        table: {
            marginTop: 10,
        },
        tableHeader: {
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: '#000',
            paddingVertical: 4,
        },
        headerCell: {
            fontFamily: pdfTheme.fonts.bold,
            color: '#000',
        },
        tableRow: {
            flexDirection: 'row',
            paddingVertical: 6,
            borderBottomWidth: 0.5,
            borderBottomColor: '#f0f0f0',
        },
        colDesc: { flex: 6 },
        colPrice: { flex: 2, textAlign: 'right' },
        itemTitle: {
            fontFamily: pdfTheme.fonts.bold,
            fontSize: 8,
            marginBottom: 1,
        },
        itemSub: {
            fontSize: 7,
            color: '#666',
        },
        bottomSection: {
            flexDirection: 'row',
            marginTop: 15,
            justifyContent: 'space-between',
        },
        paymentBox: {
            width: '50%',
        },
        totalsBox: {
            width: '40%',
        },
        totalRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 2,
        },
        grandTotal: {
            borderTopWidth: 1,
            borderTopColor: '#000',
            marginTop: 4,
            paddingTop: 4,
        },
        grandTotalLabel: {
            fontFamily: pdfTheme.fonts.bold,
            fontSize: 9,
        },
        grandTotalValue: {
            fontFamily: pdfTheme.fonts.bold,
            fontSize: 9,
            color: data.business.brandColor,
        },
        paidBadge: {
            backgroundColor: '#059669',
            color: '#FFFFFF',
            paddingVertical: 4,
            paddingHorizontal: 8,
            borderRadius: 4,
            fontSize: 10,
            fontFamily: pdfTheme.fonts.bold,
            alignSelf: 'flex-start',
            marginTop: 10,
        },
        settlementDivider: {
            borderTopWidth: 0.5,
            borderTopColor: '#e5e7eb',
            marginVertical: 4,
        }
    });

    const isPaid = data.totals.balanceDue <= 0;
    const hasAdvance = data.totals.advancePaid && data.totals.advancePaid > 0;

    return (
        <Document title={`Invoice-${data.invoice.number}`}>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.bizName}>{data.business.name}</Text>
                    <Text style={styles.headerMeta}>
                        Inv #{data.invoice.number}  |  {data.invoice.date}
                    </Text>
                </View>

                <View style={styles.addressSection}>
                    <View style={styles.addressCol}>
                        <Text style={styles.label}>From</Text>
                        <Text style={[styles.addressText, { fontFamily: pdfTheme.fonts.bold }]}>{data.business.name}</Text>
                        <Text style={styles.addressText}>{data.business.address}</Text>
                        {data.business.gstin && <Text style={styles.addressText}>GST: {data.business.gstin}</Text>}
                    </View>
                    <View style={styles.addressCol}>
                        <Text style={styles.label}>To</Text>
                        <Text style={[styles.addressText, { fontFamily: pdfTheme.fonts.bold }]}>{data.customer.name}</Text>
                        <Text style={styles.addressText}>{data.customer.address}</Text>
                        {data.customer.gstin && <Text style={styles.addressText}>GST: {data.customer.gstin}</Text>}
                    </View>
                </View>

                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.headerCell, styles.colDesc]}>Description</Text>
                        <Text style={[styles.headerCell, styles.colPrice]}>Amount</Text>
                    </View>
                    {data.items.map((item, i) => (
                        <View key={i} style={styles.tableRow} wrap={false}>
                            <View style={styles.colDesc}>
                                <Text style={styles.itemTitle}>{item.description}</Text>
                                <Text style={styles.itemSub}>
                                    {item.quantity} × ₹{item.rate.toLocaleString('en-IN')}
                                </Text>
                                {item.sacCode ? <Text style={[styles.itemSub, { fontSize: 6, marginTop: 1 }]}>SAC: {item.sacCode}</Text> : null}
                            </View>
                            <Text style={[styles.colPrice, { fontFamily: pdfTheme.fonts.bold }]}>
                                ₹{item.amount.toLocaleString('en-IN')}
                            </Text>
                        </View>
                    ))}
                </View>

                <View style={styles.bottomSection}>
                    <View style={styles.paymentBox}>
                        <Text style={styles.label}>Payment Details</Text>
                        {data.bankAccount && (
                            <Text style={styles.addressText}>
                                {data.bankAccount.bankName} - {data.bankAccount.accountNumber}
                                {"\n"}IFSC: {data.bankAccount.ifsc}
                            </Text>
                        )}
                        {data.terms && (
                            <View style={{ marginTop: 8 }}>
                                <Text style={styles.label}>Terms</Text>
                                <Text style={[styles.addressText, { fontSize: 6 }]}>{data.terms}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.totalsBox}>
                        <View style={styles.totalRow}>
                            <Text>Subtotal</Text>
                            <Text>₹{data.totals.subtotal.toLocaleString('en-IN')}</Text>
                        </View>
                        {data.totals.discount && (
                            <View style={styles.totalRow}>
                                <Text>Discount</Text>
                                <Text>- ₹{data.totals.discount.toLocaleString('en-IN')}</Text>
                            </View>
                        )}
                        {(data.totals.cgst || data.totals.sgst || data.totals.igst) && (
                            <View style={styles.totalRow}>
                                <Text>Tax</Text>
                                <Text>₹{((data.totals.cgst || 0) + (data.totals.sgst || 0) + (data.totals.igst || 0)).toLocaleString('en-IN')}</Text>
                            </View>
                        )}
                        <View style={styles.totalRow}>
                            <Text style={{ fontFamily: pdfTheme.fonts.bold }}>Invoice Total</Text>
                            <Text style={{ fontFamily: pdfTheme.fonts.bold }}>₹{data.totals.total.toLocaleString('en-IN')}</Text>
                        </View>
                        {hasAdvance && !isPaid ? (
                            <View style={{ marginTop: 4, backgroundColor: '#f9fafb', padding: 6, borderRadius: 4 }}>
                                <View style={styles.totalRow}>
                                    <Text style={{ fontSize: 7, color: '#666' }}>Advance Received</Text>
                                    <Text style={{ fontSize: 7, color: '#666' }}>₹{data.totals.advancePaid!.toLocaleString('en-IN')}</Text>
                                </View>
                                <View style={styles.settlementDivider} />
                                <View style={styles.totalRow}>
                                    <Text style={styles.grandTotalLabel}>Balance Due</Text>
                                    <Text style={styles.grandTotalValue}>₹{data.totals.balanceDue.toLocaleString('en-IN')}</Text>
                                </View>
                            </View>
                        ) : !isPaid ? (
                            <View style={[styles.totalRow, styles.grandTotal]}>
                                <Text style={styles.grandTotalLabel}>Balance Due</Text>
                                <Text style={styles.grandTotalValue}>₹{data.totals.balanceDue.toLocaleString('en-IN')}</Text>
                            </View>
                        ) : (
                            <View style={styles.paidBadge}>
                                <Text>FULLY PAID</Text>
                            </View>
                        )}
                        {data.totals.amountInWords && (
                            <Text style={[styles.itemSub, { marginTop: 6, textAlign: 'right', fontStyle: 'italic' }]}>
                                {data.totals.amountInWords}
                            </Text>
                        )}
                    </View>
                </View>
            </Page>
        </Document>
    );
};
