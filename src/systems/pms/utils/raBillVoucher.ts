import { getRMBills } from '@/systems/pms/utils/storageManager';

/**
 * RA Bill voucher in the Water Resources Dept. format
 * (Front Cover -> Account II measurement abstract -> III Memorandum of Payments).
 * Shared by Department Billing and Sub Contractor Billing.
 */

const esc = (v: any) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inr = (n: number, d = 2) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
const qty = (n: number) =>
  Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const fmtDate = (d?: string) => {
  if (!d) return '';
  const x = new Date(d);
  return isNaN(x.getTime()) ? String(d) : x.toLocaleDateString('en-GB');
};

export interface RaVoucherInput {
  bill: any;
  items: any[];
  totalAmount: number;
  billNo?: string;
  billDate?: string;
  isSubContractor?: boolean;
  partyName?: string;
  poNumber?: string;
}

export function openRaBillVoucher(input: RaVoucherInput): boolean {
  const { bill, items, isSubContractor } = input;
  const billNo = input.billNo || bill.billNo || bill.rmNo || '';
  const billDate = input.billDate || bill.billDate || '';
  const party = input.partyName || (isSubContractor ? bill.subContractorName : '') || bill.contractorName || '';
  const poNo = input.poNumber || bill.poNumber || '';
  const workName = `${bill.projectName || ''}${bill.minorName ? ` (${bill.minorName})` : ''}`;

  // Previous bills of the same project / same party (same bill kind)
  const prevBills = getRMBills()
    .filter(b =>
      b.id !== bill.id &&
      b.status === 'billed' &&
      b.projectNo === bill.projectNo &&
      (b.subContractorName || b.contractorName || '') === (bill.subContractorName || bill.contractorName || '') &&
      (!!b.subContractorName || b.rateMode === 'PO') === !!isSubContractor &&
      String(b.billDate || '') <= String(billDate || '9999')
    )
    .sort((a, b) => String(a.billDate || '').localeCompare(String(b.billDate || '')));
  const lastBill = prevBills[prevBills.length - 1];
  const prevPaid = prevBills.reduce((s, b) => s + Number(b.billAmount || 0), 0);
  const prevQty = (desc: string) =>
    prevBills.reduce(
      (s, b) =>
        s + (b.itemBreakdown || [])
          .filter((i: any) => i.description === desc)
          .reduce((q: number, i: any) => q + Number(i.quantity || 0), 0),
      0
    );

  const rows = items.map((e: any) => {
    const prev = prevQty(e.description);
    const since = Number(e.quantity || 0);
    const upto = prev + since;
    const rate = Number(e.rate || 0);
    return { e, prev, since, upto, rate, amtUpto: Math.round(rate * upto), amtNow: Math.round(rate * since) };
  });
  const totalUpto = rows.reduce((s, r) => s + r.amtUpto, 0);
  const totalNow = rows.reduce((s, r) => s + r.amtNow, 0) || Number(input.totalAmount || 0);
  const balance = totalUpto - 0;
  const payNow = balance - prevPaid;

  const w = window.open('', '_blank');
  if (!w) return false;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Running Account Bill - ${esc(billNo)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: "Times New Roman", serif; font-size: 12px; color: #000; margin: 0; }
  .page { page-break-after: always; padding: 4px 6px; min-height: 255mm; position: relative; }
  .page:last-child { page-break-after: auto; }
  .c { text-align: center; } .r { text-align: right; } .b { font-weight: bold; }
  .top { display: flex; justify-content: space-between; font-size: 11px; }
  h1 { text-align: center; font-size: 19px; letter-spacing: 1px; margin: 18px 0 14px; text-decoration: underline; }
  h2 { text-align: center; font-size: 14px; margin: 6px 0 10px; }
  .line { display: flex; margin: 9px 0; align-items: baseline; }
  .line .k { width: 270px; flex-shrink: 0; }
  .line .v { flex: 1; border-bottom: 1px dotted #000; min-height: 14px; padding: 0 4px; font-weight: bold; }
  .alloc { float: left; width: 200px; border: 1px solid #000; margin-right: 18px; font-size: 11px; }
  .alloc div { padding: 3px 6px; border-bottom: 1px solid #000; min-height: 14px; } .alloc div:last-child { border-bottom: 0; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 4px 5px; vertical-align: top; }
  th { text-align: center; font-size: 11px; }
  td.n { text-align: right; white-space: nowrap; }
  .sub td { font-weight: bold; background: #f2f2f2; }
  .foot { display: flex; justify-content: space-between; margin-top: 46px; font-size: 11px; text-align: center; }
  .foot div { flex: 1; }
  .box { border: 1px solid #000; padding: 6px 8px; margin-top: 14px; }
  .mp td { border: 0; padding: 5px 4px; } .mp td.n { border-bottom: 1px dotted #000; width: 120px; }
</style></head><body>

<!-- ============ FRONT COVER ============ -->
<div class="page">
  <div class="top"><span>B &amp; C</span><span>${isSubContractor ? 'Sub Contractor' : 'Department'}</span><span>I. &amp; P.D.</span></div>
  <div class="line"><span class="k">Division -</span><span class="v">Water Resources Department</span></div>
  <div class="line"><span class="k">Sub - Division -</span><span class="v">${esc(bill.projectName || '')}</span></div>
  <h1>RUNNING ACCOUNT BILL</h1>
  <div class="line"><span class="k">Cash Book Voucher No.</span><span class="v">${esc(billNo)}</span></div>
  <div class="line"><span class="k">for &nbsp;&nbsp;(Date)</span><span class="v">${esc(fmtDate(billDate))}</span></div>
  <div class="line"><span class="k">Name of Contractor or Supplier -</span><span class="v">${esc(party)}</span></div>
  <div style="overflow:hidden; margin-top:8px;">
    <div class="alloc">
      <div class="b c">Allocation</div>
      <div>${esc(bill.minorName || bill.projectName || '')}</div><div></div><div></div>
      <div class="b">Total Rs. ${inr(payNow, 0)}</div>
      <div>Sub Divisional Engineer</div><div></div>
    </div>
    <div style="overflow:hidden">
      <div class="line"><span class="k" style="width:190px">Name of work -</span><span class="v">${esc(workName)}</span></div>
      <div class="line"><span class="k" style="width:190px">Purpose of Supply -</span><span class="v"></span></div>
      <div class="line"><span class="k" style="width:190px">${isSubContractor ? 'PO / Agreement No.' : 'Agreement No.'} -</span><span class="v">${esc(poNo)}</span></div>
      <div class="line"><span class="k" style="width:190px">Contractor's Ledger Folio No. -</span><span class="v"></span></div>
      <div class="line"><span class="k" style="width:190px">Serial No. of this bill -</span><span class="v">${esc(billNo)}</span></div>
      <div class="line"><span class="k" style="width:190px">No. and date of last bill for this work -</span><span class="v">${lastBill ? esc(`${lastBill.billNo || lastBill.rmNo} / ${fmtDate(lastBill.billDate)}`) : 'Nil (First Bill)'}</span></div>
    </div>
  </div>
  <div class="line" style="margin-top:22px"><span class="k">Accepted by the ………………………………</span><span class="v" style="border:0;text-align:right">Competent Authority</span></div>
  <div class="line"><span class="k">Date of written order to commence work -</span><span class="v"></span></div>
  <div class="line"><span class="k">Date of completion as stipulated in contract -</span><span class="v"></span></div>
  <div class="line"><span class="k">Extension granted upto -</span><span class="v"></span></div>
  <div class="line"><span class="k">Date of actual completion of work -</span><span class="v"></span></div>
  <div class="box" style="margin-top:34px">
    <div class="c b" style="margin-bottom:8px">(For use in Divisional Office)</div>
    <div style="display:flex;justify-content:space-between;margin-top:36px"><span>Checked<br><br>Accounts Clerk</span><span>Divisional Accountant</span><span>Audited<br><br>Auditor</span></div>
    <div class="r" style="margin-top:6px">Superintendent / Gazetted Officer</div>
  </div>
</div>

<!-- ============ ACCOUNT II : MEASUREMENT ABSTRACT ============ -->
<div class="page">
  <h2>II - Account of Work Done (Abstract of Measurements)</h2>
  <div style="margin-bottom:6px"><b>Work:</b> ${esc(workName)} &nbsp;&nbsp; <b>Contractor:</b> ${esc(party)} &nbsp;&nbsp; <b>Bill No.:</b> ${esc(billNo)}</div>
  <table>
    <thead>
      <tr><th colspan="3">Quantity</th><th rowspan="2" style="width:30px">Sr</th><th rowspan="2">Item Description</th><th rowspan="2">Rate (Rs)</th><th rowspan="2">Unit</th><th colspan="2">Amount (Rs)</th><th rowspan="2">Remarks</th></tr>
      <tr><th>Previously</th><th>Since previously</th><th>Upto date</th><th>Upto date</th><th>In this bill</th></tr>
      <tr class="c">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<th style="font-weight:normal">${n}</th>`).join('')}</tr>
    </thead>
    <tbody>
      <tr class="sub"><td colspan="10">${isSubContractor ? 'WORK DONE AS PER PURCHASE ORDER' : 'WORK DONE AS PER SCHEDULE - B'}</td></tr>
      ${rows.map((r, i) => `<tr>
        <td class="n">${qty(r.prev)}</td><td class="n">${qty(r.since)}</td><td class="n">${qty(r.upto)}</td>
        <td class="c">${i + 1}</td><td>${esc(r.e.description)}</td>
        <td class="n">${inr(r.rate)}</td><td class="c">${esc(r.e.unit)}</td>
        <td class="n">${inr(r.amtUpto, 0)}</td><td class="n">${inr(r.amtNow, 0)}</td><td></td></tr>`).join('')}
      <tr class="sub"><td colspan="7" class="r">TOTAL</td><td class="n">${inr(totalUpto, 0)}</td><td class="n">${inr(totalNow, 0)}</td><td></td></tr>
    </tbody>
  </table>
  <div class="foot"><div>Contractor</div><div>Sectional Engineer</div><div>Sub-Divisional Officer</div><div>Executive Engineer</div></div>
</div>

<!-- ============ III : MEMORANDUM OF PAYMENTS ============ -->
<div class="page">
  <h2>III - Memorandum of Payments</h2>
  <table class="mp">
    <tr><td>1. Total value of work done as per Account II, column 8, entry (A)</td><td class="n">Rs. ${inr(totalUpto)}</td></tr>
    <tr><td>2. Deduct amount withheld (a) from previous bill as per last Running Account Bill &nbsp; (b) from this bill</td><td class="n">Rs. ${inr(0)}</td></tr>
    <tr><td>3. Balance upto date payments (Item 1 - 2)</td><td class="n">Rs. ${inr(balance)}</td></tr>
    <tr><td>4. Total amount of payments already made as per entry of last Running Bill No. ${lastBill ? esc(lastBill.billNo || lastBill.rmNo) : '—'}</td><td class="n">Rs. ${inr(prevPaid)}</td></tr>
    <tr><td class="b">5. Payment now to be made</td><td class="n b">Rs. ${inr(payNow)}</td></tr>
    <tr><td style="padding-left:24px">a) By recovery of amount creditable to this work (value of stock supplied)</td><td class="n">Rs. ${inr(0)}</td></tr>
    <tr><td style="padding-left:24px">b) By recovery of amount creditable to other works / heads of account</td><td class="n">Rs. ${inr(0)}</td></tr>
    <tr><td style="padding-left:24px">c) By cheque</td><td class="n b">Rs. ${inr(payNow)}</td></tr>
  </table>
  <div class="box">Pay Rs. <b>${inr(payNow)}</b> by cheque &nbsp;&nbsp;&nbsp; (Dated Initials of Disbursing Officer) ____________</div>
  <div class="box" style="margin-top:10px">
    Received Rs. ( ${inr(payNow)} ) on account of this work &nbsp; Dated ____ 20___
    <div style="display:flex;justify-content:space-between;margin-top:42px"><span>Witness</span><span>Stamp</span><span>Full Signature of the Contractor</span></div>
  </div>
  <div class="box" style="margin-top:10px">Paid by me vide cheque no. ____________ Dated ________
    <div class="r" style="margin-top:28px">Cashier &nbsp;&nbsp; (Dated Initials of Person making the payment)</div></div>
  <h2 style="margin-top:22px">IV - Remarks</h2>
  <div class="box" style="min-height:90px">(This space is reserved for any remarks the Disbursing Officer or Executive Engineer may wish to record in respect of the execution of the work or measurement of the same.)</div>
  <div class="foot"><div>Clerk</div><div>Accountant</div></div>
</div>

</body></html>`;

  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
  return true;
}
