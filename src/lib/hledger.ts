import outdent from 'outdent';

export interface Amount {
    total: number;
    currency: string;
}

export type PostingAmount = number | string;

export interface Posting {
    account: string;
    amount?: PostingAmount;
    foreignAmount?: number;
    foreignCurrency?: string;
}

export interface PostingHalf {
    half: string;
}

type PostingEntry = Posting | PostingHalf;

export interface AssertAccount {
    date: string;
    assert: {
        account: string;
        amount: PostingAmount;
    };
}

export interface Transaction {
    date: string;
    item: string;
    tags?: string[];
    postings: PostingEntry[];
}

export type JournalEntry = AssertAccount | Transaction;

function isPosting(object: any): object is Posting {
    return 'account' in object;
}

function isPostingHalf(object: any): object is PostingHalf {
    return 'half' in object;
}

function isAssertAccount(object: any): object is AssertAccount {
    return 'assert' in object;
}

function isTransaction(object: any): object is Transaction {
    return 'postings' in object;
}

function isNumeric(num: any) {
    return !isNaN(num);
}

export function formatAmount(currency: Amount) {
    return `${currency.total.toFixed(2)}${currency.currency}`;
}

export function currencyPostingAmountToAmount(amount: PostingAmount): Amount {
    if (typeof amount === 'number') {
        return { total: amount, currency: '€' };
    } else if (typeof amount === 'string') {
        if (isNumeric(amount)) {
            return { total: +amount, currency: '€' };
        }

        const matches = amount.match(/[0-9.]+|[^0-9.]+/gi);

        if (matches) {
            const parts = matches.map((part) => part.trim()).filter((part) => part !== '');

            if (parts.length > 2) {
                throw new Error(`Malformed currency: ${amount}`);
            }

            const currencyAmount = parts.filter((part) => isNumeric(part));
            const currencyCurrency = parts.filter((part) => !isNumeric(part));

            if (currencyAmount.length === 1 && currencyCurrency.length === 1) {
                return {
                    total: +currencyAmount[0],
                    currency: currencyCurrency[0],
                };
            }
        }
    }

    throw new Error('Unknown money amount format');
}

export function formatPostingAmount(amount: PostingAmount) {
    return formatAmount(currencyPostingAmountToAmount(amount));
}

export function generateAccountAssertion(assertion: AssertAccount): string {
    return outdent`
    ${assertion.date}
        ${assertion.assert.account}  0 =* ${formatPostingAmount(assertion.assert.amount)}
    `;
}

export function generateTransaction(transaction: Transaction): string {
    const lines = [];
    let tags = '';

    const postingsWithAmounts = (transaction.postings as Posting[])
        .filter((entry) => isPosting(entry))
        .filter((posting) => !!posting.amount);

    if (transaction.tags && transaction.tags.length > 0) {
        tags = ' ; ' + transaction.tags.map((tag) => `${tag}:`).join(' ');
    }

    lines.push(`${transaction.date} ${transaction.item}${tags}`);

    transaction.postings.forEach((entry) => {
        if (isPosting(entry)) {
            if (entry.amount) {
                lines.push(`    ${entry.account}  ${formatPostingAmount(entry.amount)}`);
            } else {
                lines.push(`    ${entry.account}`);
            }
        } else if (isPostingHalf(entry)) {
            if (postingsWithAmounts.length !== 1) {
                throw new Error(`Half shortcut needs only one posting with amounts. (date=${transaction.date}, item=${transaction.item})`);
            }

            if (postingsWithAmounts[0].amount) {
                const currency = currencyPostingAmountToAmount(postingsWithAmounts[0].amount);

                currency.total = -(currency.total / 2);

                lines.push(`    ${entry.half}  ${formatAmount(currency)}`);
            }
        }
    });

    return lines.join('\n');
}

export function generateJournal(entries: JournalEntry[]): string {
    return entries.map((entry) => {
        if (isTransaction(entry)) {
            return generateTransaction(entry);
        }

        if (isAssertAccount(entry)) {
            return generateAccountAssertion(entry);
        }

        return '';
    }).join('\n');
}
