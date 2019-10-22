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

export interface AccountAssertion {
    account: string;
    amount: PostingAmount;
}

export interface AssertAccount {
    date: string;
    assert: AccountAssertion[];
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
    return `${currency.total}${currency.currency}`;
}

export function formatPostingAmount(amount: PostingAmount) {
    return formatAmount(postingAmountToAmount(amount));
}

export function generateAccountAssertion(assertion: AssertAccount): string {
    const lines = [assertion.date];

    assertion.assert.forEach((accountAssertion) => {
        lines.push(`    ${accountAssertion.account}  0 =* ${formatPostingAmount(accountAssertion.amount)}`);
    });

    return lines.join('\n');
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

        if ('amount' in entry && typeof entry.amount !== 'undefined') {
            line += `  ${formatPostingAmount(entry.amount)}`;
        }

        if ('dateValue' in entry) {
            line += ` ; DATE_VALUE=${entry.dateValue}`;
        }

        lines.push(line);
    });

    return lines.join('\n');
}

export function generateJournal(entries: JournalEntry[]): string {
    return entries.map((entry) => {
        if (isTransaction(entry)) {
            try {
                return generateTransaction(entry);
            } catch (e) {
                throw new Error(`${e.message}. Transaction: date=${entry.date}, item=${entry.item}`);
            }
        } else if (isAssertAccount(entry)) {
            try {
                return generateAccountAssertion(entry);
            } catch (e) {
                throw new Error(`${e.message}. AssertAccount: date=${entry.date}`);
            }
        }

        return '';
    }).join('\n\n') + '\n';
}

export function parseHalfPostings(transaction: Transaction): Transaction {
    const halfPostingIdx = transaction.postings.findIndex((entry) => isPostingHalf(entry));
    const hasHalfPosting = halfPostingIdx !== -1;
    const postingsWithAmounts = (transaction.postings as Posting[])
        .filter((entry) => isPosting(entry))
        .filter((posting) => !!posting.amount);

    if (hasHalfPosting) {
        if (postingsWithAmounts.length !== 1) {
            throw new Error(`Half shortcut needs only one posting with amounts.`);
        }

        // `if` to make happy TypeScript
        if (postingsWithAmounts[0].amount) {
            const halfPosting = transaction.postings[halfPostingIdx] as PostingHalf;
            const amount = postingAmountToAmount(postingsWithAmounts[0].amount);
            amount.total = -(amount.total / 2);
            amount.total = +amount.total.toFixed(2);

            transaction.postings[halfPostingIdx] = {
                account: halfPosting.half,
                amount: amount,
            };
        }
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

    throw new Error(`Unknown money amount format: ${amount}`);
}
