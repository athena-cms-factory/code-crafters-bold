/**
 * @file mapper.js
 * @description Vertaalt Nederlandse client-facing termen naar Engelse developer-facing termen.
 */

export function createMapper(schema) {
    const headerMap = {};
    const valueMap = {};

    if (schema && schema.mapping) {
        Object.keys(schema.mapping).forEach(key => {
            const lowerKey = key.toLowerCase();
            const value = schema.mapping[key];

            // Als de waarde een bekende tech-term is (begint niet met hoofdletter in de meeste van onze schemas)
            // Of we kijken gewoon naar wat het is.
            // In medical.json hebben we: "onderdeel": "Section_Type" (header)
            // en "spoed": "emergency" (value)
            
            // We onderscheiden headers van values op basis van de blueprint structure
            // Maar een simpele approach: alles in de mapping is een mogelijke vertaling.
            headerMap[lowerKey] = value;
            valueMap[lowerKey] = value;
        });
    }

    return {
        mapHeader: (header) => {
            const clean = header.trim().toLowerCase();
            return headerMap[clean] || header;
        },
        mapValue: (value) => {
            if (typeof value !== 'string') return value;
            const clean = value.trim().toLowerCase();
            return valueMap[clean] || value;
        }
    };
}
