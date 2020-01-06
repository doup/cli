import * as parse from 'csv-parse';
import { Transaction, PostingEntry } from '../types';

interface N26CSVRow {
    date: string;
    payee: string;
    type: string;
    item: string;
    category: string;
    amount: string;
    foreignAmount: string;
    foreignCurrency: string;
    exchangeRate: string;
}

export function getTransactions(csv: string): Promise<Transaction[]> {
    const csvOptions = {
        columns: ['date', 'payee', '_', 'type', 'item', 'category', 'amount', 'foreignAmount', 'foreignCurrency', 'exchangeRate'],
        delimiter: ',',
        from: 2, // Ignore first row
    };

    return new Promise((resolve, reject) => {
        parse(csv, csvOptions, (err, entries) => {
            if (err) {
                reject(err);
            } else {
                resolve(entries.reverse().map((entry: N26CSVRow): Transaction => {
                    const item = entry.item ? entry.item : `${entry.payee} ${entry.type} (${entry.category})`;
                    const amount = +entry.amount;
                    const isExpense = amount < 0;
                    const account = isExpense ? 'expenses:???' : 'income:???';
                    const n26Posting: PostingEntry = {
                        account: 'n26',
                        amount,
                    };

                    if (entry.foreignAmount !== '' && entry.foreignCurrency !== 'EUR') {
                        n26Posting.foreignAmount = +entry.foreignAmount;
                        n26Posting.foreignCurrency = entry.foreignCurrency;
                    }

                    return {
                        date: entry.date,
                        item,
                        postings: [
                            n26Posting,
                            { account },
                        ],
                    };
                }));
            }
        });
    });
}
