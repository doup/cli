import outdent from 'outdent';

export interface Amount {
    total: number;
    currency: string;
}

export type PostingAmount = Amount | number | string;

export interface Posting {
    account: string;
    amount?: PostingAmount;
    dateValue?: string;
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
    ignore?: boolean;
    item: string;
    tags?: string[];
    postings: PostingEntry[];
}

export type JournalEntry = AssertAccount | Transaction;

function isAmount(object: any): object is Amount {
    return typeof object === 'object' && ('total' in object) && ('currency' in object);
}

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

export function formatPostingAmount(amount: PostingAmount) {
    return formatAmount(postingAmountToAmount(amount));
}

export function generateAccountAssertion(assertion: AssertAccount): string {
    return outdent`
    ${assertion.date}
        ${assertion.assert.account}  0 =* ${formatPostingAmount(assertion.assert.amount)}
    `;
}

export function generateTransaction(transaction: Transaction): string {
    const ignoreTransaction = !!transaction.ignore;
    const lines = [];
    let tags = '';

    if (ignoreTransaction) {
        return '';
    }

    // Convert PostingHalf entries to Posting ones
    transaction = parseHalfPostings(transaction);

    if (transaction.tags && transaction.tags.length > 0) {
        tags = ' ; ' + transaction.tags.map((tag) => `${tag}:`).join(' ');
    }

    lines.push(`${transaction.date} ${transaction.item}${tags}`);

    (transaction.postings as Posting[]).forEach((entry) => {
        let line = `    ${entry.account}`;

        if (entry.amount) {
            line += `  ${formatPostingAmount(entry.amount)}`;
        }

        if (entry.dateValue) {
            line += ` ; DATE_VALUE=${entry.dateValue}`;
        }

        lines.push(line);
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

export function parseHalfPostings(transaction: Transaction): Transaction {
    const halfPostingIdx = transaction.postings.findIndex((entry) => isPostingHalf(entry));
    const hasHalfPosting = halfPostingIdx !== -1;
    const postingsWithAmounts = (transaction.postings as Posting[])
        .filter((entry) => isPosting(entry))
        .filter((posting) => !!posting.amount);

    if (postingsWithAmounts.length !== 1) {
        throw new Error(`Half shortcut needs only one posting with amounts. (date=${transaction.date}, item=${transaction.item})`);
    }

    if (postingsWithAmounts[0].amount && hasHalfPosting) {
        const halfPosting = transaction.postings[halfPostingIdx] as PostingHalf;
        const amount = postingAmountToAmount(postingsWithAmounts[0].amount);
        amount.total = -(amount.total / 2);

        transaction.postings[halfPostingIdx] = {
            account: halfPosting.half,
            amount: amount,
        };
    }

    return transaction;
}

export function postingAmountToAmount(amount: PostingAmount): Amount {
    if (isAmount(amount)) {
        return amount;
    } else if (typeof amount === 'number') {
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
