import moment from 'moment';

import { INVOICE_IMAGE_PATH } from '../common/config';
import { IJobReport } from 'src/models/JobReport';
import { downloadFileToPath } from '../controllers/invoice';

// Partial method to generate the PDF content of A/R Report
export const handleJobReportPdf = async (jobReport : IJobReport) : Promise<any> => {
    const blueclerkLogo = 'assets/images/logo_blue.png';
    const separator : any = {
        text: '_____________________________________________________________________________________________\n\n',
        style: 'separatorStyle'
    };
    const generateField = (label : string, value : string, width : string) => (value ? {
        stack: [{
            text: '\n' + label,
            style: 'fieldLabel'
        }, {
            text: value || 'N/A',
            style: 'boldGrey'
        }],
        width: width,
    } : {text: '', width: '0%'});
    // Handle company logo download
    let companyLogoFilePath = '';
    // Construct default Company Logo image
    let companyImage: any = {
        text: '',
        fillColor: '#cccccc',
        width: '5%',
    };
    if (jobReport.job.company?.info?.logoUrl) {
        // Check and download Company Logo to /tmp file
        companyLogoFilePath = await downloadFileToPath(jobReport.job.company, jobReport.job.company.info.logoUrl, '/' + INVOICE_IMAGE_PATH, true);
        companyImage = {
            image: 'companyLogo',
            width: 60,
        };
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
    
    const endTime = jobReport.job?.scheduledEndTime? `:${moment.utc(jobReport.job?.scheduledEndTime).format('hh:mma')}` : '';
    const specificTime = `${moment.utc(jobReport.job?.scheduledStartTime).format('hh:mma')}${endTime}`;
    let time = 'N/A';
    switch (jobReport.job?.scheduleTimeAMPM) {
    case 0:
        time = specificTime;
        break;
    case 1: 
        time = 'AM';
        break;
    case 2:
        time = 'PM';
        break;
       
    }
    const serviceTicketNotes = jobReport.job.request?.requests?.filter((request: any) => request.note).map((request: any) => request.note).join('\n\n') || jobReport.job.ticket?.note;
    // ===================================
    // ===[ INITIALIZE PDF TEMPLATE ]=====
    // ===================================
    const docDefinition : any = {
        content: [
            {
                layout: {
                    hLineColor: function (i: any, node: any) {
                        return '#F2F2F2';
                    },
                    paddingBottom: function (i: any, node: any) { return 0; },   
                    hLineWidth: function(i: any, node: any) {
                        return i === 1 ? 1 : 0;
                    },
                    vLineWidth: function() {
                        return 0;
                    }
                },
                table: {
                    margin: 0,
                    headerRows: 0,
                    widths: ['*'],
                    body: [
                        [
                            {
                                fillColor: '#f9fdff',
                                margin: [40, 40, 40, 10],
                                stack: [
                                    {
                                        width: '100%',
                                        stack: [{
                                            columns: [
                                                {
                                                    width: '15%',
                                                    stack: [{
                                                        text: '\n',
                                                        style: 'footerText'
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
                                                        text: (jobReport.job.company?.address?.street ? jobReport.job.company?.address?.street + '\n' : '') +
                                                                (jobReport.job.company?.address?.city ? jobReport.job.company?.address?.city + ', ' : '') +
                                                                (jobReport.job.company?.address?.state ? jobReport.job.company?.address?.state + ', ' : '') +
                                                                (jobReport.job.company?.address?.zipCode || '') + '\n' +
                                                                (jobReport.job.company?.contact?.phone ? jobReport.job.company?.contact?.phone + '\n' : '') +
                                                                (jobReport.job.company?.info?.companyEmail ? jobReport.job.company?.info?.companyEmail : ''),
                                                        style: 'boldGrey',
                                                    }
                                                    ]
                                                },
                                                {
                                                    stack: [{
                                                        text: jobReport.job.jobId ? `Job Report - ${jobReport.job.jobId}` : 'N/A',
                                                        style: 'jobLabel'
                                                    }, {
                                                        text: '\nJOB DATE',
                                                        style: 'fieldLabelRight'
                                                    }, {
                                                        text: moment.utc(jobReport.job?.scheduleDate).format('ll') || 'N/A',
                                                        style: 'boldGreyRight'
                                                    }, {
                                                        text: jobReport.job.rescheduled ? '(Rescheduled)' : '',
                                                        style: 'fieldLabelRight'
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
                                                ...generateField('NAME', jobReport.job.customer?.profile?.displayName, '25%')
                                            }, {
                                                ...generateField('ADDRESS', 
                                                    (jobReport.job.customer?.address?.street ? jobReport.job.customer?.address?.street + '\n' : '') +
                                                    (jobReport.job.customer?.address?.city ? jobReport.job.customer?.address?.city + ', ' : '') +
                                                    (jobReport.job.customer?.address?.state ? jobReport.job.customer?.address?.state + ' ' : '') +
                                                    (jobReport.job.customer?.address?.zipCode ? jobReport.job.customer?.address?.zipCode + ' ' : ''), 
                                                    '25%')
                                            }, {
                                                ...generateField('PHONE NUMBER', jobReport.job.customer?.contact?.phone, '25%')
                                            }, {
                                                ...generateField('EMAIL', jobReport.job.customer?.info?.email, '50%')
                                            }, ],
                                        }, ],
                                    },
                                ]
                            }
                        ],
                        [
                            {
                                margin: [40, 10, 40, 40],
                                stack: [
                                    {
                                        stack: [{
                                            columns: [{
                                                text: 'JOB DETAILS',
                                                style: 'subTitle',
                                            }, ]
                                        }, {
                                            columns: [{
                                                ...generateField('SUBDIVISION', jobReport.job.jobLocation?.name, '25%')
                                            }, {
                                                ...generateField('JOB ADDRESS', jobReport.job.jobSite?.name, '25%')
                                            }, {
                                                stack: [{
                                                    text: '\nHOUSE STATUS',
                                                    style: 'fieldLabel'
                                                }, {
                                                    text: jobReport.job.isHomeOccupied ? 'Occupied' : 'Not occupied',
                                                    style: jobReport.job.isHomeOccupied ? 'boldGreen' : 'boldGrey'
                                                }],
                                                width: '25%',
                                            },{
                                                ...generateField('TIME', time, '20,5%')
                                            } 
                                                
                                                
                                                // {
                                                //     ...generateField('START TIME', moment.utc(jobReport.job?.scheduledStartTime).format('hh:mm A'), '12.5%')
                                                // }, {
                                                //     ...generateField('END TIME', moment.utc(jobReport.job?.scheduledEndTime).format('hh:mm A'), '12.5%')
                                                // }, 
                                            ],
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
                                                    jobReport.job.tasks.map((task: any, idx: number) => task.technician?.profile?.displayName ? task.technician?.profile?.displayName + '\n' : '').flat(), 
                                                    '25%')
                                            }, {
                                                stack: [{
                                                    text: '\n' + 'JOB TYPE(S)',
                                                    style: 'fieldLabel'
                                                }, 
                                                ...jobReport.job.tasks.map((task: any) => {
                                                    return task.jobTypes.map((jobType: any) => {
                                                        return {
                                                            text: jobType.jobType?.title || 'N/A',
                                                            style: 'boldGrey'
                                                        };
                                                    });
                                                }), 
                                                ],
                                                width: '25%'
                                            }, {
                                                stack: [{
                                                    text: '\n' + 'QUANTITY',
                                                    style: 'fieldLabel'
                                                }, 
                                                ...jobReport.job.tasks.map((task: any) => {
                                                    return task.jobTypes.map((jobType: any) => {
                                                        return {
                                                            text: jobType.quantity || '1',
                                                            style: 'boldGrey'
                                                        };
                                                    });
                                                }), 
                                                ],
                                                width: '25%'
                                            }, 
                                            ],
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
                                                ...generateField('EMAIL', jobReport.job.homeOwner?.info?.email, '50%')
                                            }, ],
                                        }, ],
                                    } : {}, {
                                        ...separator,
                                    }, serviceTicketNotes || jobReport.job.comment || technicianNotes.length > 0 ? {
                                        stack: [{
                                            columns: [{
                                                text: 'Notes',
                                                style: 'header',
                                            }, ] 
                                        }, serviceTicketNotes ? {
                                            stack: [{
                                                text: '\nSERVICE TICKET NOTE',
                                                style: 'notesFieldLabel'
                                            }, {
                                                text:  serviceTicketNotes,
                                                style: 'boldGrey'
                                            }]
                                        } : {}, jobReport.job.comment ? {
                                            stack: [{
                                                text: '\nJOB NOTES',
                                                style: 'notesFieldLabel'
                                            }, {
                                                text: jobReport.job.comment,
                                                style: 'boldGrey'
                                            }]
                                        } : {}, technicianNotes.length > 0 ? {
                                            stack: [{
                                                text: '\nTECHNICIANS COMMENTS',
                                                style: 'notesFieldLabel'
                                            }, {
                                                text: technicianNotes.flat(),
                                                style: 'boldGrey'
                                            }]
                                        } : {}, ],
                                    }: {}, serviceTicketNotes || jobReport.job.comment || technicianNotes.length > 0 ? {
                                        ...separator,
                                    } : {},
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
                                ]
                            },
                            
                        ]
                    ]
                }
            }            
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
                color: '#262626',
                alignment: 'left'
            },
            bigger: {
                fontSize: 15,
                italics: true
            },
            boldGrey: {
                fontSize: 10,
                bold: true,
                color: '#262626',
            },
            boldGreen: {
                fontSize: 10,
                bold: true,
                color: '#2d8f1d',
            },
            boldGreyRight: {
                fontSize: 10,
                bold: true,
                color: '#262626',
                alignment: 'right'
            },
            jobLabel: {
                fontSize: 18,
                bold: true,
                color: '#00aaff',
                alignment: 'right'
            },
            fieldLabelRight: {
                fontSize: 10,
                bold: false,
                color: '#5c5c5c',
                alignment: 'right'
            },
            fieldLabel: {
                fontSize: 10,
                bold: false,
                color: '#5c5c5c',
            },
            footerText: {
                fontSize: 8,
                bold: false,
                color: '#5c5c5c',
            },
            separatorStyle: {
                color: '#F2F2F2'
            },
            subTitle: {
                fontSize: 10,
                bold: true,
                color: '#626262',
                decoration: 'underline',
                decorationColor: '#4F4F4F'
            },
            notesFieldLabel: {
                fontSize: 10,
                bold: false,
                color: '#5c5c5c',
                decoration: 'underline',
                decorationColor: '#828282'
            },
        },
        images: {
            companyLogo: companyLogoFilePath,
            blueclerkLogo: blueclerkLogo
        },
        pageMargins: [0, 0,0, 40]
    };
    return docDefinition;
};