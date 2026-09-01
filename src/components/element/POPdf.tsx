import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import sealImg from '@/assets/seal (2).png';
import daftariImg from '@/assets/daftari2.png';

const styles = StyleSheet.create({
    page: {
        paddingTop: 15,
        paddingBottom: 135,
        paddingLeft: 8,
        paddingRight: 8,
        fontFamily: 'Helvetica',
        fontSize: 9,
        color: '#000000',
        backgroundColor: '#ffffff',
    },
    mainContainer: {
        borderTop: '1 solid #000000',
        borderLeft: '1 solid #000000',
        borderRight: '1 solid #000000',
        flexGrow: 1,
    },
    headerContainer: {
        flexDirection: 'row',
        padding: '2 4',
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
        height: 75,
        objectFit: 'contain',
        alignSelf: 'flex-start',
        marginLeft: -4,
    },
    logoContainer: {
        width: '55%',
        alignItems: 'flex-end',
    },
    logo: {
        width: 190,
        height: 80,
        objectFit: 'contain',
    },
    companyName: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 4,
    },
    companyText: {
        fontSize: 8,
        marginBottom: 2,
    },
    poHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 8,
        borderBottom: '1 solid #000000',
    },
    poNumber: {
        width: '50%',
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'left',
    },
    poDate: {
        width: '50%',
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'right',
    },
    poDetailsHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginHorizontal: 8,
        marginTop: 8,
        marginBottom: 6,
        borderBottom: '1 solid #000000',
        paddingBottom: 2,
    },
    poDetailsHeading: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
    },
    poDeliveryDateHeading: {
        fontSize: 9,
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
    commercialBox4: {
        width: '25%',
        padding: 6,
        borderRight: '1 solid #000000',
    },
    commercialBox4Last: {
        width: '25%',
        padding: 6,
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
        marginTop: 4,
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#e2e8f0',
        borderBottom: '1 solid #000000',
        borderTop: '1 solid #000000',
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
    colInternalCode: { width: '12%' },
    colProduct: { width: '30%' },
    colQty: { width: '7%' },
    colUnit: { width: '7%' },
    colRate: { width: '9%' },
    colGst: { width: '7%' },
    colDiscount: { width: '8%' },
    colAmount: { width: '15%' },
    rightAlign: { textAlign: 'right' },
    centerAlign: { textAlign: 'center' },
    leftAlign: { textAlign: 'left' },

    totalSection: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        borderBottom: '1 solid #000000',
        padding: 6,
    },
    totalBox: {
        width: '38%',
        border: '1 solid #000000',
        padding: 2,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: '4 8',
    },
    totalLabel: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 8.5,
    },
    totalValue: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 8.5,
    },
    termsContainer: {
        borderTop: '1 solid #000000',
    },
    termsHeaderRow: {
        backgroundColor: '#e2e8f0',
        borderBottom: '1 solid #000000',
        padding: '4 8',
    },
    termsHeading: {
        fontSize: 8.5,
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
    },
    termRow: {
        flexDirection: 'row',
        borderBottom: '1 solid #000000',
        padding: 4,
    },
    termNumber: {
        width: '5%',
        paddingLeft: 4,
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
    },
    termText: {
        width: '95%',
        fontSize: 8,
        lineHeight: 1.3,
    },
    signatureContainer: {
        position: 'absolute',
        bottom: 15,
        left: 8,
        right: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        padding: '4 6',
        border: '1 solid #000000',
        backgroundColor: '#ffffff',
    },
    signatureLeft: {
        width: '55%',
    },
    signatureRight: {
        width: '45%',
        alignItems: 'flex-end',
    },
    forText: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 2,
    },
    signText: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 5,
    },
    supplierStampName: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
    },
    stampText: {
        fontSize: 9,
        fontFamily: 'Helvetica',
        fontStyle: 'italic',
    },
    lineContainer: {
        marginTop: 4,
    },
    signLine: {
        width: 240,
        borderTop: '1 solid #000000',
        marginTop: 4,
    },
    stampLine: {
        width: 150,
        borderTop: '1 solid #000000',
        marginTop: 4,
    },
    authImagesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginBottom: 2,
        marginLeft: -4,
    },
    authSealImg: {
        width: 180,
        height: 70,
        objectFit: 'contain',
        alignSelf: 'flex-start',
    },
});

interface Item {
    internalCode: string;
    quotationNo: string;
    product: string;
    paymentTerm: string;
    qty: number;
    unit: string;
    rate: number;
    gst: number;
    discount: number;
    amount: number;
}

export interface POPdfProps {
    poNumber: string;
    poDate: string;
    deliveryDate: string;
    supplierName: string;
    supplierAddress: string;
    supplierGstin: string;
    supplierContactPerson: string;
    supplierPhone: string;
    supplierEmail: string;
    projectName: string;
    deliveryAddress: string;
    deliveryContactPerson: string;
    deliveryPhone: string;
    deliveryEmail: string;
    siteEngineerName?: string;
    siteEngineerEmail?: string;
    siteEngineerPhoneNo?: string;
    siteEngineerName2?: string;
    siteEngineerEmail2?: string;
    siteEngineerPhoneNo2?: string;
    items: Item[];
    totalAmount: number;
    logo?: string;
    authorizedSignatory?: string;
    companyName: string;
    companyAddress: string;
    companyPhone: string;
    companyEmail: string;
    companyGstin: string;
    companyPan: string;
    companyContactPerson: string;
    subtotal: number;
    totalGst: number;
    terms: { num: string; text: string }[];
}

export default function PoojaPOFormat(props: POPdfProps) {
    const {
        poNumber,
        poDate,
        deliveryDate,
        supplierName,
        supplierAddress,
        supplierGstin,
        supplierContactPerson,
        supplierPhone,
        supplierEmail,
        projectName,
        deliveryAddress,
        deliveryContactPerson,
        deliveryPhone,
        deliveryEmail,
        siteEngineerName,
        siteEngineerEmail,
        siteEngineerPhoneNo,
        siteEngineerName2,
        siteEngineerEmail2,
        siteEngineerPhoneNo2,
        items,
        totalAmount,
        logo,
        authorizedSignatory = 'Authorized Signatory',
        companyName,
        companyAddress,
        companyPhone,
        companyEmail,
        companyGstin,
        companyPan,
        companyContactPerson,
        subtotal,
        totalGst,
        terms,
    } = props;

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.mainContainer}>
                    {/* Header */}
                    <View style={styles.headerContainer}>
                        <View style={styles.daftariLogoContainer}>
                            <Image src={daftariImg} style={styles.daftariLogo} />
                        </View>
                        <View style={styles.logoContainer}>
                            {logo && <Image src={logo} style={styles.logo} />}
                        </View>
                    </View>

                    {/* PO Number and Date */}
                    <View style={styles.poHeader}>
                        <Text style={styles.poNumber}>P.O. No.: {poNumber}</Text>
                        <Text style={styles.poDate}>P.O. Date : {poDate}</Text>
                    </View>

                    {/* Supplier and Contact Details */}
                    <View style={styles.splitSection}>
                        <View style={styles.leftCol}>
                            <Text style={styles.sectionHeading}>Supplier's Details:</Text>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Company Name:</Text>
                                <Text style={styles.infoValue}>{supplierName}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Address:</Text>
                                <Text style={styles.infoValue}>{supplierAddress}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>GSTIN:</Text>
                                <Text style={styles.infoValue}>{supplierGstin}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Contact Person:</Text>
                                <Text style={styles.infoValue}>{supplierContactPerson}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Phone Number:</Text>
                                <Text style={styles.infoValue}>{supplierPhone}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Email Id:</Text>
                                <Text style={styles.infoValue}>{supplierEmail}</Text>
                            </View>
                        </View>
                        <View style={styles.rightCol}>
                            <Text style={styles.sectionHeading}>Contact Details:</Text>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Company Name:</Text>
                                <Text style={styles.infoValue}>{companyName}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Billing Address:</Text>
                                <Text style={styles.infoValue}>{companyAddress}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>GST IN:</Text>
                                <Text style={styles.infoValue}>{companyGstin}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Contact Person:</Text>
                                <Text style={styles.infoValue}>{companyContactPerson}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Phone No.:</Text>
                                <Text style={styles.infoValue}>{companyPhone}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Email ID:</Text>
                                <Text style={styles.infoValue}>{companyEmail}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Project and Delivery */}
                    <View style={styles.commercialSection}>
                        <View style={styles.commercialBox4}>
                            <Text style={styles.commercialLabel}>Project Name:</Text>
                            <Text
                                style={[
                                    styles.commercialValue,
                                    { fontFamily: 'Helvetica-Bold', fontSize: 8.5 },
                                ]}
                            >
                                {projectName}
                            </Text>
                        </View>
                        <View style={styles.commercialBox4}>
                            <Text style={styles.commercialLabel}>Delivery Address:</Text>
                            <Text style={styles.commercialValue}>{deliveryAddress}</Text>
                        </View>
                        <View style={styles.commercialBox4}>
                            <Text style={styles.commercialLabel}>Site Incharge Details 1:</Text>
                            <Text style={styles.commercialValue}>
                                Name: {siteEngineerName || '--'}
                            </Text>
                            <Text style={styles.commercialValue}>
                                Phone: {siteEngineerPhoneNo || '--'}
                            </Text>
                            <Text style={styles.commercialValue}>
                                Email: {siteEngineerEmail || '--'}
                            </Text>
                        </View>
                        <View style={styles.commercialBox4Last}>
                            <Text style={styles.commercialLabel}>Site Incharge Details 2:</Text>
                            <Text style={styles.commercialValue}>
                                Name: {siteEngineerName2 || '--'}
                            </Text>
                            <Text style={styles.commercialValue}>
                                Phone: {siteEngineerPhoneNo2 || '--'}
                            </Text>
                            <Text style={styles.commercialValue}>
                                Email: {siteEngineerEmail2 || '--'}
                            </Text>
                        </View>
                    </View>

                    {/* Purchase Order Details Table */}
                    <View style={styles.tableContainer}>
                        <View style={styles.poDetailsHeaderRow}>
                            <Text style={styles.poDetailsHeading}>Purchase Order Details:</Text>
                            <Text style={styles.poDeliveryDateHeading}>
                                Delivery Date: {deliveryDate}
                            </Text>
                        </View>

                        <View style={styles.tableHeaderRow}>
                            <Text style={[styles.tableHeaderCell, styles.colSr]}>S/N</Text>
                            <Text style={[styles.tableHeaderCell, styles.colInternalCode]}>
                                Internal Code
                            </Text>
                            <Text style={[styles.tableHeaderCell, styles.colProduct]}>Product</Text>
                            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
                            <Text style={[styles.tableHeaderCell, styles.colUnit]}>Unit</Text>
                            <Text style={[styles.tableHeaderCell, styles.colRate]}>Rate</Text>
                            <Text style={[styles.tableHeaderCell, styles.colGst]}>GST (%)</Text>
                            <Text style={[styles.tableHeaderCell, styles.colDiscount]}>
                                Discount (%)
                            </Text>
                            <Text style={[styles.tableHeaderCell, styles.colAmount]}>
                                Amount (₹)
                            </Text>
                        </View>

                        {items.map((item, index) => (
                            <View style={styles.tableRow} key={index} wrap={false}>
                                <Text style={[styles.tableCell, styles.colSr]}>{index + 1}</Text>
                                <Text style={[styles.tableCell, styles.colInternalCode]}>
                                    {item.internalCode}
                                </Text>
                                <Text style={[styles.tableCell, styles.colProduct]}>
                                    {item.product}
                                </Text>
                                <Text style={[styles.tableCell, styles.colQty, styles.rightAlign]}>
                                    {item.qty}
                                </Text>
                                <Text style={[styles.tableCell, styles.colUnit]}>{item.unit}</Text>
                                <Text style={[styles.tableCell, styles.colRate, styles.rightAlign]}>
                                    {formatCurrency(item.rate)}
                                </Text>
                                <Text style={[styles.tableCell, styles.colGst, styles.rightAlign]}>
                                    {item.gst}
                                </Text>
                                <Text
                                    style={[
                                        styles.tableCell,
                                        styles.colDiscount,
                                        styles.rightAlign,
                                    ]}
                                >
                                    {item.discount}
                                </Text>
                                <Text
                                    style={[styles.tableCell, styles.colAmount, styles.rightAlign]}
                                >
                                    {formatCurrency(item.amount)}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Total */}
                    <View style={styles.totalSection}>
                        <View style={styles.totalBox}>
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Total:</Text>
                                <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
                            </View>
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>GST Amount:</Text>
                                <Text style={styles.totalValue}>{formatCurrency(totalGst)}</Text>
                            </View>
                            <View
                                style={[
                                    styles.totalRow,
                                    { borderTop: '1 solid #000000', marginTop: 2, paddingTop: 2 },
                                ]}
                            >
                                <Text style={styles.totalLabel}>Grand Total:</Text>
                                <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Terms and Conditions */}
                    <View style={styles.termsContainer}>
                        <View style={styles.termsHeaderRow} wrap={false}>
                            <Text style={styles.termsHeading}>Terms & Conditions</Text>
                        </View>
                        {terms &&
                            terms.map((term, idx) => (
                                <View style={styles.termRow} key={idx} wrap={false}>
                                    <Text style={styles.termNumber}>{term.num}</Text>
                                    <Text style={styles.termText}>{term.text}</Text>
                                </View>
                            ))}
                    </View>
                </View>

                {/* Signature Section — Fixed Footer on Every Page */}
                <View style={styles.signatureContainer} fixed>
                    <View style={styles.signatureLeft}>
                        <Text style={styles.forText}>For, Pooja Constructions</Text>
                        <View style={styles.authImagesRow}>
                            <Image src={sealImg} style={styles.authSealImg} />
                        </View>
                        <View style={styles.lineContainer}>
                            <View style={styles.signLine} />
                            <Text style={styles.stampText}>{authorizedSignatory}</Text>
                        </View>
                    </View>
                    <View style={styles.signatureRight}>
                        <Text style={styles.signText}>Authorized Signatory</Text>
                        <Text style={styles.supplierStampName}>{supplierName}</Text>
                        <View style={styles.lineContainer}>
                            <View style={styles.stampLine} />
                            <Text style={styles.stampText}>(Seal & Stamp)</Text>
                        </View>
                    </View>
                </View>
            </Page>
        </Document>
    );
}
