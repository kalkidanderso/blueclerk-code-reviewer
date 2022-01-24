export const stripeConfig = {
    sk_public: 'pk_test_ssvXODIoNa7PazwiAEvo9eEj',
    sk_secret: 'sk_test_JN6M4ogha1KGoxkwNq16vGe9'
}
export const qbConfig = {
    qb_client_id: 'ABpcfFS7x9n3cNJQ3eojqsD0hzHV4wFbF9bHyYHzq8G6vC5b2Z',
    qb_client_secret: 'W9RXt15hXNzcryKKkHmMxKBCGlRVBMyRJK5V1nO9',
    qb_environment: 'sandbox',
    // Fallback production URL
    // qb_redirect_uri: 'https://app.blueclerk.com/main/admin/integrations/callback'

    // Fallback staging URL
    qb_redirect_uri: 'https://blueclerk-frontend-react.deploy.blueclerk.com/main/admin/integrations/callback'
}
export const privateKey = {
    key: 'KwXkxQQuBzDnZzbt0B3CeDQurnED00kXsu30X3'
}
// export const INVOICE_FONT_PATH = 's3://blueclerk-files';
export const INVOICE_FONT_PATH = 'assets/fonts';
export const INVOICE_IMAGE_PATH = 'tmp/images';
export const INVOICE_PDF_PATH = 'tmp/invoices';
