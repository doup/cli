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

export type PostingEntry = Posting | PostingHalf;

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

export function isAmount(object: any): object is Amount {
    return typeof object === 'object' && ('total' in object) && ('currency' in object);
}

export function isPosting(object: any): object is Posting {
    return 'account' in object;
}

export function isPostingHalf(object: any): object is PostingHalf {
    return 'half' in object;
}

export function isAssertAccount(object: any): object is AssertAccount {
    return 'assert' in object;
}

export function isTransaction(object: any): object is Transaction {
    return 'postings' in object;
}
