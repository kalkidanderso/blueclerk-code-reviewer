export const Layouts = {
    noBorders: { defaultBorder: false, },
    headerLineOnly: 'headerLineOnly',
    lightHorizontalLines: 'lightHorizontalLines',
    custom: {
        hLineWidth: function (i: number, node: { table: { body: string | any[]; }; }) {
            return i === 0 || i === node.table.body.length ? 0 : 1;
        },
        vLineWidth: function (i: number, node: { table: { widths: string | any[]; }; }) {
            return i === 0 || i === node.table.widths.length ? 0 : 1;
        },
        vLineColor: function (i: number, node: { table: { widths: string | any[]; }; }) {
            return i === 0 || i === node.table.widths.length ? "black" : "white";
        },
        hLineColor: function (i: number, node: { table: { body: string | any[]; }; }) {
            return i === 0 || i === node.table.body.length
                ? "#d0d3dc"
                : "#eeeeee";
        },
    }
}

export const Styles = {
    arReport: {
        title: {
            fontSize: 18,
            bold: true,
            color: '#4F4F4F',
        },
        titleTable: {
            fillColor: '#EAECF3',
            margin: [0, -1]
        },
        smallFont: {
            fontSize: 7,
            lineHeight: 1.2,
            color: '#000000'
        },
        smallFontGray: {
            fontSize: 7,
            lineHeight: 1.2,
            color: '#4F4F4F'
        },
        smallFontBold: {
            bold: true,
            italics: true,
            fontSize: 7,
            lineHeight: 1.2,
        },
        defaultFont: {
            bold: false,
            fontSize: 8,
            lineHeight: 1.2,
        },
        defaultFontBold: {
            bold: true,
            fontSize: 8,
            lineHeight: 1.2,
        },
        lineFont: {
            bold: false,
            fontSize: 10,
            weight: 100,
            lineHeight: 1.2,
        },
        lineFontBold: {
            bold: true,
            fontSize: 10,
            color: '#000000',
            margin: [0, 5]
        },
        lineFontGrayBold: {
            bold: true,
            fontSize: 9,
            color: '#4F4F4F',
            alignment: 'right',
            margin: [0, 5]
        },
        tableFont: {
            bold: false,
            fontSize: 16,
            weight: 100,
            lineHeight: 1.2,
        },
        tableHeader: {
            bold: true,
            fontSize: 13,
            color: "black",
        },
        reportFilter: {
            fontSize: 9,
            color: '#333333'
        },
        totalOutstanding: {
            bold: true,
            fontSize: 14,
            color: '#4F4F4F',
            alignment: 'right'
        },
        globalAgingTitle: {
            fontSize: 6,
            color: '#828282',
            margin: [0, 15, 0, 10]
        },
        globalAgingOutstanding: {
            bold: true,
            fontSize: 10,
            color: '#4F4F4F',
            margin: [0, 0, 0, 15]
        }
    },
    invoice: {
        headerTitle: {
            fontSize: 11,
            color: '#828282'
        },
        headerTitleBold: {
            fontSize: 11,
            bold: true,
            color: '#828282'
        },
        companyName: {
            fontSize: 16,
            bold: true,
            color: '#4F4F4F'
        },
        invoiceId: {
            fontSize: 20,
            bold: true,
            color: '#00AAFF'
        },
        invoiceHeader: {
            fontSize: 11,
            color: '#333333'
        },
        invoiceHeaderBold: {
            fontSize: 11,
            bold: true,
            color: '#4F4F4F'
        },
        invoiceMetadataTitle: {
            fontSize: 11,
            bold: true,
            color: '#333333',
            alignment: 'right',
            rowSpan: 2
        },
        invoiceMetadata: {
            fontSize: 11,
            color: '#333333',
            alignment: 'right',
            rowSpan: 2
        },
        itemTitle: {
            fontSize: 12,
            bold: true,
            color: '#828282',
            fillColor: '#F9FDFF',
            margin: [0, 10, 0, 5]
        },
        itemListBold: {
            fontSize: 12,
            bold: true,
            color: '#4F4F4F',
            margin: [0, 0, 0, 5]
        },
        itemList: {
            fontSize: 12,
            color: '#4F4F4F'
        },
        itemListCenter: {
            fontSize: 12,
            color: '#4F4F4F',
            alignment: 'center'
        },
        itemListRight: {
            fontSize: 12,
            color: '#4F4F4F',
            alignment: 'right'
        },
        amountDueTitle: {
            fontSize: 12,
            bold: true,
            color: '#333333',
            alignment: 'right'
        },
        amountDue: {
            fontSize: 16,
            bold: true,
            color: '#333333',
            alignment: 'right'
        },
        icon: {
            font: 'Fontello',
            fontSize: 12,
            color: '#4F4F4F',
            alignment: 'center'
        }
    }
}
