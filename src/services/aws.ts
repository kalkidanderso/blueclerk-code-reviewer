import AWS from 'aws-sdk'

function sendEmail(options: any) {

  const { AWS_SES_ACCESSKEYID, AWS_SES_SECRETACCESSKEY, APP_EMAIL_NOREPLY} = process.env

  AWS.config.update({
    region: 'us-east-1',
    accessKeyId: AWS_SES_ACCESSKEYID,
    secretAccessKey: AWS_SES_SECRETACCESSKEY,
  })

  const ses = new AWS.SES({ apiVersion: '2012-10-17' })

  return new Promise((resolve, reject) => {
    ses.sendEmail(
      {
        Source: APP_EMAIL_NOREPLY,
        Destination: {
          CcAddresses: [],
          ToAddresses: [options.to],
        },
        Message: {
          Subject: {
            Data: "Email Confirmation from Blueclerk.com",
          },
          Body: {
            Html: {
              Data: "Welcome to Blueclerk.com! Please click on the link to confirm your email https://blueclerk.com",
            },
          },
        },
        ReplyToAddresses: [APP_EMAIL_NOREPLY],
      },
      (err, info) => {
        if (err) {
          reject(err)
        } else {
          resolve(info)
        }
      },
    )
  })
}

export default sendEmail