import outdent from 'outdent';
import { expect } from 'chai';
import { postingAmountToAmount, formatAmount, generateAccountAssertion, generateTransaction, parseHalfPostings } from '../../src/lib/hledger';
import { AssertAccount, Transaction } from '../../src/lib/types';

describe('hledger journal helpers', () => {
    describe('postingAmountToAmount', () => {
        it('should just return Amount types as they are', () => {
            // Euroz Dollaz Yeniz
            expect(postingAmountToAmount({ total: 8, currency: '€' })).to.eql({ total: 8, currency: '€' });
            expect(postingAmountToAmount({ total: 10, currency: '$' })).to.eql({ total: 10, currency: '$' });
            expect(postingAmountToAmount({ total: -25, currency: '¥' })).to.eql({ total: -25, currency: '¥' });
        });

        it('should convert numbers to Euros', () => {
            expect(postingAmountToAmount(0)).to.eql({ total: 0, currency: '€' });
            expect(postingAmountToAmount(8)).to.eql({ total: 8, currency: '€' });
            expect(postingAmountToAmount(12.99)).to.eql({ total: 12.99, currency: '€' });
        });

        it('should convert numeric strings to Euros', () => {
            expect(postingAmountToAmount('8')).to.eql({ total: 8, currency: '€' });
            expect(postingAmountToAmount('12.99')).to.eql({ total: 12.99, currency: '€' });
        });

        it('should get currency from the string', () => {
            expect(postingAmountToAmount('8VND')).to.eql({ total: 8, currency: 'VND' });
            expect(postingAmountToAmount('12.99$')).to.eql({ total: 12.99, currency: '$' });
            expect(postingAmountToAmount('¥100')).to.eql({ total: 100, currency: '¥' });
        });

        it('should allow multiple decimals', () => {
            expect(postingAmountToAmount('0.0025BTC')).to.eql({ total: 0.0025, currency: 'BTC' });
        });

        it('should trim spaces from currency strings', () => {
            expect(postingAmountToAmount(' 8 VND ')).to.eql({ total: 8, currency: 'VND' });
            expect(postingAmountToAmount(' 12.99 $ ')).to.eql({ total: 12.99, currency: '$' });
            expect(postingAmountToAmount(' ¥ 100 ')).to.eql({ total: 100, currency: '¥' });
        });

        it('should fail if it has multiple currency symbols', () => {
            expect(() => postingAmountToAmount('$8VND')).to.throw(Error);
        });
    });

    describe('formatAmount', () => {
        it('should return string representation', () => {
            expect(formatAmount({ total: 12.99, currency: '€' })).to.eql('12.99€');
        });

        it('should format zero', () => {
            expect(formatAmount({ total: 0, currency: '€' })).to.eql('0€');
        });

        it('should allow multiple decimals', () => {
            expect(formatAmount({ total: 0.0025, currency: 'BTC' })).to.eql('0.0025BTC');
        });
    });

    describe('generateAccountAssertion', () => {
        it('should generate an assertion entry (single)', () => {
            const assertion: AssertAccount = {
                date: '1984-12-12',
                assert: [
                    { account: 'n26', amount: 1234.99 },
                ],
            };

            const result = outdent`
                1984-12-12
                    n26  0 =* 1234.99€
            `;

            expect(generateAccountAssertion(assertion)).to.eql(result);
        });

        it('should generate an assertion entry (multiple)', () => {
            const assertion: AssertAccount = {
                date: '1984-12-12',
                assert: [
                    { account: 'n26', amount: 1234.99 },
                    { account: 'triodos', amount: 2345 },
                ],
            };

            const result = outdent`
                1984-12-12
                    n26  0 =* 1234.99€
                    triodos  0 =* 2345€
            `;

            expect(generateAccountAssertion(assertion)).to.eql(result);
        });
    });

    describe('parseHalfPostings', () => {
        it('should parse half postings to regular posting entries', () => {
            const transaction: Transaction = {
                date: '1984-12-12',
                item: 'Half postings shortcut',
                postings: [
                    { account: 'triodos', amount: -100 },
                    { half: 'owe:joxepo:rent' },
                    { account: 'expenses:home:rent' },
                ],
            };

            const result: Transaction = {
                date: '1984-12-12',
                item: 'Half postings shortcut',
                postings: [
                    { account: 'triodos', amount: -100 },
                    { account: 'owe:joxepo:rent', amount: { total: 50, currency: '€' } },
                    { account: 'expenses:home:rent' },
                ],
            };

            expect(parseHalfPostings(transaction)).to.eql(result);
        });

        it('should ignore transactions without PostingHalf', () => {
            const transaction: Transaction = {
                date: '1984-12-12',
                item: 'Half postings shortcut',
                postings: [
                    { account: 'triodos', amount: 100 },
                    { account: 'n26', amount: 100 },
                    { account: 'equity:opening-balance' },
                ],
            };

            expect(parseHalfPostings(transaction)).to.eql(transaction);
        });

        it(`should fail if there isn't any entry with amounts`, () => {
            const transaction: Transaction = {
                date: '1984-12-12',
                item: 'Half postings shortcut',
                postings: [
                    { account: 'triodos' },
                    { half: 'owe:joxepo:rent' },
                    { account: 'expenses:home:rent' },
                ],
            };

            expect(() => parseHalfPostings(transaction)).to.throw(Error);
        });

        it(`should fail if there are more than one entries with amounts`, () => {
            const transaction: Transaction = {
                date: '1984-12-12',
                item: 'Half postings shortcut',
                postings: [
                    { account: 'triodos', amount: -100 },
                    { half: 'owe:joxepo:rent' },
                    { account: 'expenses:home:rent', amount: 20 },
                ],
            };

            expect(() => parseHalfPostings(transaction)).to.throw(Error);
        });
    });

    describe('generateTransaction', () => {
        it('should generate regular transactions', () => {
            const transaction: Transaction = {
                date: '1984-12-12',
                item: 'Lorem ipsum dolor sit amet',
                postings: [
                    { account: 'triodos', amount: 100 },
                    { account: 'income:freelance' },
                ],
            };

            const result = outdent`
                1984-12-12 Lorem ipsum dolor sit amet
                    triodos  100€
                    income:freelance
            `;

            expect(generateTransaction(transaction)).to.eql(result);
        });

        it('should add posting amount for zero (falsy values)', () => {
            const transaction: Transaction = {
                date: '1984-12-12',
                item: 'Lorem ipsum dolor sit amet',
                postings: [
                    { account: 'triodos', amount: 0.00 },
                    { account: 'income:freelance' },
                ],
            };

            const result = outdent`
                1984-12-12 Lorem ipsum dolor sit amet
                    triodos  0€
                    income:freelance
            `;

            expect(generateTransaction(transaction)).to.eql(result);
        });

        it('should show posting dates', () => {
            const transaction: Transaction = {
                date: '1984-12-12',
                item: 'Lorem ipsum dolor sit amet',
                postings: [
                    { account: 'triodos', amount: 100, dateValue: '1984-12-13' },
                    { account: 'income:freelance' },
                ],
            };

            const result = outdent`
                1984-12-12 Lorem ipsum dolor sit amet
                    triodos  100€ ; DATE_VALUE=1984-12-13
                    income:freelance
            `;

            expect(generateTransaction(transaction)).to.eql(result);
        });

        it('should skip transactions with `ignore`', () => {
            const transaction: Transaction = {
                date: '1984-12-12',
                ignore: true,
                item: 'Lorem ipsum dolor sit amet',
                postings: [
                    { account: 'triodos', amount: 100 },
                    { account: 'income:freelance' },
                ],
            };

            expect(generateTransaction(transaction)).to.eql('');
        });

        it('should generate half postings from shortcut posting entries', () => {
            const transaction: Transaction = {
                date: '1984-12-12',
                item: 'Half postings shortcut',
                postings: [
                    { account: 'triodos', amount: -100 },
                    { half: 'owe:joxepo:rent' },
                    { account: 'expenses:home:rent' },
                ],
            };

            const result = outdent`
                1984-12-12 Half postings shortcut
                    triodos  -100€
                    owe:joxepo:rent  50€
                    expenses:home:rent
            `;

            expect(generateTransaction(transaction)).to.eql(result);
        });

        describe('Tags', () => {
            it('should handle one tag', () => {
                const transaction: Transaction = {
                    date: '1984-12-12',
                    item: 'Lorem ipsum dolor sit amet',
                    tags: ['a-tag'],
                    postings: [
                        { account: 'triodos', amount: 100 },
                        { account: 'income:freelance' },
                    ],
                };

                const result = outdent`
                    1984-12-12 Lorem ipsum dolor sit amet ; a-tag:
                        triodos  100€
                        income:freelance
                `;

                expect(generateTransaction(transaction)).to.eql(result);
            });

            it('should handle multiple tags', () => {
                const transaction: Transaction = {
                    date: '1984-12-12',
                    item: 'Lorem ipsum dolor sit amet',
                    tags: ['tag-one', 'tag-two'],
                    postings: [
                        { account: 'triodos', amount: 100 },
                        { account: 'income:freelance' },
                    ],
                };

                const result = outdent`
                    1984-12-12 Lorem ipsum dolor sit amet ; tag-one: tag-two:
                        triodos  100€
                        income:freelance
                `;

                expect(generateTransaction(transaction)).to.eql(result);
            });
        });

        // it('should handle foreign currencies', () => {
        //     const transaction: Transaction = {
        //         date: '1984-12-12',
        //         item: 'Lorem ipsum dolor sit amet',
        //         postings: [
        //             { account: 'n26', amount: 100, foreignAmount: -924000.0, foreignCurrency: 'VND' },
        //             { account: 'expenses:travel:transport' },
        //         ],
        //     };

        //     const result = outdent`
        //         1984-12-12 Lorem ipsum dolor sit amet
        //             n  100€
        //             income:freelance
        //     `;

        //     expect(generateTransaction(transaction)).to.eql(result);
        // });
    });
});
