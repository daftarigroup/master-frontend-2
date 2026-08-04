import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import daftariImg from '@/assets/daftari2.png';
import poojaImg from '@/assets/logo.png';
import sealImg from '@/assets/seal (2).png';

const styles = StyleSheet.create({
    page: {
        padding: '15 8',
        fontFamily: 'Helvetica',
        fontSize: 9,
        color: '#000000',
        backgroundColor: '#ffffff',
    },
    mainContainer: {
        border: '1 solid #000000',
    },
    headerContainer: {
        flexDirection: 'row',
        padding: '6 12',
        borderBottom: '1 solid #000000',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    daftariLogoContainer: {
        width: '45%',
        alignItems: 'flex-start',
    },
    daftariLogo: {
        width: 100,
        height: 60,
        objectFit: 'contain',
    },
    logoContainer: {
        width: '45%',
        alignItems: 'flex-end',
    },
    logo: {
        width: 130,
        height: 55,
        objectFit: 'contain',
    },
    companyInfo: {
        width: '100%',
        textAlign: 'left',
    },
    companyName: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 2,
    },
    companyText: {
        fontSize: 8,
        lineHeight: 1.3,
        marginBottom: 1,
    },
    poHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 8,
        borderBottom: '1 solid #000000',
        backgroundColor: '#f8fafc',
    },
    poNumber: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
    },
    poDate: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
    },
    splitSection: {
        flexDirection: 'row',
        borderBottom: '1 solid #000000',
    },
    leftCol: {
        width: '50%',
        padding: 8,
        borderRight: '1 solid #000000',
    },
    rightCol: {
        width: '50%',
        padding: 8,
    },
    sectionHeading: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 6,
        textTransform: 'uppercase',
        borderBottom: '1 solid #000000',
        paddingBottom: 2,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 3,
    },
    infoLabel: {
        width: '35%',
        fontSize: 8,
    },
    infoValue: {
        width: '65%',
        fontFamily: 'Helvetica-Bold',
        fontSize: 8,
    },
    commercialSection: {
        flexDirection: 'row',
        borderBottom: '1 solid #000000',
    },
    commercialBox: {
        width: '33.33%',
        padding: 8,
        borderRight: '1 solid #000000',
    },
    commercialBoxLast: {
        width: '33.33%',
        padding: 8,
    },
    commercialLabel: {
        fontSize: 8.5,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 4,
    },
    commercialValue: {
        fontSize: 8,
        lineHeight: 1.2,
    },
    tableContainer: {
        marginTop: 0,
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#e2e8f0',
        borderBottom: '1 solid #000000',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottom: '1 solid #000000',
    },
    tableHeaderCell: {
        padding: 6,
        fontFamily: 'Helvetica-Bold',
        fontSize: 8,
        textAlign: 'center',
        borderRight: '1 solid #000000',
    },
    tableCell: {
        padding: 5,
        fontSize: 8,
        textAlign: 'center',
        borderRight: '1 solid #000000',
    },
    colSr: { width: '5%' },
    colInternal: { width: '12%' },
    colProject: { width: '12%' },
    colProduct: { width: '37%' },
    colQty: { width: '8%' },
    colUnit: { width: '8%' },
    colRate: { width: '18%' },
    
    rightAlign: { textAlign: 'right' },
    centerAlign: { textAlign: 'center' },
    leftAlign: { textAlign: 'left' },

    termsContainer: {
        marginTop: 10,
        padding: 8,
    },
    termRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    termNumber: {
        width: '3%',
        fontSize: 8,
    },
    termText: {
        width: '97%',
        fontSize: 8,
    },
    signatureContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 40,
        padding: 20,
    },
    signatureBox: {
        width: '40%',
        textAlign: 'center',
    },
    pdfFooter: {
        marginTop: 12,
        paddingTop: 8,
        borderTop: '1 solid #e2e8f0',
        textAlign: 'center',
    },
    pdfFooterText: {
        fontSize: 7,
        color: '#94a3b8',
        letterSpacing: 1,
    },
});

export interface POPdfProps {
    companyName: string;
    companyPhone: string;
    companyGstin: string;
    companyPan: string;
    companyAddress: string;
    billingAddress: string;
    destinationAddress: string;
    supplierName: string;
    supplierAddress: string;
    supplierGstin: string;
    orderNumber: string;
    orderDate: string;
    quotationNumber: string;
    quotationDate: string;
    enqNo?: string;
    enqDate?: string;
    description?: string;
    items: {
        internalCode: string;
        project: string;
        product: string;
        description: string;
        quantity: number;
        unit: string;
        rate: number;
        gst: number;
        discount: number;
        amount: number;
    }[];
    total: number;
    gstAmount: number;
    grandTotal: number;
    terms: string[];
    preparedBy?: string;
    approvedBy?: string;
    logo?: string;
}

const QuotationPdf = (props: POPdfProps) => {
    const {
        companyName,
        companyPhone,
        companyGstin,
        companyPan,
        companyAddress,
        billingAddress,
        destinationAddress,
        supplierName,
        supplierAddress,
        supplierGstin,
        orderNumber,
        orderDate,
        quotationNumber,
        quotationDate,
        description,
        items,
        terms,
        logo
    } = props;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.mainContainer}>
                    <View style={styles.headerContainer}>
                        <View style={styles.daftariLogoContainer}>
                            <Image src={daftariImg} style={styles.daftariLogo} />
                        </View>
                        <View style={styles.logoContainer}>
                            <Image src={poojaImg} style={styles.logo} />
                        </View>
                    </View>

                    <View style={styles.poHeader}>
                        <Text style={styles.poNumber}>ENQUIRY NO: {quotationNumber}</Text>
                        <Text style={styles.poDate}>DATE: {quotationDate}</Text>
                    </View>

                    <View style={styles.splitSection}>
                        <View style={styles.leftCol}>
                            <Text style={styles.sectionHeading}>To,</Text>
                            <Text style={styles.infoValue}>{supplierName}</Text>
                            <Text style={styles.companyText}>{supplierAddress}</Text>
                            <Text style={styles.companyText}>GSTIN: {supplierGstin}</Text>
                        </View>
                        <View style={styles.rightCol}>
                            <Text style={styles.sectionHeading}>Company Details:</Text>
                            <Text style={styles.companyName}>{companyName || 'POOJA CONSTRUCTIONS'}</Text>
                            <Text style={styles.companyText}>{companyAddress}</Text>
                            <Text style={styles.companyText}>GSTIN: {companyGstin} | PAN: {companyPan}</Text>
                            <Text style={styles.companyText}>Phone: {companyPhone}</Text>
                        </View>
                    </View>

                    {description && (
                        <View style={{ padding: 8, borderBottom: '1 solid #000000' }}>
                            <Text style={styles.sectionHeading}>Description:</Text>
                            <Text style={styles.companyText}>{description}</Text>
                        </View>
                    )}

                    <View style={styles.tableContainer}>
                        <View style={styles.tableHeaderRow}>
                            <Text style={[styles.tableHeaderCell, styles.colSr]}>SR.</Text>
                            <Text style={[styles.tableHeaderCell, styles.colInternal]}>INDENT NO</Text>
                            <Text style={[styles.tableHeaderCell, styles.colProject]}>PROJECT</Text>
                            <Text style={[styles.tableHeaderCell, styles.colProduct]}>PRODUCT</Text>
                            <Text style={[styles.tableHeaderCell, styles.colQty]}>QTY</Text>
                            <Text style={[styles.tableHeaderCell, styles.colUnit]}>UNIT</Text>
                            <Text style={[styles.tableHeaderCell, styles.colRate, styles.rightAlign]}>RATE (₹)</Text>
                        </View>

                        {items.map((item, index) => (
                            <View key={index} style={styles.tableRow}>
                                <Text style={[styles.tableCell, styles.colSr]}>{String(index + 1)}</Text>
                                <Text style={[styles.tableCell, styles.colInternal]}>{String(item.internalCode || '')}</Text>
                                <Text style={[styles.tableCell, styles.colProject]}>{String(item.project || 'N/A')}</Text>
                                <View style={[styles.tableCell, styles.colProduct, { textAlign: 'left' }]}>
                                    <Text style={{ fontFamily: 'Helvetica-Bold' }}>{String(item.product || '')}</Text>
                                    <Text style={{ fontSize: 7, color: '#666' }}>{String(item.description || '')}</Text>
                                </View>
                                <Text style={[styles.tableCell, styles.colQty]}>{String(item.quantity || '0')}</Text>
                                <Text style={[styles.tableCell, styles.colUnit]}>{String(item.unit || '')}</Text>
                                <Text style={[styles.tableCell, styles.colRate, styles.rightAlign]}>{item.rate ? `₹ ${Number(item.rate).toFixed(2)}` : '-'}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.termsContainer}>
                        <Text style={[styles.sectionHeading, { borderBottom: 0 }]}>Terms & Conditions:</Text>
                        {terms.map((term, index) => (
                            <View key={index} style={styles.termRow}>
                                <Text style={styles.termNumber}>{String(index + 1)}.</Text>
                                <Text style={styles.termText}>{String(term || '')}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.signatureContainer}>
                        <View style={styles.signatureBox}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
                                <Image src={sealImg} style={{ width: 140, height: 50, objectFit: 'contain' }} />
                            </View>
                            <View style={{ borderBottom: '1 solid #000000', width: '100%', marginBottom: 4 }} />
                            <Text style={[styles.infoValue, { marginBottom: 2 }]}>Pooja Constructions</Text>
                            <Text style={styles.companyText}>Prepared By</Text>
                        </View>
                        <View style={styles.signatureBox}>
                            <View style={{ height: 45, marginBottom: 2 }} />
                            <View style={{ borderBottom: '1 solid #000000', width: '100%', marginBottom: 4 }} />
                            <Text style={[styles.infoValue, { marginBottom: 2 }]}>{supplierName}</Text>
                            <Text style={styles.companyText}>Authorized Signatory</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.pdfFooter}>
                    <Text style={styles.pdfFooterText}>POWERED BY BOTIVATE</Text>
                </View>
            </Page>
        </Document>
    );
};

export default QuotationPdf;
