import * as fs from 'fs';
import * as globCB from 'glob';
import * as path from 'path';
import * as YAML from 'yaml';
import { Command, flags } from '@oclif/command';
import { promisify } from 'util';
import { generateJournal, JournalEntry } from '../../lib/hledger';

const glob = promisify(globCB);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

type Account = [string, JournalEntry[]];

interface Accounts {
    [key: string]: JournalEntry[];
}

export default class KontuakUpdate extends Command {
    static description = 'update hledger journals from YAML files';
    static args = [];
    static flags = {
        help: flags.help({ char: 'h' }),
    };

    async getAccounts(): Promise<Account[]> {
        const from = 2018;
        const to = +(new Date().toISOString()).substr(0, 4);
        const accounts: Accounts = {};

        for (let year = from; year <= to; year++) {
            const yearAccounts = await glob(`/Users/doup/Dropbox/@doup/kontuak/${year}/*`);

            for (let accountPath of yearAccounts) {
                const account = path.basename(accountPath);
                const entries = await this.loadYAMLs(accountPath);

                if (!(account in accounts)) {
                    accounts[account] = [];
                }

                accounts[account] = accounts[account].concat(entries);
            }
        }

        return Object.entries(accounts);
    }

    async loadYAMLs(accountPath: string): Promise<JournalEntry[]> {
        const yamls = await glob(`${accountPath}/*.yml`);
        let entries: JournalEntry[] = [];

        for (let yamlPath of yamls) {
            let fileContent = await readFile(yamlPath, 'utf8');

            try {
                entries = entries.concat(YAML.parse(fileContent).reverse());
            } catch (e) {
                this.log(e, yamlPath);
                throw e;
            }
        }

        return entries;
    }

    async run() {
        for (const [account, entries] of await this.getAccounts()) {
            await writeFile(
                `/Users/doup/Dropbox/@doup/kontuak/journals/${account}.journal`,
                generateJournal(entries),
            );
        }
    }
}
