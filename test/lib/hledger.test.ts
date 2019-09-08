import outdent from 'outdent';
import { expect } from 'chai';
import { currencyPostingAmountToAmount, formatAmount, generateAccountAssertion, generateTransaction, AssertAccount, Transaction } from '../../src/lib/hledger';

describe('hledger journal helpers', () => {
    describe('currencyAmountToCurrency', () => {
        it('should convert numbers to Euros', () => {
            expect(currencyPostingAmountToAmount(8)).to.eql({ total: 8, currency: '€' });
            expect(currencyPostingAmountToAmount(12.99)).to.eql({ total: 12.99, currency: '€' });
        });

        it('should convert numeric strings to Euros', () => {
            expect(currencyPostingAmountToAmount('8')).to.eql({ total: 8, currency: '€' });
            expect(currencyPostingAmountToAmount('12.99')).to.eql({ total: 12.99, currency: '€' });
        });

        it('should get currency from the string', () => {
            expect(currencyPostingAmountToAmount('8VND')).to.eql({ total: 8, currency: 'VND' });
            expect(currencyPostingAmountToAmount('12.99$')).to.eql({ total: 12.99, currency: '$' });
            expect(currencyPostingAmountToAmount('¥100')).to.eql({ total: 100, currency: '¥' });
        });

        it('should trim spaces from currency strings', () => {
            expect(currencyPostingAmountToAmount(' 8 VND ')).to.eql({ total: 8, currency: 'VND' });
            expect(currencyPostingAmountToAmount(' 12.99 $ ')).to.eql({ total: 12.99, currency: '$' });
            expect(currencyPostingAmountToAmount(' ¥ 100 ')).to.eql({ total: 100, currency: '¥' });
        });

        it('should fail if it has multiple currency symbols', () => {
            expect(() => currencyPostingAmountToAmount('$8VND')).to.throw(Error);
        });
    });

    describe('formatCurrency', () => {
        it('should return string representation', () => {
            expect(formatAmount({ total: 12.99, currency: '€' })).to.eql('12.99€');
        });

        it('should round to two decimals', () => {
            expect(formatAmount({ total: 12.002, currency: '€' })).to.eql('12.00€');
            expect(formatAmount({ total: 12.005, currency: '€' })).to.eql('12.01€');
            expect(formatAmount({ total: 12.008, currency: '€' })).to.eql('12.01€');
        });
    });

    describe('generateAccountAssertion', () => {
        it('should generate an assertion entry', () => {
            const assertion: AssertAccount = {
                date: '1984-12-12',
                assert: { account: 'n26', amount: 1234.99 },
            };

            const result = outdent`
                1984-12-12
                    n26  0 =* 1234.99€
            `;

            expect(generateAccountAssertion(assertion)).to.eql(result);
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
                    triodos  100.00€
                    income:freelance
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
                        triodos  100.00€
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
                        triodos  100.00€
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

        describe('Half posting shortcut', () => {
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
                        triodos  -100.00€
                        owe:joxepo:rent  50.00€
                        expenses:home:rent
                `;

                expect(generateTransaction(transaction)).to.eql(result);
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

                expect(() => generateTransaction(transaction)).to.throw(Error);
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

                expect(() => generateTransaction(transaction)).to.throw(Error);
            });
        });
    });
});
