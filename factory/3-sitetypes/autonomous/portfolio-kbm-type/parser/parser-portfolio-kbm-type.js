import { ParserEngine } from '../../5-engine/parser-engine.js';

export class PortfolioKbmTypeParser extends ParserEngine {
    constructor() {
        super('portfolio-kbm-type');
    }

    async customParsing(data) {
        return data;
    }
}