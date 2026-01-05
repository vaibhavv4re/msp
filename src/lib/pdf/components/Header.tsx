import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { InvoicePDFData } from '../types';
import { PDFTheme } from '../theme';

interface Props {
    data: InvoicePDFData;
    theme: PDFTheme;
}

export const PDFHeader: React.FC<Props> = ({ data, theme }) => {
    const styles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.sectionGap,
            borderBottomWidth: 1,
            borderBottomColor: data.business.brandColor,
            paddingBottom: theme.spacing.rowGap,
        },
        title: {
            fontSize: theme.fontSize.title,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
        },
        businessInfo: {
            textAlign: 'right',
            maxWidth: '50%',
        },
        businessName: {
            fontSize: theme.fontSize.large,
            fontFamily: theme.fonts.bold,
            color: theme.colors.text,
            marginBottom: 2,
        },
        text: {
            fontSize: theme.fontSize.small,
            color: theme.colors.textLight,
            marginBottom: 1,
            lineHeight: 1.2,
        }
    });

    return (
        <View style={styles.container}>
            <View>
                <Text style={styles.title}>INVOICE</Text>
            </View>
            <View style={styles.businessInfo}>
                <Text style={styles.businessName}>{data.business.name}</Text>
                {data.business.legalName && data.business.legalName !== data.business.name && (
                    <Text style={styles.text}>{data.business.legalName}</Text>
                )}
                {data.business.address && (
                    <Text style={styles.text}>
                        {[data.business.address, data.business.city, data.business.state, data.business.pin].filter(Boolean).join(', ')}
                    </Text>
                )}
                {data.business.gstin && <Text style={styles.text}>GSTN: {data.business.gstin}</Text>}
                {data.business.email && <Text style={styles.text}>{data.business.email}</Text>}
            </View>
        </View>
    );
};
