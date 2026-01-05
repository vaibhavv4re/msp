export const pdfTheme = {
    colors: {
        text: "#262626",
        textLight: "#737373",
        textLighter: "#a3a3a3",
        border: "#e5e5e5",
        white: "#ffffff",
    },
    spacing: {
        pagePadding: 40,
        sectionGap: 24,
        rowGap: 12,
        itemPadding: 8,
        tightGap: 4,
    },
    fontSize: {
        tiny: 7,
        small: 8,
        base: 10,
        large: 12,
        heading: 18,
        title: 24,
    },
    fonts: {
        regular: "Helvetica",
        bold: "Helvetica-Bold",
    }
};

export type PDFTheme = typeof pdfTheme;
