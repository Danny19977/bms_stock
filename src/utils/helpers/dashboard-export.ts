import { utils, writeFile } from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable, { type CellInput } from 'jspdf-autotable';

export interface ExportColumn<T> {
  key: string;
  label: string;
  section: 'entry' | 'exit';
  value: (row: T, index: number) => string | number;
}

export const exportDashboard = <T>(
  type: 'excel' | 'pdf',
  filename: string,
  rows: T[],
  columns: ExportColumn<T>[]
) => {
  const headers = columns.map((column) => column.label);
  const body = rows.map((row, index) => columns.map((column) => column.value(row, index)));

  if (type === 'excel') {
    const worksheet = utils.aoa_to_sheet([headers, ...body]);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Dashboard');
    writeFile(workbook, `${filename}.xlsx`);
    return;
  }

  const document = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const entryCount = columns.filter((column) => column.section === 'entry').length;
  const exitCount = columns.filter((column) => column.section === 'exit').length;
  const sectionHeaders: CellInput[] = [];
  if (entryCount > 0) {
    sectionHeaders.push({ content: 'ENTRÉE', colSpan: entryCount, styles: { fillColor: [219, 234, 254], textColor: [30, 64, 175], halign: 'center' as const } });
  }
  if (exitCount > 0) {
    sectionHeaders.push({ content: 'SORTIE', colSpan: exitCount, styles: { fillColor: [255, 237, 213], textColor: [154, 52, 18], halign: 'center' as const } });
  }
  autoTable(document, {
    head: [sectionHeaders, headers],
    body,
    styles: { fontSize: 7, cellPadding: 3 },
    headStyles: { fillColor: [30, 64, 175] },
    margin: 24
  });
  document.save(`${filename}.pdf`);
};
