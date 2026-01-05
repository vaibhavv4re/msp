import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { InvoicePDFData } from '../types';
import { PDFTheme } from '../theme';

interface Props {
    data: InvoicePDFData;
    theme: PDFTheme;
}

export const PDFLineItemsTable: React.FC<Props> = ({ data, theme }) => {
    const styles = StyleSheet.create({
        table: {
            marginVertical: theme.spacing.rowGap,
        },
        tableHeader: {
            flexDirection: 'row',
            backgroundColor: data.business.brandColor,
            paddingHorizontal: theme.spacing.itemPadding,
            paddingVertical: 6,
            borderRadius: 4,
        },
        tableHeaderCell: {
            color: '#FFFFFF',
            fontSize: theme.fontSize.small,
            fontFamily: theme.fonts.bold,
        },
        tableRow: {
            flexDirection: 'row',
            borderBottomWidth: 0.5,
            borderBottomColor: theme.colors.border,
            paddingHorizontal: theme.spacing.itemPadding,
            paddingVertical: 8,
        },
        tableCell: {
            fontSize: theme.fontSize.small,
            color: theme.colors.text,
        },
        colDesc: { flex: 5 },
        colQty: { flex: 1, textAlign: 'center' },
        colRate: { flex: 1.5, textAlign: 'right' },
        colAmount: { flex: 1.5, textAlign: 'right' },
    });

    return (
        <View style={styles.table}>
            <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colDesc]}>Description</Text>
                <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
                <Text style={[styles.tableHeaderCell, styles.colRate]}>Rate</Text>
                <Text style={[styles.tableHeaderCell, styles.colAmount]}>Amount</Text>
            </View>
            {data.items.map((item, index) => (
                <View key={index} style={styles.tableRow} wrap={false}>
                    <View style={styles.colDesc}>
                        <Text style={[styles.tableCell, { fontFamily: theme.fonts.bold }]}>{item.description}</Text>
                        {item.sacCode ? (
                            <Text style={[styles.tableCell, { fontSize: theme.fontSize.tiny, color: theme.colors.textLight, marginTop: 2 }]}>
                                SAC: {item.sacCode}
                            </Text>
                        ) : null}
                    </View>
                    <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
                    <Text style={[styles.tableCell, styles.colRate]}>{item.rate.toLocaleString('en-IN')}</Text>
                    <Text style={[styles.tableCell, styles.colAmount]}>{item.amount.toLocaleString('en-IN')}</Text>
                </View>
            ))}
        </View>
    );
};
