import { Transaction, isPostingHalf, isPosting } from './types';

export function getYAML(trs: Transaction[]): string {
    return trs.map(tr => {
        const out = [];

        out.push(`- date: ${tr.date}`);
        out.push(`  item: '${tr.item}'`);
        out.push('  postings:');

        for (let posting of tr.postings) {
            if (isPostingHalf(posting)) {
                out.push(`    - { half: '${posting.half}' }`);
            } else if (isPosting(posting)) {
                const p = [];

                if ('account' in posting) {
                    p.push(['account', `'${posting.account}'`]);
                }

                if ('amount' in posting) {
                    p.push(['amount', `${posting.amount}`]);
                }

                if ('dateValue' in posting && posting.dateValue !== tr.date) {
                    p.push(['dateValue', `${posting.dateValue}`]);
                }

                if ('foreignAmount' in posting) {
                    p.push(['foreignAmount', `${posting.foreignAmount}`]);
                }

                if ('foreignCurrency' in posting) {
                    p.push(['foreignCurrency', `${posting.foreignCurrency}`]);
                }

                out.push(`    - { ${p.map(([key, value]) => `${key}: ${value}`).join(', ')} }`);
            }
        }

        return out.join('\n');
    }).join('\n\n') + '\n';
}
