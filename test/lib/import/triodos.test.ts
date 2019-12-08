import { expect } from 'chai';
import { getTransactions } from '../../../src/lib/import/triodos';
import { outdent } from 'outdent';

describe('Triodos import', () => {
    it('should load a CSV string', async () => {
        const csv = outdent`
            "";"F. ejecuci�n";"F. valor";"Concepto";"Importe";"Saldo"
            "";"05/12/2019";"03/12/2019";"RECIBO Mobile";"-40,00";"160,00"
            "";"04/12/2019";"04/12/2019";"Invoice";"100,00";"200,00"
        `;

        const rows = await getTransactions('triodos:cash', csv);

        expect(rows).to.eql([
            {
                date: '2019-12-05',
                item: 'RECIBO Mobile',
                postings: [
                    { account: 'triodos:cash', amount: -40, dateValue: '2019-12-03' },
                    { account: 'expenses:???' },
                ],
            },
            {
                date: '2019-12-04',
                item: 'Invoice',
                postings: [
                    { account: 'triodos:cash', amount: 100, dateValue: '2019-12-04' },
                    { account: 'income:???' },
                ],
            },
        ]);
    });
});
