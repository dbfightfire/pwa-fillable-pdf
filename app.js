
// No-code friendly place to change your form: add/edit fields here.
// type can be: "text", "email", "checkbox", or "textarea"
const FIELDS = [
  { id: "name", label: "Name", type: "text", pdfField: "Name", width: 300 },
  { id: "email", label: "Email", type: "text", pdfField: "Email", width: 300 },
  { id: "agree", label: "Agree", type: "checkbox", pdfField: "Agree", size: 18 },
  { id: "notes", label: "Notes", type: "textarea", pdfField: "Notes", width: 420, height: 80 },
];

// Basic layout for where fields go on the PDF (x/y in points from bottom-left)
const LAYOUT = {
  pageSize: [612, 792], // US Letter portrait
  marginLeft: 50,
  startY: 700,
  lineGap: 28
};

// Helper: download a Blob as a file
function downloadBlob(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 2500);
}

// Build an empty FILLABLE PDF with fields
async function buildEmptyFillable() {
  const { PDFDocument, StandardFonts } = window.PDFLib;
  const pdf = await PDFDocument.create();
  const page = pdf.addPage(LAYOUT.pageSize);
  const form = pdf.getForm();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  let y = LAYOUT.startY;

  for (const field of FIELDS) {
    // Draw label
    page.drawText(field.label + ":", {
      x: LAYOUT.marginLeft,
      y: y + 5,
      size: 12,
      font
    });

    const x = LAYOUT.marginLeft + 120;
    const width = field.width || 220;
    const height = field.height || 20;

    if (field.type === 'checkbox') {
      const box = form.createCheckBox(field.pdfField);
      box.addToPage(page, { x, y, width: field.size || 18, height: field.size || 18 });
    } else {
      const tf = form.createTextField(field.pdfField);
      tf.addToPage(page, { x, y, width, height });
      if (field.type === 'textarea') tf.enableMultiline();
    }

    y -= LAYOUT.lineGap + (field.type === 'textarea' ? 60 : 0);
  }

  const pdfBytes = await pdf.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  downloadBlob(blob, "fillable-form.pdf");
}

// Fill a PDF from the current HTML inputs
async function buildFilledFromHtml({ readOnly=false, templateBytes=null } = {}) {
  const { PDFDocument, StandardFonts } = window.PDFLib;

  let pdf, page, form;
  if (templateBytes) {
    pdf = await PDFDocument.load(templateBytes);
    form = pdf.getForm();
  } else {
    // Create simple one-page PDF with same layout and fields
    pdf = await PDFDocument.create();
    page = pdf.addPage(LAYOUT.pageSize);
    form = pdf.getForm();

    const font = await pdf.embedFont(StandardFonts.Helvetica);
    let y = LAYOUT.startY;
    for (const field of FIELDS) {
      page.drawText(field.label + ":", {
        x: LAYOUT.marginLeft,
        y: y + 5,
        size: 12,
        font
      });
      const x = LAYOUT.marginLeft + 120;
      const width = field.width || 220;
      const height = field.height || 20;
      if (field.type === 'checkbox') {
        const box = form.createCheckBox(field.pdfField);
        box.addToPage(page, { x, y, width: field.size || 18, height: field.size || 18 });
      } else {
        const tf = form.createTextField(field.pdfField);
        tf.addToPage(page, { x, y, width, height });
        if (field.type === 'textarea') tf.enableMultiline();
      }
      y -= LAYOUT.lineGap + (field.type === 'textarea' ? 60 : 0);
    }
  }

  // Put HTML values into fields
  for (const field of FIELDS) {
    const el = document.getElementById(field.id);
    const pdfFieldName = field.pdfField;
    if (!pdfFieldName) continue;

    if (field.type === 'checkbox') {
      const box = form.getCheckBox(pdfFieldName);
      if (el.checked) box.check(); else box.uncheck();
      if (readOnly) box.enableReadOnly();
    } else {
      const tf = form.getTextField(pdfFieldName);
      tf.setText(el.value || "");
      if (readOnly) tf.enableReadOnly();
    }
  }

  const pdfBytes = await pdf.save();
  downloadBlob(new Blob([pdfBytes], {type: "application/pdf"}), readOnly ? "answers-readonly.pdf" : "answers-editable.pdf");
}

// Wire up buttons
document.getElementById("btnMakeBlank")?.addEventListener("click", buildEmptyFillable);

document.getElementById("btnMakeFilled")?.addEventListener("click", async () => {
  const lock = document.getElementById("lockFields").checked;
  const fileInput = document.getElementById("templatePdf");
  const file = fileInput.files && fileInput.files[0];
  if (file) {
    const bytes = await file.arrayBuffer();
    await buildFilledFromHtml({ readOnly: lock, templateBytes: bytes });
  } else {
    await buildFilledFromHtml({ readOnly: lock });
  }
});
