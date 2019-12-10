import { Transaction, Posting, isPosting, PostingEntry } from './types';

export interface CategoryRule {
    test: string;
    category: string;
    account?: string;
    amountMultiplier?: number;
    addPostings?: PostingEntry[];
}

export class Categorizer {
    constructor(
        protected rules: CategoryRule[],
    ) {}

    categorize(entry: Transaction): Transaction {
        for (let rule of this.rules) {
            if (entry.item.indexOf(rule.test) !== -1) {
                const amountPosting = this.findAmountPosting(entry);
                const categoryPosting = this.findCategoryPosting(entry);

                if (amountPosting && categoryPosting) {
                    if (amountPosting.amount &&
                        (typeof amountPosting.amount === 'string' || typeof amountPosting.amount === 'number') &&
                        rule.amountMultiplier
                    ) {
                        amountPosting.amount = (+amountPosting.amount) * rule.amountMultiplier;
                    }

                    if (rule.account) {
                        amountPosting.account = rule.account;
                    }

                    if (rule.category) {
                        categoryPosting.account = rule.category;
                    }

                    if (rule.addPostings) {
                        entry.postings = [
                            ...entry.postings,
                            ...rule.addPostings,
                        ];
                    }

                    return entry;
                }
            }
        }

        return entry;
    }

    protected findAmountPosting(entry: Transaction): Posting | undefined {
        return this.getPostings(entry).find(posting => 'amount' in posting);
    }

    protected findCategoryPosting(entry: Transaction): Posting | undefined {
        return this.getPostings(entry).find(posting => !('amount' in posting));
    }

    protected getPostings(entry: Transaction): Posting[] {
        return entry.postings.filter(posting => isPosting(posting)) as Posting[];
    }
}
