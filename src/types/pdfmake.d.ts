declare module "pdfmake/build/pdfmake" {
  const pdfMake: { createPdf: (definition: any) => { download: (filename?: string) => void }; vfs: Record<string, string> };
  export default pdfMake;
}

declare module "pdfmake/build/vfs_fonts" {
  const fonts: Record<string, string>;
  export default fonts;
}
