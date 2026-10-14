import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

/**
 * Browser-direct upload route for research PDFs. The UploadThing token stays
 * in the Next.js server environment; clients only receive scoped upload URLs.
 */
export const uploadRouter = {
  paperPdf: f({
    pdf: {
      maxFileSize: "32MB",
      maxFileCount: 1,
    },
  }).onUploadComplete(async ({ file }) => ({
    key: file.key,
    url: file.ufsUrl,
  })),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
