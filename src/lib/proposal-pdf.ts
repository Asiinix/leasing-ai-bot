import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { calculationNote, proposalNote, scheduleHead, type Proposal } from "./proposal";

/** All assets are supplied locally; this renderer makes no network requests. */
export function renderProposalPdf(proposal: Proposal, font: string, logo: Uint8Array) {
  const doc = new jsPDF({ format: "a4", compress: true });
  doc.addFileToVFS("NotoSans.ttf", font);
  doc.addFont("NotoSans.ttf", "NotoSans", "normal");
  doc.setFont("NotoSans");
  doc.setProperties({ title: "Коммерческое предложение", author: "BCC Leasing" });
  const dimensions = doc.getImageProperties(logo);
  doc.addImage(logo, "PNG", 16, 14, 48, (48 * dimensions.height) / dimensions.width);
  doc.setFontSize(20);
  doc.setTextColor(24, 32, 48);
  doc.text("Коммерческое предложение", 16, 42);
  doc.setFontSize(10);
  doc.text(`BCC Leasing • ${proposal.date}`, 16, 51);
  const styles = {
    font: "NotoSans",
    fontStyle: "normal" as const,
    fontSize: 10,
    cellPadding: 3,
    overflow: "linebreak" as const,
    textColor: "#182030",
  };
  let end = 58;
  autoTable(doc, {
    startY: end,
    margin: { left: 16, right: 16, top: 16, bottom: 18 },
    body: proposal.fields,
    theme: "striped",
    styles,
    columnStyles: { 0: { cellWidth: 65 }, 1: { cellWidth: 113 } },
    alternateRowStyles: { fillColor: "#f0f5fb" },
    didDrawPage: (data) => {
      end = data.cursor?.y ?? end;
    },
  });
  autoTable(doc, {
    startY: end + 6,
    margin: { left: 16, right: 16, top: 16, bottom: 18 },
    body: [[calculationNote], [proposalNote]],
    theme: "plain",
    styles: { ...styles, fontSize: 9 },
  });
  doc.addPage();
  doc.setFontSize(16);
  doc.text("График платежей", 16, 23);
  autoTable(doc, {
    startY: 30,
    margin: { left: 16, right: 16, top: 16, bottom: 18 },
    head: [scheduleHead],
    body: proposal.schedule,
    styles: { ...styles, fontSize: 8, halign: "right" },
    headStyles: { fillColor: "#326ec3", textColor: "#ffffff", fontStyle: "normal" },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 40 },
      2: { cellWidth: 40 },
      3: { cellWidth: 40 },
      4: { cellWidth: 40 },
    },
    rowPageBreak: "avoid",
    showHead: "everyPage",
    alternateRowStyles: { fillColor: "#f0f5fb" },
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text(`BCC Leasing • ${page} / ${pages}`, 194, 287, { align: "right" });
  }
  return doc.output("blob");
}
