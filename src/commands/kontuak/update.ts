import * as fs from 'fs';
import * as globCB from 'glob';
import * as path from 'path';
import * as YAML from 'yaml';
import { Command, flags } from '@oclif/command';
import { promisify } from 'util';
import { generateJournal } from '../../lib/hledger';

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
                this.log(e, yamlPath);
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
                await writeFile(
                    `/Users/doup/Dropbox/@doup/kontuak/journals/${account}.journal`,
                    generateJournal(this.accounts[account]),
                );
            }
        }
    }
}
