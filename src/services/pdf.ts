import moment from 'moment';

import { INVOICE_IMAGE_PATH } from '../common/config';
import { IJobReport } from 'src/models/JobReport';
import { downloadFileToPath } from '../controllers/invoice';

// Partial method to generate the PDF content of A/R Report
export const handleJobReportPdf = async (jobReport : IJobReport) : Promise<any> => {
    const blueclerkLogo = 'assets/images/logo_blue.png'
    const separator : any = {
        text: '_______________________________________________________________________________________________\n\n',
        style: 'separatorStyle'
    };
    const generateField = (label : string, value : string, width : string) => ({
        stack: [{
            text: '\n' + label,
            style: 'fieldLabel'
        }, {
            text: value || 'N/A',
            style: 'boldGrey'
        }],
        width: width,
    });
    // Handle company logo download
    let companyLogoFilePath = '';
    // Construct default Company Logo image
    let companyImage: any = {
        text: '',
        fillColor: '#cccccc',
        width: '5%',
    }
    if (jobReport.job.company?.info?.logoUrl) {
        // Check and download Company Logo to /tmp file
        companyLogoFilePath = await downloadFileToPath(jobReport.job.company, jobReport.job.company.info.logoUrl, '/' + INVOICE_IMAGE_PATH, true);
        companyImage = {
            image: 'companyLogo',
            width: 35,
        }
    }
    const technicianNotes = jobReport.job?.tasks?.length ?  jobReport.job.tasks.filter((task: any) => task.comment).map((task: any) => {
        return task.comment;
    }) : [];
    const technicianImages = jobReport.job?.technicianImages?.length 
        ? await Promise.all(jobReport.job.technicianImages.map(async(image : any) => {
            if(image.imageUrl) {
                const path = await downloadFileToPath(jobReport.job.company, image.imageUrl, '/' + INVOICE_IMAGE_PATH, true);
                return {
                    width: '50%',
                    stack: [{
                        border: [true, true, true, true],
                        maxWidth: 250,
                        image: path,
                        align: 'center',
                    },],
                };
            }
        })) : [];

    // ===================================
    // ===[ INITIALIZE PDF TEMPLATE ]=====
    // ===================================
    const docDefinition : any = {
        content: [{
                stack: [{
                    columns: [{
                            width: '10%',
                            stack: [{
                                    text: '\n\n'
                                },
                                {
                                    ...companyImage
                                },
                            ],
                        },
                        {
                            stack: [{
                                    text: (jobReport.job?.company.info?.companyName || 'N/A') + '\n',
                                    style: 'header',
                                },
                                {
                                    text: (jobReport.job.company?.address?.street || 'N/A') + ',\n' +
                                        (jobReport.job.company?.address?.city || 'N/A') + ', ' +
                                        (jobReport.job.company?.address?.state || 'N/A') + ', ' +
                                        (jobReport.job.company?.address?.zipCode || 'N/A') + '\n' +
                                        (jobReport.job.company?.contact?.phone || 'N/A') + '\n' +
                                        (jobReport.job.company?.info?.companyEmail || 'N/A') + '\n',
                                    style: 'boldGrey',
                                }
                            ]
                        },
                        {
                            stack: [{
                                text: jobReport.job.jobId || 'N/A',
                                style: 'jobLabel'
                            }, {
                                text: '\nJOB DATE',
                                style: 'fieldLabelRight'
                            }, {
                                text: moment(jobReport.job?.scheduleDate).format('MMM. DD, YYYY') || 'N/A',
                                style: 'boldGreyRight'
                            }]
                        }
                    ]
                }, ],
            }, {
                ...separator,
            }, {
                stack: [{
                    columns: [{
                        text: 'CUSTOMER INFORMATION',
                        style: 'subTitle',
                    }, ]
                }, {
                    columns: [{ 
                        ...generateField('NAME', jobReport.job.customer?.profile?.name, '25%')
                    }, {
                        ...generateField('ADDRESS', 
                            (jobReport.job.customer?.address?.street ? jobReport.job.customer?.address?.street + ',\n' : '') +
                            (jobReport.job.customer?.address?.city ? jobReport.job.customer?.address?.city + ' ' : '') +
                            (jobReport.job.customer?.address?.state ? jobReport.job.customer?.address?.state + ' ' : '') +
                            (jobReport.job.customer?.address?.zipCode ? jobReport.job.customer?.address?.zipCode + ' ' : ''), 
                            '25%')
                    }, {
                        ...generateField('PHONE NUMBER', jobReport.job.customer?.contact?.phone, '25%')
                    }, {
                        ...generateField('EMAIL', jobReport.job.customer?.info?.email, '25%')
                    }, ],
                }, ],
            }, {
                ...separator,
            }, {
                stack: [{
                        columns: [{
                            text: 'JOB DETAILS',
                            style: 'subTitle',
                        }, ]
                    }, {
                        columns: [{
                            ...generateField('SUBDIVISION', jobReport.job.jobLocation?.name, '25%')
                        }, {
                            stack: [{
                                text: '\nHOUSE STATUS',
                                style: 'fieldLabel'
                            }, {
                                text: jobReport.job.isHomeOccupied ? 'Occupied' : 'Not occuppied',
                                style: jobReport.job.isHomeOccupied ? 'boldGreen' : 'boldGrey'
                            }],
                            width: '25%',
                        }, {
                            ...generateField('START', moment(jobReport.job?.startTime).format('MMM. DD, YYYY HH:mm'), '25%')
                        }, {
                            ...generateField('END', moment(jobReport.job?.endTime).format('MMM. DD, YYYY HH:mm'), '25%')
                        }, ],
                    },
                    jobReport.job.customerContactId ? {
                        columns: [{
                            ...generateField('CONTACT', jobReport.job.customerContactId?.name, '25%')
                        }, {
                            ...generateField('PHONE NUMBER', jobReport.job.customerContactId?.phone, '25%')
                        }, {
                            ...generateField('EMAIL', jobReport.job.customerContactId?.email, '50%')
                        }, ],
                    } : {}, {
                        columns: [{
                            ...generateField('PURCHASE ORDER', jobReport.job.customerPO, '25%')
                        }, {
                            ...generateField('TECHNICIAN(S) NAME(S)', 
                                jobReport.job.tasks.map((task: any, idx: number) => task.technician?.profile?.displayName || '').flat(), 
                                '25%')
                        }, {
                            ...generateField('JOB TYPE(S)', 
                                jobReport.job.tasks.map((task: any) => {
                                    return task.jobTypes.map((jobType: any) => jobType.jobType?.title + ' ')}).flat(), 
                                '50%')
                        }, ],
                    },
                ],
            },
            jobReport.job.isHomeOccupied ? {...separator} : {},
            jobReport.job.isHomeOccupied ? {
                stack: [{
                    columns: [{
                        text: 'HOME OWNER INFORMATION',
                        style: 'subTitle',
                    }, ]
                }, {
                    columns: [{
                        ...generateField('FIRST NAME', jobReport.job.homeOwner?.profile?.firstName, '25%')
                    }, {
                        ...generateField('LAST NAME', jobReport.job.homeOwner?.profile?.lastName, '25%')
                    }, {
                        ...generateField('PHONE NUMBER', jobReport.job.homeOwner?.contact?.phoneNumber, '25%')
                    }, {
                        ...generateField('EMAIL', jobReport.job.homeOwner?.info?.email, '25%')
                    }, ],
                }, ],
            } : {}, {
                ...separator,
            }, {
                stack: [{
                    columns: [{
                        text: 'Notes',
                        style: 'header',
                    }, ]
                }, {
                    stack: [{
                        text: '\nSERVICE TICKET NOTE',
                        style: 'notesFieldLabel'
                    }, {
                        text: jobReport.job.request?.requests?.filter((request: any) => request.note).map((request: any) => request.note).join('\n\n') || jobReport.job.ticket?.note || 'N/A',
                        style: 'boldGrey'
                    }]
                }, {
                    stack: [{
                        text: '\nJOB NOTES',
                        style: 'notesFieldLabel'
                    }, {
                        text: jobReport.job.comment || 'N/A',
                        style: 'boldGrey'
                    }]
                }, {
                    stack: [{
                        text: '\nTECHNICIANS COMMENTS',
                        style: 'notesFieldLabel'
                    }, {
                        text: technicianNotes.length > 0 ?
                            technicianNotes.flat() :
                            'N/A',
                        style: 'boldGrey'
                    }]
                }, ],
            },{
                ...separator,
            },
            technicianImages.length > 0 ? {
                stack: [{
                    columns: [{
                        text: 'Images\n\n',
                        style: 'header',
                        pageBreak: 'before'
                    }, ]
                }, ]
            } : {},
            technicianImages.length > 0 ? {
                columns: technicianImages
            } : {},
        ],
        footer: {
            columns: [{
                    image: blueclerkLogo,
                    width: 10,
                    margin: [40, 0, 0, 0],
                },
                {
                    text: 'GENERATED BY BLUECLERK',
                    style: 'footerText',
                    margin: [43, 0, 0, 0],
                },
            ]
        },
        styles: {
            header: {
                fontSize: 18,
                bold: true,
                color: '#4F4F4F',
                alignment: 'left'
            },
            bigger: {
                fontSize: 15,
                italics: true
            },
            boldGrey: {
                fontSize: 12,
                bold: true,
                color: '#4F4F4F',
            },
            boldGreen: {
                fontSize: 12,
                bold: true,
                color: '#44d62c',
            },
            boldGreyRight: {
                fontSize: 12,
                bold: true,
                color: '#4F4F4F',
                alignment: 'right'
            },
            jobLabel: {
                fontSize: 18,
                bold: true,
                color: '#00aaff',
                alignment: 'right'
            },
            fieldLabelRight: {
                fontSize: 12,
                bold: false,
                color: '#828282',
                alignment: 'right'
            },
            fieldLabel: {
                fontSize: 12,
                bold: false,
                color: '#828282',
            },
            footerText: {
                fontSize: 8,
                bold: false,
                color: '#828282',
            },
            separatorStyle: {
                color: '#F2F2F2'
            },
            subTitle: {
                fontSize: 12,
                bold: true,
                color: '#4F4F4F',
                decoration: 'underline',
                decorationColor: '#4F4F4F'
            },
            notesFieldLabel: {
                fontSize: 12,
                bold: false,
                color: '#828282',
                decoration: 'underline',
                decorationColor: '#828282'
            },
        },
        images: {
            companyLogo: companyLogoFilePath,
            blueclerkLogo: blueclerkLogo
        },
    };
    return docDefinition;
}