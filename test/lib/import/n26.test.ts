import { expect } from 'chai';
import { getTransactions } from '../../../src/lib/import/n26';
import { outdent } from 'outdent';

describe('N26 import', () => {
    it('should load a CSV string', async () => {
        const csv = outdent`
            "Date","Payee","Account number","Transaction type","Payment reference","Category","Amount (EUR)","Amount (Foreign Currency)","Type Foreign Currency","Exchange Rate"
            "2019-12-01","LA PASTISSERIA DEL PAS","","MasterCard Payment","","Food & Groceries","-4.29","-4.80","USD","1.12"
            "2019-12-01","Cris Piris","","MoneyBeam","Thai + Gudog + Tren","Travel & Holidays","-70.0","","",""
        `;

        const rows = await getTransactions(csv);

        expect(rows).to.eql([
            {
                date: '2019-12-01',
                item: 'LA PASTISSERIA DEL PAS MasterCard Payment (Food & Groceries)',
                postings: [
                    { account: 'n26', amount: -4.29, foreignCurrency: 'USD', foreignAmount: -4.8 },
                    { account: 'expenses:???' },
                ],
            },
            {
                date: '2019-12-01',
                item: 'Thai + Gudog + Tren',
                postings: [
                    { account: 'n26', amount: -70 },
                    { account: 'expenses:???' },
                ],
            },
        ]);
    });
});
