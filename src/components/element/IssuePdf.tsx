// Updated: 2026-08-31
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: {
        padding: 24,
        fontFamily: 'Helvetica',
        fontSize: 9.5,
        color: '#333',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 6,
    },
    logo: {
        width: 140,
        height: 46,
        objectFit: 'contain',
    },
    header: {
        marginBottom: 10,
        borderBottom: '2 solid #4f46e5',
        paddingBottom: 5,
        alignItems: 'center',
    },
    title: {
        fontSize: 17,
        fontFamily: 'Helvetica-Bold',
        color: '#4f46e5',
        textAlign: 'center',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 8.5,
        textAlign: 'center',
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 10,
        backgroundColor: '#f8fafc',
        padding: 9,
        borderRadius: 5,
    },
    infoItem: {
        width: '25%',
        marginBottom: 5,
    },
    label: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 7.5,
        color: '#64748b',
        marginBottom: 2,
    },
    value: {
        fontSize: 9.5,
        color: '#1e293b',
    },
    table: {
        marginTop: 6,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#4f46e5',
        color: '#ffffff',
        padding: 6,
        fontFamily: 'Helvetica-Bold',
        fontSize: 8.5,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottom: '1 solid #e2e8f0',
        padding: 6,
        alignItems: 'center',
    },
    colSr: { width: '5%', textAlign: 'center' },
    colMain: { width: '40%' },
    colQty: { width: '12%', textAlign: 'center' },
    colUom: { width: '8%' },
    colReturnQty: { width: '12%', textAlign: 'center' },
    colRemark: { width: '35%' },
    specText: {
        fontSize: 7.5,
        color: '#64748b',
        marginTop: 2,
    },
    footer: {
        position: 'absolute',
        bottom: 16,
        left: 24,
        right: 24,
        borderTop: '1 solid #e2e8f0',
        paddingTop: 4,
        textAlign: 'center',
        fontSize: 7.5,
        color: '#94a3b8',
    },
    signatureSection: {
        position: 'absolute',
        bottom: 40,
        left: 24,
        right: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 40,
    },
    signatureBox: {
        alignItems: 'center',
        width: '25%',
    },
    signatureLine: {
        width: '100%',
        borderTop: '1 solid #333',
        marginBottom: 4,
    },
    signatureLabel: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        color: '#1e293b',
    },
    signatureName: {
        fontSize: 8.5,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 2,
        color: '#1e293b',
    },
});

interface Product {
    productName: string;
    groupHead: string;
    // department: string;
    quantity: number;
    uom: string;
}

export interface IssuePdfProps {
    type: 'issue' | 'return';
    issueNumber: string;
    date: string;
    plannedDate?: string;
    constructorName: string;
    siteLocation: string;
    projectName: string;
    remarks?: string;
    issuePersonName?: string;
    returnPersonName?: string;
    damageRemark?: string;
    rejectedDamageQty?: number;
    products: Product[];
    logo?: string;
}

const IssuePdf = ({
    type,
    issueNumber,
    date,
    plannedDate,
    constructorName,
    siteLocation,
    projectName,
    remarks,
    issuePersonName,
    returnPersonName,
    damageRemark,
    rejectedDamageQty,
    products,
    logo
}: IssuePdfProps) => {
    const isReturn = type === 'return';
    
    return (
        <Document>
            {/* Page 1: Original Copy */}
            <Page size="A4" orientation="landscape" style={styles.page}>
                <View style={{ position: 'absolute', top: 16, right: 24 }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#94a3b8' }}>ORIGINAL COPY</Text>
                </View>

                {logo ? (
                    <View style={styles.logoContainer}>
                        <Image src={logo} style={styles.logo} />
                    </View>
                ) : null}

                <View style={styles.header}>
                    <Text style={styles.title}>{isReturn ? 'STORE RETURN SLIP' : 'STORE ISSUE SLIP'}</Text>
                    <Text style={styles.subtitle}>{isReturn ? 'Material Return Confirmation' : 'Material Issue Note'}</Text>
                </View>

                <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>ISSUE NUMBER</Text>
                        <Text style={styles.value}>{issueNumber}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>DATE</Text>
                        <Text style={styles.value}>{date}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>PLANNED DATE</Text>
                        <Text style={styles.value}>{plannedDate || '-'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>PROJECT NAME</Text>
                        <Text style={styles.value}>{projectName || '-'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>SITE LOCATION</Text>
                        <Text style={styles.value}>{siteLocation || '-'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>CONTRACTOR NAME</Text>
                        <Text style={styles.value}>{constructorName || '-'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>{isReturn ? 'RETURN PERSON' : 'ISSUE PERSON'}</Text>
                        <Text style={styles.value}>{isReturn ? returnPersonName : issuePersonName || '-'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>ISSUE REMARKS</Text>
                        <Text style={styles.value}>{remarks || '-'}</Text>
                    </View>

                    {isReturn && (
                        <>
                            <View style={[styles.infoItem, { marginTop: 4 }]}>
                                <Text style={styles.label}>REJECTED / DAMAGE QTY</Text>
                                <Text style={[styles.value, { color: '#ef4444' }]}>{rejectedDamageQty || 0}</Text>
                            </View>
                            <View style={[styles.infoItem, { width: '75%', marginTop: 4 }]}>
                                <Text style={styles.label}>DAMAGE REMARK</Text>
                                <Text style={styles.value}>{damageRemark || '-'}</Text>
                            </View>
                        </>
                    )}
                </View>

                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.colSr}>#</Text>
                        <View style={[styles.colMain, !isReturn ? { width: '45%' } : {}]}>
                            <Text>MATERIAL / PRODUCT</Text>
                        </View>
                        <Text style={[styles.colQty, isReturn ? { width: '12%' } : {}]}>ISSUE QTY</Text>
                        {isReturn && <Text style={styles.colReturnQty}>RETURN QTY</Text>}
                        <Text style={styles.colUom}>UOM</Text>
                        <Text style={styles.colRemark}>ISSUE REMARK</Text>
                    </View>

                    {products.map((p, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={styles.colSr}>{i + 1}</Text>
                            <View style={[styles.colMain, !isReturn ? { width: '45%' } : {}]}>
                                <Text style={{ fontFamily: 'Helvetica-Bold' }}>{p.productName}</Text>
                                <Text style={styles.specText}>Group: {p.groupHead}</Text>
                            </View>
                            <Text style={[styles.colQty, isReturn ? { width: '12%' } : {}]}>{p.quantity}</Text>
                            {isReturn && <Text style={styles.colReturnQty}>{rejectedDamageQty || 0}</Text>}
                            <Text style={styles.colUom}>{p.uom}</Text>
                            <Text style={styles.colRemark}>{remarks || '-'}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.signatureSection}>
                    <View style={styles.signatureBox}>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureLabel}>Store incharge</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureName}>{constructorName}</Text>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureLabel}>contractor</Text>
                    </View>
                </View>

                <Text style={styles.footer}>
                    This is a computer generated slip created by botivate.in. Transaction ID: {issueNumber}
                </Text>
            </Page>

            {/* Page 2: Duplicate Copy */}
            <Page size="A4" orientation="landscape" style={styles.page}>
                <View style={{ position: 'absolute', top: 16, right: 24 }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#94a3b8' }}>DUPLICATE COPY</Text>
                </View>

                {logo ? (
                    <View style={styles.logoContainer}>
                        <Image src={logo} style={styles.logo} />
                    </View>
                ) : null}

                <View style={styles.header}>
                    <Text style={styles.title}>{isReturn ? 'STORE RETURN SLIP' : 'STORE ISSUE SLIP'}</Text>
                    <Text style={styles.subtitle}>{isReturn ? 'Material Return Confirmation' : 'Material Issue Note'}</Text>
                </View>

                <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>ISSUE NUMBER</Text>
                        <Text style={styles.value}>{issueNumber}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>DATE</Text>
                        <Text style={styles.value}>{date}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>PLANNED DATE</Text>
                        <Text style={styles.value}>{plannedDate || '-'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>PROJECT NAME</Text>
                        <Text style={styles.value}>{projectName || '-'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>SITE LOCATION</Text>
                        <Text style={styles.value}>{siteLocation || '-'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>CONTRACTOR NAME</Text>
                        <Text style={styles.value}>{constructorName || '-'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>{isReturn ? 'RETURN PERSON' : 'ISSUE PERSON'}</Text>
                        <Text style={styles.value}>{isReturn ? returnPersonName : issuePersonName || '-'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>ISSUE REMARKS</Text>
                        <Text style={styles.value}>{remarks || '-'}</Text>
                    </View>
                    
                    {isReturn && (
                        <>
                            <View style={[styles.infoItem, { marginTop: 4 }]}>
                                <Text style={styles.label}>REJECTED / DAMAGE QTY</Text>
                                <Text style={[styles.value, { color: '#ef4444' }]}>{rejectedDamageQty || 0}</Text>
                            </View>
                            <View style={[styles.infoItem, { width: '75%', marginTop: 4 }]}>
                                <Text style={styles.label}>DAMAGE REMARK</Text>
                                <Text style={styles.value}>{damageRemark || '-'}</Text>
                            </View>
                        </>
                    )}
                </View>

                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.colSr}>#</Text>
                        <View style={[styles.colMain, !isReturn ? { width: '45%' } : {}]}>
                            <Text>MATERIAL / PRODUCT</Text>
                        </View>
                        <Text style={[styles.colQty, isReturn ? { width: '12%' } : {}]}>ISSUE QTY</Text>
                        {isReturn && <Text style={styles.colReturnQty}>RETURN QTY</Text>}
                        <Text style={styles.colUom}>UOM</Text>
                        <Text style={styles.colRemark}>ISSUE REMARK</Text>
                    </View>

                    {products.map((p, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={styles.colSr}>{i + 1}</Text>
                            <View style={[styles.colMain, !isReturn ? { width: '45%' } : {}]}>
                                <Text style={{ fontFamily: 'Helvetica-Bold' }}>{p.productName}</Text>
                                <Text style={styles.specText}>Group: {p.groupHead}</Text>
                            </View>
                            <Text style={[styles.colQty, isReturn ? { width: '12%' } : {}]}>{p.quantity}</Text>
                            {isReturn && <Text style={styles.colReturnQty}>{rejectedDamageQty || 0}</Text>}
                            <Text style={styles.colUom}>{p.uom}</Text>
                            <Text style={styles.colRemark}>{remarks || '-'}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.signatureSection}>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureName}>{issuePersonName || ' '}</Text>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureLabel}>Store incharge</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureName}>{constructorName}</Text>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureLabel}>contractor</Text>
                    </View>
                </View>

                <Text style={styles.footer}>
                    This is a computer generated slip created by botivate.in. Transaction ID: {issueNumber}
                </Text>
            </Page>
        </Document>
    );
};

export default IssuePdf;

