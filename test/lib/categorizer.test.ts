import { expect } from 'chai';
import { CategoryRule, Categorizer } from '../../src/lib/categorizer';
import { Transaction } from '../../src/lib/types';

const transactionA: Transaction = {
    item: 'Lorem ipsum',
    date: '2019-12-10',
    postings: [
        { account: 'foo', amount: 10.0 },
        { account: 'bar' },
        { half: 'ignore-this' },
    ],
};

const transactionNoPostings: Transaction = {
    item: 'Lorem ipsum',
    date: '2019-12-10',
    postings: [
        { half: 'ignore-this' },
    ],
};

const rules: CategoryRule[] = [
    {
        test: 'AMOR',
        category: 'expenses:freelance:asesor',
    },
    {
        test: 'ACME',
        amountMultiplier: -1,
        category: 'triodos:cash',
        account: 'income:acme',
    },
    {
        test: 'AUTOMONOS',
        account: 'triodos:automono',
        category: 'expenses:freelance:automono',
    },
    {
        test: 'ENEDGIA',
        category: 'expenses:home:electricity',
        addPostings: [
            { half: 'lorem:home:utilities' },
        ],
    },
    {
        test: 'MOBILEFONO',
        category: 'expenses:phone',
        addPostings: [
            { account: 'expenses:home:internet', amount: 11.99 },
            { account: 'lorem:home:utilities', amount: 11.99 },
        ],
    },
];

describe('Categorizer', () => {
    describe('getPostings', () => {
        it('should return all Postings', () => {
            const categorizer = new Categorizer([]);

            expect(categorizer['getPostings'](transactionA)).to.eql([
                { account: 'foo', amount: 10.0 },
                { account: 'bar' },
            ]);
        });
    });

    describe('findAmountPosting', () => {
        it('should return only postings with amount', () => {
            const categorizer = new Categorizer([]);

            expect(categorizer['findAmountPosting'](transactionA)).to.eql({ account: 'foo', amount: 10.0 });
        });

        it('should return `undefined` if nothing is found', () => {
            const categorizer = new Categorizer([]);

            // tslint:disable-next-line:no-unused-expression
            expect(categorizer['findAmountPosting'](transactionNoPostings)).to.be.undefined;
        });
    });

    describe('getPostings', () => {
        it('should return only postings without amount (category)', () => {
            const categorizer = new Categorizer([]);

            expect(categorizer['findCategoryPosting'](transactionA)).to.eql({ account: 'bar' });
        });

        it('should return `undefined` if nothing is found', () => {
            const categorizer = new Categorizer([]);

            // tslint:disable-next-line:no-unused-expression
            expect(categorizer['findCategoryPosting'](transactionNoPostings)).to.be.undefined;
        });
    });

    describe('categorize', () => {
        it(`should return the same transaction unchanged if it doesn't match with any rule`, () => {
            const categorizer = new Categorizer(rules);

            expect(categorizer.categorize(transactionA)).to.eql(transactionA);
        });

        it('should change category', () => {
            const categorizer = new Categorizer(rules);
            const transaction: Transaction = {
                item: 'AMOR ASESORS',
                date: '2019-12-10',
                postings: [
                    { account: 'triodos:cash', amount: -100 },
                    { account: 'expenses:???' },
                ],
            };

            expect(categorizer.categorize(transaction)).to.eql({
                item: 'AMOR ASESORS',
                date: '2019-12-10',
                postings: [
                    { account: 'triodos:cash', amount: -100 },
                    { account: 'expenses:freelance:asesor' },
                ],
            });
        });

        it('should change amount', () => {
            const categorizer = new Categorizer(rules);
            const transaction: Transaction = {
                item: 'ACME invoice',
                date: '2019-12-10',
                postings: [
                    { account: 'triodos:cash', amount: 1000 },
                    { account: 'income:???' },
                ],
            };

            expect(categorizer.categorize(transaction)).to.eql({
                item: 'ACME invoice',
                date: '2019-12-10',
                postings: [
                    { account: 'income:acme', amount: -1000 },
                    { account: 'triodos:cash' },
                ],
            });
        });

        it('should change account', () => {
            const categorizer = new Categorizer(rules);
            const transaction: Transaction = {
                item: 'AUTOMONOS del ESTADO',
                date: '2019-12-10',
                postings: [
                    { account: 'triodos:cash', amount: -100 },
                    { account: 'expenses:???' },
                ],
            };

            expect(categorizer.categorize(transaction)).to.eql({
                item: 'AUTOMONOS del ESTADO',
                date: '2019-12-10',
                postings: [
                    { account: 'triodos:automono', amount: -100 },
                    { account: 'expenses:freelance:automono' },
                ],
            });
        });

        it('should add postings (1)', () => {
            const categorizer = new Categorizer(rules);
            const transaction: Transaction = {
                item: 'ENEDGIA LIMPIA',
                date: '2019-12-10',
                postings: [
                    { account: 'triodos:cash', amount: -100 },
                    { account: 'expenses:???' },
                ],
            };

            expect(categorizer.categorize(transaction)).to.eql({
                item: 'ENEDGIA LIMPIA',
                date: '2019-12-10',
                postings: [
                    { account: 'triodos:cash', amount: -100 },
                    { account: 'expenses:home:electricity' },
                    { half: 'lorem:home:utilities' },
                ],
            });
        });

        it('should add postings (2)', () => {
            const categorizer = new Categorizer(rules);
            const transaction: Transaction = {
                item: 'Telecomunicaciones MOBILEFONO',
                date: '2019-12-10',
                postings: [
                    { account: 'triodos:cash', amount: -100 },
                    { account: 'expenses:???' },
                ],
            };

            expect(categorizer.categorize(transaction)).to.eql({
                item: 'Telecomunicaciones MOBILEFONO',
                date: '2019-12-10',
                postings: [
                    { account: 'triodos:cash', amount: -100 },
                    { account: 'expenses:phone' },
                    { account: 'expenses:home:internet', amount: 11.99 },
                    { account: 'lorem:home:utilities', amount: 11.99 },
                ],
            });
        });
    });
});
