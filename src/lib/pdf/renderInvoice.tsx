import React from 'react';
import { InvoiceTemplate, InvoicePDFData } from './types';
import { ClassicInvoice } from './templates/ClassicInvoice';
import { CompactInvoice } from './templates/CompactInvoice';
import { CreativeInvoice } from './templates/CreativeInvoice';

export function renderInvoiceTemplate(
    template: InvoiceTemplate,
    data: InvoicePDFData
) {
    console.log(`[PDF] Rendering template: ${template} (v1)`);

    switch (template) {
        case "compact":
            return <CompactInvoice data={data} />;
        case "creative":
            return <CreativeInvoice data={data} />;
        case "classic":
        default:
            return <ClassicInvoice data={data} />;
    }
}
