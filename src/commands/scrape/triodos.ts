import { Command, flags } from '@oclif/command';

import { TriodosTransactionPuppeteerDataSource } from '../../data-sources/triodos-transaction-puppeteer.data-source';
import { TransactionsByMonthQuery } from '../../queries/transaction';

export default class ScrapeTriodos extends Command {
    static description = 'download Triodos data';
    static args = [];
    static flags = {
        help: flags.help({ char: 'h' }),
    };

    async run() {
        const ds = new TriodosTransactionPuppeteerDataSource('__USERNAME__', '__PASSWORD__', true);
        const csv = await ds.getAll(
            new TransactionsByMonthQuery(
                '__IBAN__',
                2019,
                4,
            ),
        );

        console.log(csv);
    }
}
