import React from 'react';
import { Page, Document, StyleSheet, View, Text, Image } from '@react-pdf/renderer';
import { InvoicePDFData } from '../types';
import { pdfTheme } from '../theme';

interface Props {
    data: InvoicePDFData;
}

export const CreativeInvoice: React.FC<Props> = ({ data }) => {
    const styles = StyleSheet.create({
        page: {
            padding: 0,
            fontFamily: pdfTheme.fonts.regular,
            backgroundColor: '#FFFFFF',
        },
        hero: {
            backgroundColor: data.business.brandColor,
            height: 180,
            padding: 40,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            color: '#FFFFFF',
        },
        heroTitle: {
            fontSize: 48,
            fontFamily: pdfTheme.fonts.bold,
            opacity: 0.2,
            position: 'absolute',
            top: 20,
            right: 40,
        },
        heroInfo: {
            flex: 1,
        },
        invNumber: {
            fontSize: 24,
            fontFamily: pdfTheme.fonts.bold,
            letterSpacing: 1,
        },
        invDate: {
            fontSize: 10,
            marginTop: 4,
            opacity: 0.9,
        },
        main: {
            padding: 40,
            marginTop: -20,
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
        },
        narrativeSection: {
            flexDirection: 'row',
            marginBottom: 40,
        },
        narrativeCol: {
            flex: 1,
        },
        narrativeLabel: {
            fontSize: 8,
            fontFamily: pdfTheme.fonts.bold,
            color: data.business.brandColor,
            textTransform: 'uppercase',
            marginBottom: 8,
            letterSpacing: 1,
        },
        narrativeName: {
            fontSize: 14,
            fontFamily: pdfTheme.fonts.bold,
            marginBottom: 4,
        },
        narrativeText: {
            fontSize: 9,
            color: '#666',
            lineHeight: 1.4,
            maxWidth: 180,
        },
        itemsList: {
            marginTop: 20,
        },
        itemCard: {
            backgroundColor: '#fcfcfc',
            borderWidth: 1,
            borderColor: '#f0f0f0',
            borderRadius: 12,
            padding: 15,
            marginBottom: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        itemDetails: {
            flex: 1,
        },
        itemTitle: {
            fontSize: 11,
            fontFamily: pdfTheme.fonts.bold,
            color: '#111',
            marginBottom: 2,
        },
        itemSub: {
            fontSize: 8,
            color: '#888',
        },
        itemAmount: {
            fontSize: 12,
            fontFamily: pdfTheme.fonts.bold,
            color: data.business.brandColor,
        },
        breakdownRow: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            marginBottom: 4,
        },
        breakdownLabel: {
            fontSize: 9,
            color: '#64748b',
            width: 100,
            textAlign: 'right',
            marginRight: 20,
        },
        breakdownValue: {
            fontSize: 9,
            fontFamily: pdfTheme.fonts.bold,
            width: 80,
            textAlign: 'right',
        },
        highlightBox: {
            backgroundColor: '#f8fafc',
            borderRadius: 16,
            padding: 24,
            marginTop: 30,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        settlementItem: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 4,
            width: '100%',
        },
        settlementLabel: {
            fontSize: 10,
            fontFamily: pdfTheme.fonts.bold,
            color: '#64748b',
        },
        totalLabel: {
            fontSize: 10,
            fontFamily: pdfTheme.fonts.bold,
            color: '#64748b',
        },
        totalValue: {
            fontSize: 28,
            fontFamily: pdfTheme.fonts.bold,
            color: data.business.brandColor,
        },
        footer: {
            marginTop: 40,
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingTop: 20,
            borderTopWidth: 1,
            borderTopColor: '#f0f0f0',
        },
        footerCol: {
            flex: 1,
        },
        signatureCol: {
            alignItems: 'flex-end',
        },
        sigImage: {
            width: 100,
            height: 40,
            marginBottom: 8,
            opacity: 0.8,
        },
        legalText: {
            fontSize: 7,
            color: '#999',
            lineHeight: 1.4,
            marginTop: 10,
        },
        paidBadge: {
            position: 'absolute',
            top: 100,
            left: '50%',
            marginLeft: -50,
            borderWidth: 3,
            borderColor: '#059669',
            color: '#059669',
            padding: 8,
            fontSize: 20,
            fontFamily: pdfTheme.fonts.bold,
            borderRadius: 8,
            textTransform: 'uppercase',
            opacity: 0.6,
        }
    });

    const isPaid = data.totals.balanceDue <= 0;
    const hasAdvance = data.totals.advancePaid && data.totals.advancePaid > 0;

    return (
        <Document title={`Invoice-${data.invoice.number}`}>
            <Page size="A4" style={styles.page}>
                <View style={styles.hero}>
                    <Text style={styles.heroTitle}>INVOICE</Text>
                    <View style={styles.heroInfo}>
                        <Text style={styles.invNumber}>#{data.invoice.number}</Text>
                        <Text style={styles.invDate}>Issued on {data.invoice.date}</Text>
                        {data.invoice.dueDate && <Text style={styles.invDate}>Due {data.invoice.dueDate}</Text>}
                    </View>
                </View>

                <View style={styles.main}>
                    <View style={styles.narrativeSection}>
                        <View style={styles.narrativeCol}>
                            <Text style={styles.narrativeLabel}>Invoice issued by</Text>
                            <Text style={styles.narrativeName}>{data.business.name}</Text>
                            <Text style={styles.narrativeText}>
                                {data.business.address}
                                {"\n"}{data.business.email}
                                {data.business.gstin && `\nGST: ${data.business.gstin}`}
                            </Text>
                        </View>
                        <View style={styles.narrativeCol}>
                            <Text style={styles.narrativeLabel}>Prepared for</Text>
                            <Text style={styles.narrativeName}>{data.customer.name}</Text>
                            <Text style={styles.narrativeText}>
                                {data.customer.address}
                                {data.customer.gstin && `\nGST: ${data.customer.gstin}`}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.itemsList}>
                        <Text style={styles.narrativeLabel}>Services Provided</Text>
                        {data.items.map((item, i) => (
                            <View key={i} style={styles.itemCard} wrap={false}>
                                <View style={styles.itemDetails}>
                                    <Text style={styles.itemTitle}>{item.description}</Text>
                                    <Text style={styles.itemSub}>
                                        {item.quantity} units at ₹{item.rate.toLocaleString('en-IN')} each
                                    </Text>
                                    {item.sacCode ? (
                                        <Text style={[styles.itemSub, { fontSize: 7, marginTop: 2, color: data.business.brandColor }]}>
                                            SAC: {item.sacCode}
                                        </Text>
                                    ) : null}
                                </View>
                                <Text style={styles.itemAmount}>₹{item.amount.toLocaleString('en-IN')}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={{ marginTop: 30 }}>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Subtotal</Text>
                            <Text style={styles.breakdownValue}>₹{data.totals.subtotal.toLocaleString('en-IN')}</Text>
                        </View>
                        {data.totals.discount && (
                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>Discount</Text>
                                <Text style={styles.breakdownValue}>- ₹{data.totals.discount.toLocaleString('en-IN')}</Text>
                            </View>
                        )}
                        {data.totals.cgst !== undefined && (
                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>CGST</Text>
                                <Text style={styles.breakdownValue}>₹{data.totals.cgst.toLocaleString('en-IN')}</Text>
                            </View>
                        )}
                        {data.totals.sgst !== undefined && (
                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>SGST</Text>
                                <Text style={styles.breakdownValue}>₹{data.totals.sgst.toLocaleString('en-IN')}</Text>
                            </View>
                        )}
                        {data.totals.igst !== undefined && (
                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>IGST</Text>
                                <Text style={styles.breakdownValue}>₹{data.totals.igst.toLocaleString('en-IN')}</Text>
                            </View>
                        )}
                        {data.totals.tdsAmount !== undefined && (
                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>TDS withheld</Text>
                                <Text style={styles.breakdownValue}>- ₹{data.totals.tdsAmount.toLocaleString('en-IN')}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.highlightBox} wrap={false}>
                        <View style={{ width: '100%' }}>
                            {!isPaid && hasAdvance ? (
                                <>
                                    <View style={styles.settlementItem}>
                                        <Text style={styles.settlementLabel}>Invoice Total</Text>
                                        <Text style={[styles.settlementLabel, { color: '#000' }]}>₹{data.totals.total.toLocaleString('en-IN')}</Text>
                                    </View>
                                    <View style={styles.settlementItem}>
                                        <Text style={styles.settlementLabel}>Advance Received</Text>
                                        <Text style={[styles.settlementLabel, { color: data.business.brandColor }]}>- ₹{data.totals.advancePaid!.toLocaleString('en-IN')}</Text>
                                    </View>
                                    <View style={[styles.settlementItem, { marginTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 }]}>
                                        <Text style={[styles.totalLabel, { color: '#000', fontSize: 12 }]}>Balance Due</Text>
                                        <Text style={styles.totalValue}>₹{data.totals.balanceDue.toLocaleString('en-IN')}</Text>
                                    </View>
                                </>
                            ) : (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                    <View>
                                        <Text style={styles.totalLabel}>{isPaid ? 'Total Amount Paid' : 'Total Balance Due'}</Text>
                                        {data.totals.amountInWords && (
                                            <Text style={[styles.itemSub, { marginTop: 4, maxWidth: 200 }]}>
                                                {data.totals.amountInWords}
                                            </Text>
                                        )}
                                    </View>
                                    <Text style={styles.totalValue}>
                                        ₹{(isPaid ? data.totals.total : data.totals.balanceDue).toLocaleString('en-IN')}
                                    </Text>
                                </View>
                            )}

                            {isPaid && (
                                <View style={styles.paidBadge}>
                                    <Text>FULLY PAID</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={styles.footer} wrap={false}>
                        <View style={styles.footerCol}>
                            <Text style={styles.narrativeLabel}>Payment Information</Text>
                            {data.bankAccount ? (
                                <Text style={styles.narrativeText}>
                                    Bank: {data.bankAccount.bankName}
                                    {"\n"}A/C: {data.bankAccount.accountNumber}
                                    {"\n"}IFSC: {data.bankAccount.ifsc}
                                    {"\n"}Name: {data.bankAccount.holderName}
                                </Text>
                            ) : (
                                <Text style={styles.narrativeText}>Please contact for payment details.</Text>
                            )}
                            {data.terms && (
                                <Text style={styles.legalText}>
                                    * {data.terms}
                                </Text>
                            )}
                        </View>
                        <View style={[styles.footerCol, styles.signatureCol]}>
                            {data.business.signatureUrl && (
                                <Image src={data.business.signatureUrl} style={styles.sigImage} />
                            )}
                            <Text style={[styles.narrativeName, { fontSize: 10, marginTop: 5 }]}>{data.business.name}</Text>
                            <Text style={[styles.itemSub, { fontSize: 7 }]}>Digital Signature</Text>
                        </View>
                    </View>
                </View>
            </Page>
        </Document>
    );
};
