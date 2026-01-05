import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { InvoicePDFData } from '../types';
import { PDFTheme } from '../theme';

interface Props {
    data: InvoicePDFData;
    theme: PDFTheme;
}

export const PDFTotalsBlock: React.FC<Props> = ({ data, theme }) => {
    const styles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            marginTop: theme.spacing.rowGap,
        },
        totals: {
            width: 180,
        },
        row: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 2,
        },
        label: {
            fontSize: theme.fontSize.small,
            color: theme.colors.textLight,
        },
        value: {
            fontSize: theme.fontSize.small,
            color: theme.colors.text,
        },
        boldLabel: {
            fontSize: theme.fontSize.base,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
        },
        boldValue: {
            fontSize: theme.fontSize.base,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
        },
        divider: {
            borderBottomWidth: 0.5,
            borderBottomColor: theme.colors.border,
            marginVertical: 4,
        },
        balanceBox: {
            backgroundColor: data.business.brandColor,
            padding: 6,
            borderRadius: 4,
            marginTop: 4,
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        balanceLabel: {
            fontSize: theme.fontSize.base,
            fontFamily: theme.fonts.bold,
            color: '#FFFFFF',
        },
        balanceValue: {
            fontSize: theme.fontSize.base,
            fontFamily: theme.fonts.bold,
            color: '#FFFFFF',
        }
    });

    return (
        <View style={styles.container} wrap={false}>
            <View style={styles.totals}>
                <View style={styles.row}>
                    <Text style={styles.label}>Subtotal:</Text>
                    <Text style={styles.value}>₹{data.totals.subtotal.toLocaleString('en-IN')}</Text>
                </View>

                {data.totals.cgst !== undefined && (
                    <View style={styles.row}>
                        <Text style={styles.label}>CGST:</Text>
                        <Text style={styles.value}>₹{data.totals.cgst.toLocaleString('en-IN')}</Text>
                    </View>
                )}
                {data.totals.sgst !== undefined && (
                    <View style={styles.row}>
                        <Text style={styles.label}>SGST:</Text>
                        <Text style={styles.value}>₹{data.totals.sgst.toLocaleString('en-IN')}</Text>
                    </View>
                )}
                {data.totals.igst !== undefined && (
                    <View style={styles.row}>
                        <Text style={styles.label}>IGST:</Text>
                        <Text style={styles.value}>₹{data.totals.igst.toLocaleString('en-IN')}</Text>
                    </View>
                )}

                <View style={styles.divider} />

                <View style={styles.row}>
                    <Text style={styles.boldLabel}>Grand Total:</Text>
                    <Text style={styles.boldValue}>₹{data.totals.total.toLocaleString('en-IN')}</Text>
                </View>

                {data.totals.advancePaid !== undefined && (
                    <View style={styles.row}>
                        <Text style={styles.label}>Advance Paid:</Text>
                        <Text style={styles.value}>- ₹{data.totals.advancePaid.toLocaleString('en-IN')}</Text>
                    </View>
                )}

                {data.totals.tdsAmount !== undefined && (
                    <View style={styles.row}>
                        <Text style={styles.label}>TDS Deducted:</Text>
                        <Text style={styles.value}>- ₹{data.totals.tdsAmount.toLocaleString('en-IN')}</Text>
                    </View>
                )}

                <View style={styles.balanceBox}>
                    <Text style={styles.balanceLabel}>BALANCE DUE:</Text>
                    <Text style={styles.balanceValue}>₹{data.totals.balanceDue.toLocaleString('en-IN')}</Text>
                </View>
            </View>
        </View>
    );
};
