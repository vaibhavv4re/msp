import React from 'react';
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import { InvoicePDFData } from '../types';
import { PDFTheme } from '../theme';

interface Props {
    data: InvoicePDFData;
    theme: PDFTheme;
}

export const PDFFooter: React.FC<Props> = ({ data, theme }) => {
    const styles = StyleSheet.create({
        container: {
            marginTop: theme.spacing.sectionGap,
        },
        section: {
            marginBottom: theme.spacing.rowGap,
        },
        label: {
            fontSize: theme.fontSize.tiny,
            fontFamily: theme.fonts.bold,
            color: theme.colors.textLighter,
            textTransform: 'uppercase',
            marginBottom: 2,
        },
        text: {
            fontSize: theme.fontSize.small,
            color: theme.colors.textLight,
            lineHeight: 1.4,
        },
        bottomRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: theme.spacing.rowGap,
            borderTopWidth: 0.5,
            borderTopColor: theme.colors.border,
            paddingTop: theme.spacing.rowGap,
        },
        paymentInfo: {
            flex: 1,
        },
        signature: {
            flex: 1,
            alignItems: 'flex-end',
        },
        signatureImage: {
            width: 100,
            height: 40,
            marginBottom: 4,
        },
        signatureLabel: {
            fontSize: theme.fontSize.tiny,
            fontFamily: theme.fonts.bold,
            color: theme.colors.textLighter,
            textAlign: 'center',
            borderTopWidth: 0.5,
            borderTopColor: data.business.brandColor,
            paddingTop: 4,
            width: 120,
        }
    });

    return (
        <View style={styles.container}>
            {data.notes && (
                <View style={styles.section} wrap={false}>
                    <Text style={styles.label}>Notes</Text>
                    <Text style={styles.text}>{data.notes}</Text>
                </View>
            )}

            {data.terms && (
                <View style={styles.section} wrap={false}>
                    <Text style={styles.label}>Terms & Conditions</Text>
                    <Text style={styles.text}>{data.terms}</Text>
                </View>
            )}

            <View style={styles.bottomRow} wrap={false}>
                <View style={styles.paymentInfo}>
                    {data.bankAccount && (
                        <>
                            <Text style={[styles.label, { color: data.business.brandColor }]}>Payment Details</Text>
                            <Text style={styles.text}>Bank: {data.bankAccount.bankName}</Text>
                            <Text style={styles.text}>A/C Name: {data.bankAccount.holderName}</Text>
                            <Text style={styles.text}>A/C No: {data.bankAccount.accountNumber}</Text>
                            <Text style={styles.text}>IFSC: {data.bankAccount.ifsc}</Text>
                            {data.bankAccount.upiId && <Text style={styles.text}>UPI: {data.bankAccount.upiId}</Text>}
                        </>
                    )}
                </View>

                <View style={styles.signature}>
                    {data.business.signatureUrl && (
                        <>
                            <Image src={data.business.signatureUrl} style={styles.signatureImage} />
                            <Text style={styles.signatureLabel}>Authorized Signatory</Text>
                        </>
                    )}
                </View>
            </View>
        </View>
    );
};
