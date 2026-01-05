import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { InvoicePDFData } from '../types';
import { PDFTheme } from '../theme';

interface Props {
    data: InvoicePDFData;
    theme: PDFTheme;
}

export const PDFInfoRow: React.FC<Props> = ({ data, theme }) => {
    const styles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.sectionGap,
        },
        column: {
            flex: 1,
        },
        label: {
            fontSize: theme.fontSize.tiny,
            fontFamily: theme.fonts.bold,
            color: theme.colors.textLighter,
            textTransform: 'uppercase',
            marginBottom: 4,
        },
        value: {
            fontSize: theme.fontSize.base,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
            marginBottom: 2,
        },
        text: {
            fontSize: theme.fontSize.small,
            color: theme.colors.textLight,
            marginBottom: 1,
        },
        infoGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            width: '100%',
        },
        infoItem: {
            width: '45%',
            marginBottom: 6,
            textAlign: 'right',
        },
        infoLabel: {
            fontSize: theme.fontSize.tiny,
            fontFamily: theme.fonts.bold,
            color: theme.colors.textLighter,
            textTransform: 'uppercase',
        },
        infoValue: {
            fontSize: theme.fontSize.small,
            color: theme.colors.text,
        }
    });

    return (
        <View style={styles.container}>
            <View style={styles.column}>
                <Text style={styles.label}>Bill To</Text>
                <Text style={styles.value}>{data.customer.name}</Text>
                {data.customer.gstin && <Text style={styles.text}>GSTIN: {data.customer.gstin}</Text>}
                {data.customer.address && <Text style={styles.text}>{data.customer.address}</Text>}
            </View>
            <View style={[styles.column, { alignItems: 'flex-end' }]}>
                <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Invoice #</Text>
                        <Text style={styles.infoValue}>{data.invoice.number}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Date</Text>
                        <Text style={styles.infoValue}>{data.invoice.date}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Due Date</Text>
                        <Text style={styles.infoValue}>{data.invoice.dueDate || '-'}</Text>
                    </View>
                    {data.invoice.orderNumber && (
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Order #</Text>
                            <Text style={styles.infoValue}>{data.invoice.orderNumber}</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};
