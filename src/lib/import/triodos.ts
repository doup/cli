import * as parse from 'csv-parse';
import { Transaction } from '../types';

interface TriodosCSVRow {
    date: string;
    dateValue: string;
    item: string;
    amount: string;
    total: string;
}

export function getTransactions(fromAccount: string, csv: string): Promise<Transaction[]> {
    const csvOptions = {
        columns: ['_', 'date', 'dateValue', 'item', 'amount', 'total'],
        delimiter: ';',
        from: 2, // Ignore first row
    };

    return new Promise((resolve, reject) => {
        parse(csv, csvOptions, (err, entries) => {
            if (err) {
                reject(err);
            } else {
                resolve(entries.map((entry: TriodosCSVRow): Transaction => {
                    const date = entry.date.split('/').reverse().join('-');
                    const dateValue = entry.dateValue.split('/').reverse().join('-');
                    const amount = +entry.amount.replace('.', '').replace(',', '.');
                    // const total = +entry.total.replace('.', '').replace(',', '.');
                    const isExpense = amount < 0;
                    const account = isExpense ? 'expenses:???' : 'income:???';

                    delete (entry as any)._;

                    return {
                        date,
                        item: entry.item,
                        postings: [
                            { account: fromAccount, amount, dateValue },
                            { account },
                        ],
                    };
                }));
            }
        });
    });
}

// export function getTransactions(csv: string) {

// }
