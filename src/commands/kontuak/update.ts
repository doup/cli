import * as fs from 'fs';
import * as globCB from 'glob';
import * as path from 'path';
import YAML from 'yaml';
import { Command, flags } from '@oclif/command';
import { promisify } from 'util';

const glob = promisify(globCB);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

export default class KontuakUpdate extends Command {
    static description = 'update hledger journals from YAML files';
    static args = [];
    static flags = {
        help: flags.help({ char: 'h' }),
    };

    accounts: object = {};

    async loadAccount(account: string, accountPath: string) {
        let yamls = await glob(`${accountPath}/*.yml`);

        yamls = await Promise.all(yamls.map(async (yamlPath) => {
            let fileContent = await readFile(yamlPath, 'utf8');

            try {
                return YAML.parse(fileContent).reverse();
            } catch (e) {
                this.log(yamlPath);
                throw e;
            }
        }));

        yamls = yamls.reduce((a, b) => a.concat(b), []);

        if (!(account in this.accounts)) {
            this.accounts[account] = [];
        }

        this.accounts[account] = this.accounts[account].concat(yamls);
    }

    async load(year) {
        let accounts = await glob(`/Users/doup/Dropbox/@doup/kontuak/${year}/*`);

        accounts = await Promise.all(accounts.map(async (accountPath) => {
            let account = path.basename(accountPath);
            return this.loadAccount(account, accountPath);
        }));
    }

    async run() {
        // const {args, flags} = this.parse(KontuakUpdate)
        let from = 2018;
        let to = +(new Date().toISOString()).substr(0, 4);

        for (let i = from; i < (to + 1); i++) {
            await this.load(i);
        }

        for (let account in this.accounts) {
            if (this.accounts.hasOwnProperty(account)) {
                this.accounts[account] = this.accounts[account].map((entry) => {
                    let lines = [`${entry.date} ${entry.item || ''}`];
                    let isAssert = Object.keys(entry).length === 2 && entry.date && entry.assert;

                    if (entry.ignore) {
                        return '';
                    }

                    if (isAssert) {
                        // - date: 2019-04-30
                        //   assert:
                        //     - { account: 'triodos', amount: 4062.75 }

                        entry.assert.forEach((assert) => {
                            lines.push(`    ${assert.account}  0 =* ${assert.amount}€`);
                        });
                    } else {
                        // Regular entry
                        if (entry.tags && entry.tags.length > 0) {
                            let tags = entry.tags.map((tag) => tag + ':');
                            lines[0] = `${lines[0]} ; ${tags.join(' ')}`;
                        }

                        entry.postings.forEach((posting) => {
                            let line = [posting.account];

                            if ('amount' in posting) {
                                const hasCurrencySign = /[$€]/.test(posting.amount);

                                line.push('');
                                line.push(posting.amount + (hasCurrencySign ? '' : '€'));

                                // if ('foreignAmount' in posting) {
                                //   line.push(`${posting.amount}€ @@ ${posting.foreignCurrency} ${posting.foreignAmount}`)
                                // } else {
                                //   line.push(posting.amount + '€')
                                // }
                            }

                            if ('assert' in posting && entry.assert) {
                                line.push('= ' + posting.assert + '€');
                            }

                            if ('dateValue' in posting) {
                                line.push('; DATE_VALUE=' + posting.dateValue);
                            }

                            lines.push('    ' + line.join(' '));
                        });
                    }

                    return lines.join('\n');
                }).join('\n\n') + '\n';

                await writeFile(`/Users/doup/Dropbox/@doup/kontuak/journals/${account}.journal`, this.accounts[account]);
            }
        }
    }
}
