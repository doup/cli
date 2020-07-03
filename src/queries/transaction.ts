import { Query } from '@mobilejazz/harmony-core';

export class TransactionsByMonthQuery extends Query {
    constructor(
        readonly account: string,
        readonly year: number,
        readonly month: number,
    ) {
        super();
    }
}
