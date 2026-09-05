// Updated: 2026-08-31
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import daftariImg from '@/assets/daftari2.png';
import poojaLogoImg from '@/assets/logo.png';

const styles = StyleSheet.create({
    page: {
        padding: 14,
        fontFamily: 'Helvetica',
        fontSize: 8,
        color: '#333',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    slipColumn: {
        width: '48.8%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
    },
    divider: {
        width: 1,
        height: '100%',
        borderRight: '1 dashed #cbd5e1',
    },
    topHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 3,
    },
    daftariLogoContainer: {
        width: '35%',
        alignItems: 'flex-start',
    },
    daftariLogo: {
        width: 60,
        height: 38,
        objectFit: 'contain',
    },
    centerCopyContainer: {
        width: '30%',
        alignItems: 'center',
    },
    copyLabel: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        color: '#94a3b8',
        textTransform: 'uppercase',
    },
    logoContainer: {
        width: '35%',
        alignItems: 'flex-end',
    },
    logo: {
        width: 90,
        height: 38,
        objectFit: 'contain',
    },
    header: {
        marginBottom: 6,
        borderBottom: '1.5 solid #4f46e5',
        paddingBottom: 3,
        alignItems: 'center',
    },
    title: {
        fontSize: 12.5,
        fontFamily: 'Helvetica-Bold',
        color: '#4f46e5',
        textAlign: 'center',
        marginBottom: 1,
    },
    subtitle: {
        fontSize: 6.5,
        textAlign: 'center',
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 6,
        backgroundColor: '#f8fafc',
        padding: 5,
        borderRadius: 4,
    },
    infoItem: {
        width: '50%',
        marginBottom: 3,
    },
    infoItemFull: {
        width: '100%',
        marginTop: 1,
        marginBottom: 2,
    },
    label: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 6.5,
        color: '#64748b',
        marginBottom: 1,
    },
    value: {
        fontSize: 7.5,
        color: '#1e293b',
    },
    table: {
        marginTop: 3,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#4f46e5',
        color: '#ffffff',
        padding: 4,
        fontFamily: 'Helvetica-Bold',
        fontSize: 7,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottom: '0.5 solid #e2e8f0',
        padding: 3.5,
        alignItems: 'center',
    },
    colSr: { width: '6%', textAlign: 'center' },
    colMain: { width: '38%' },
    colQty: { width: '13%', textAlign: 'center' },
    colUom: { width: '10%' },
    colReturnQty: { width: '13%', textAlign: 'center' },
    colRemark: { width: '33%' },
    specText: {
        fontSize: 6,
        color: '#64748b',
        marginTop: 1,
    },
    bodyContent: {
        flex: 1,
    },
    bottomSection: {
        marginTop: 'auto',
        paddingTop: 8,
    },
    signatureSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        marginBottom: 6,
    },
    signatureBox: {
        alignItems: 'center',
        width: '42%',
    },
    signatureLine: {
        width: '100%',
        borderTop: '0.75 solid #333',
        marginBottom: 3,
    },
    signatureLabel: {
        fontSize: 7.5,
        fontFamily: 'Helvetica-Bold',
        color: '#1e293b',
    },
    signatureName: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 1,
        color: '#1e293b',
    },
    footer: {
        borderTop: '0.5 solid #e2e8f0',
        paddingTop: 3,
        textAlign: 'center',
        fontSize: 6,
        color: '#94a3b8',
    },
});

export interface Product {
    productName: string;
    groupHead: string;
    quantity: number;
    uom: string;
    remarks?: string;
    rejectedDamageQty?: number;
}

export interface IssuePdfGroupProps {
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
    pageNumber?: number;
    totalPages?: number;
    startSr?: number;
}

export interface IssuePdfProps extends Partial<IssuePdfGroupProps> {
    pages?: IssuePdfGroupProps[];
}

const SlipPanel = ({
    copyTitle,
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
    products = [],
    logo,
    pageNumber,
    totalPages,
    startSr = 1,
}: IssuePdfGroupProps & { copyTitle: string }) => {
    const isReturn = type === 'return';
    const isCompact = (products?.length || 0) > 4;

    return (
        <View style={styles.slipColumn}>
            {/* Top Logos Row: Daftari on Left, Copy Label in Center, Pooja on Right */}
            <View style={styles.topHeaderRow}>
                <View style={styles.daftariLogoContainer}>
                    <Image src={daftariImg} style={styles.daftariLogo} />
                </View>
                <View style={styles.centerCopyContainer}>
                    <Text style={styles.copyLabel}>
                        {copyTitle}{totalPages && totalPages > 1 ? ` (${pageNumber}/${totalPages})` : ''}
                    </Text>
                </View>
                <View style={styles.logoContainer}>
                    <Image src={logo || poojaLogoImg} style={styles.logo} />
                </View>
            </View>

            <View style={[styles.header, isCompact ? { marginBottom: 3, paddingBottom: 2 } : {}]}>
                <Text style={[styles.title, isCompact ? { fontSize: 11, marginBottom: 0.5 } : {}]}>
                    {isReturn ? 'STORE RETURN SLIP' : 'STORE ISSUE SLIP'}
                </Text>
                <Text style={styles.subtitle}>
                    {isReturn ? 'Material Return Confirmation' : 'Material Issue Note'}
                    {totalPages && totalPages > 1 ? ` • PAGE ${pageNumber} OF ${totalPages}` : ''}
                </Text>
            </View>

            <View style={styles.bodyContent}>
                <View style={[styles.infoGrid, isCompact ? { padding: 3.5, marginBottom: 3 } : {}]}>
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
                            <View style={[styles.infoItem, { marginTop: 2 }]}>
                                <Text style={styles.label}>REJECTED / DAMAGE QTY</Text>
                                <Text style={[styles.value, { color: '#ef4444' }]}>{rejectedDamageQty || 0}</Text>
                            </View>
                            <View style={[styles.infoItemFull, { marginTop: 2 }]}>
                                <Text style={styles.label}>DAMAGE REMARK</Text>
                                <Text style={styles.value}>{damageRemark || '-'}</Text>
                            </View>
                        </>
                    )}
                </View>

                <View style={styles.table}>
                    <View style={[styles.tableHeader, isCompact ? { padding: 3 } : {}]}>
                        <Text style={styles.colSr}>#</Text>
                        <View style={[styles.colMain, !isReturn ? { width: '45%' } : {}]}>
                            <Text>MATERIAL / PRODUCT</Text>
                        </View>
                        <Text style={[styles.colQty, isReturn ? { width: '13%' } : {}]}>ISSUE QTY</Text>
                        {isReturn && <Text style={styles.colReturnQty}>RETURN QTY</Text>}
                        <Text style={styles.colUom}>UOM</Text>
                        <Text style={styles.colRemark}>ISSUE REMARK</Text>
                    </View>

                    {products.map((p, i) => (
                        <View key={i} style={[styles.tableRow, isCompact ? { padding: 2.5 } : {}]}>
                            <Text style={styles.colSr}>{(startSr || 1) + i}</Text>
                            <View style={[styles.colMain, !isReturn ? { width: '45%' } : {}]}>
                                <Text style={{ fontFamily: 'Helvetica-Bold' }}>{p.productName}</Text>
                                <Text style={styles.specText}>Group: {p.groupHead}</Text>
                            </View>
                            <Text style={[styles.colQty, isReturn ? { width: '13%' } : {}]}>{p.quantity}</Text>
                            {isReturn && <Text style={styles.colReturnQty}>{p.rejectedDamageQty ?? (rejectedDamageQty || 0)}</Text>}
                            <Text style={styles.colUom}>{p.uom}</Text>
                            <Text style={styles.colRemark}>{p.remarks || remarks || '-'}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View style={[styles.bottomSection, isCompact ? { paddingTop: 4 } : {}]}>
                <View style={[styles.signatureSection, isCompact ? { marginBottom: 3 } : {}]}>
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
                    Generated by botivate.in | Transaction ID: {issueNumber}{totalPages && totalPages > 1 ? ` | Page ${pageNumber} of ${totalPages}` : ''}
                </Text>
            </View>
        </View>
    );
};

const IssuePdf = (props: IssuePdfProps) => {
    const pages: IssuePdfGroupProps[] = props.pages && props.pages.length > 0
        ? props.pages
        : [(props as IssuePdfGroupProps)];

    return (
        <Document>
            {pages.map((groupProps, index) => (
                <Page key={index} size="A4" orientation="landscape" style={styles.page}>
                    {/* Left Slip: Original Copy */}
                    <SlipPanel {...groupProps} copyTitle="ORIGINAL COPY" />

                    {/* Center Divider / Perforation Line */}
                    <View style={styles.divider} />

                    {/* Right Slip: Duplicate Copy */}
                    <SlipPanel {...groupProps} copyTitle="DUPLICATE COPY" />
                </Page>
            ))}
        </Document>
    );
};

export default IssuePdf;

