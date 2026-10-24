// pdfmake usa este fork de pdfkit; tiene la misma API que pdfkit, cuyos tipos se reutilizan.
declare module '@foliojs-fork/pdfkit' {
  import PDFDocument from 'pdfkit';
  export default PDFDocument;
}
