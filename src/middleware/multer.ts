import multer from 'multer'

export const uploadInvoices = multer({ dest: 'tmp/invoices' });
